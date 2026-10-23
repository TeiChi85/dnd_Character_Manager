"""Synthetic API tests: no rule datasets, portraits, or real characters."""

from copy import deepcopy
import json
import multiprocessing
from pathlib import Path
import re
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.request import urlopen
from uuid import UUID, uuid4

from werkzeug.serving import make_server

from server.app import ROOT, create_app
from server.storage import StorageBusy


def synthetic_character():
    # Same shape as freshCharacter + serializeChar; deliberately no rule content.
    return {
        "_app": "dnd-cc", "_v": 1, "edition": None, "name": "Synthetic Test",
        "className": None, "source": None, "slug": None, "hdFaces": None,
        "level": 1, "manualHp": None, "subclassName": None, "choices": {},
        "background": None, "bgIsCustom": False, "bgCustomName": "",
        "bgCustomDesc": "", "bgChoices": {},
        "details": {"alignment": "", "faith": "", "lifestyle": ""},
        "race": None, "raceLineage": None, "raceChoices": {},
        "abilities": {"method": "pointbuy", "base": dict.fromkeys(
            ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"], 8),
            "assign": {}, "other": {}, "override": {}, "rolled": None},
        "equipment": {"mode": "equipment", "starting": {}, "startingAdded": False,
                      "inventory": [], "currency": dict.fromkeys(["pp", "gp", "ep", "sp", "cp"], 0),
                      "filterType": "", "filterQ": ""},
        "spells": {"cantrips": [], "spells": [], "levelFilter": "", "q": ""},
        "customLanguages": [], "customProficiencies": {"armor": [], "weapons": [], "tools": []},
        "customDefences": [], "portrait": None,
        "sheet": {"hpCurrent": None, "hpTemp": "", "res": {}, "hpEdited": False,
                  "invQ": "", "invAdd": "", "xp": "", "inspiration": False,
                  "deathSucc": 0, "deathFail": 0, "dark": False, "acOther": "",
                  "acOverride": "", "acEditOpen": False, "active": {}, "conc": ""},
    }


def concurrent_update(directory, identifier, barrier, results):
    app = create_app({"TESTING": True, "CHARACTER_STORAGE_DIR": directory})
    with app.test_client() as client:
        barrier.wait(timeout=15)
        response = client.put("/api/characters/" + identifier,
                              json=synthetic_character(), headers={"If-Match": '"1"'})
        results.put(response.status_code)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="cc-api-test-")
        self.addCleanup(self.temporary.cleanup)
        self.config = {"TESTING": True, "CHARACTER_STORAGE_DIR": self.temporary.name}
        self.app = create_app(self.config)
        self.client = self.app.test_client()
        self.character = synthetic_character()

    def create(self):
        response = self.client.post("/api/characters", json=self.character)
        self.assertEqual(response.status_code, 201)
        return response

    def test_fixture_covers_exact_export_keys(self):
        source = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
        keys = json.loads(re.search(r"var SAVE_KEYS=(\[.*?\]);", source).group(1))
        self.assertEqual(set(self.character), set(keys) | {"_app", "_v"})

    def test_create_list_load_update_and_persistence(self):
        self.assertEqual(self.client.get("/api/characters").json, {"characters": []})
        created = self.create()
        record = created.json
        self.assertEqual(UUID(record["id"]).version, 4)
        self.assertEqual(record["revision"], 1)
        self.assertTrue(record["updated_at"].endswith("+00:00"))
        self.assertEqual(record["character"], self.character)
        self.assertEqual(created.headers["ETag"], '"1"')
        location = created.headers["Location"]
        self.assertEqual(self.client.get(location).json, record)
        listing = self.client.get("/api/characters").json["characters"]
        self.assertEqual(len(listing), 1)
        self.assertEqual(listing[0]["name"], self.character["name"])
        self.assertNotIn("character", listing[0])
        self.character["name"] = "Updated Synthetic"
        updated = self.client.put(location, json=self.character, headers={"If-Match": '"1"'})
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json["revision"], 2)
        self.assertEqual(updated.headers["ETag"], '"2"')
        self.assertGreaterEqual(updated.json["updated_at"], record["updated_at"])
        restarted = create_app(self.config).test_client()
        self.assertEqual(restarted.get(location).json["character"], self.character)
        files = list(Path(self.temporary.name).glob("*.json"))
        self.assertEqual(len(files), 1)
        self.assertEqual(json.loads(files[0].read_text()), updated.json)

    def test_optional_older_and_unknown_fields_are_preserved(self):
        value = {"_app": "dnd-cc", "_v": 1, "future": {"id": "custom", "revision": 99}}
        response = self.client.post("/api/characters", json=value)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.client.get(response.headers["Location"]).json["character"], value)

    def test_same_name_and_unicode_remain_independent(self):
        self.character["name"] = "Synthetic \u00e4 \U0001f9d9"
        first, second = self.create(), self.create()
        self.assertNotEqual(first.json["id"], second.json["id"])
        self.assertEqual(self.client.get(first.headers["Location"]).json["character"], self.character)
        self.assertEqual(len(self.client.get("/api/characters").json["characters"]), 2)

    def test_revision_precondition_and_conflict_do_not_overwrite(self):
        location = self.create().headers["Location"]
        self.assertEqual(self.client.put(location, json=self.character).status_code, 428)
        for tag in ["1", "*", 'W/"1"', '"1", "2"', '"0"']:
            self.assertEqual(self.client.put(location, json=self.character,
                                            headers={"If-Match": tag}).status_code, 400)
        self.client.put(location, json=self.character, headers={"If-Match": '"1"'})
        self.character["name"] = "Must not be saved"
        conflict = self.client.put(location, json=self.character, headers={"If-Match": '"1"'})
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.json["current_revision"], 2)
        self.assertEqual(self.client.get(location).json["character"]["name"], "Synthetic Test")

    def test_malformed_json_and_non_finite_numbers(self):
        for value in ['{', '', '{"_app":"dnd-cc","_v":1,"x":NaN}',
                      '{"_app":"dnd-cc","_v":1,"x":Infinity}',
                      '{"_app":"dnd-cc","_v":1,"x":1e999}',
                      '{"_app":"dnd-cc","_v":1,"_v":1}', b'\xff']:
            with self.subTest(value=value):
                response = self.client.post("/api/characters", data=value,
                                            content_type="application/json")
                self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.get("/api/characters").json["characters"], [])

    def test_invalid_structure(self):
        for value in [None, [], "character", {}, {"_app": "wrong", "_v": 1},
                      {"_app": "dnd-cc", "_v": True}, {"_app": "dnd-cc", "_v": 2}]:
            self.assertEqual(self.client.post("/api/characters", data=json.dumps(value),
                                             content_type="application/json").status_code, 400)
        for key, wrong in [("level", True), ("level", 21), ("name", []), ("sheet", None),
                           ("equipment", []), ("spells", "bad"), ("background", "bad"),
                           ("bgIsCustom", 1), ("customLanguages", {}), ("manualHp", False)]:
            value = deepcopy(self.character)
            value[key] = wrong
            self.assertEqual(self.client.post("/api/characters", json=value).status_code, 400)

    def test_content_type_and_depth_limit(self):
        self.assertEqual(self.client.post("/api/characters", data="{}").status_code, 415)
        raw = '{"_app":"dnd-cc","_v":1,"extra":' + '[' * 70 + '0' + ']' * 70 + '}'
        self.assertEqual(self.client.post("/api/characters", data=raw,
                                         content_type="application/json").status_code, 400)

    def test_invalid_update_does_not_change_record(self):
        location = self.create().headers["Location"]
        before = self.client.get(location).json
        for raw in ['{', '{"_app":"wrong","_v":1}']:
            response = self.client.put(location, data=raw, content_type="application/json",
                                       headers={"If-Match": '"1"'})
            self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.get(location).json, before)

    def test_lock_timeout_is_retryable(self):
        store = self.app.extensions["character_store"]
        with patch.object(store, "locked", side_effect=StorageBusy):
            response = self.client.post("/api/characters", json=self.character)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(self.client.get("/api/characters").json["characters"], [])

    def test_size_limit_and_failed_update_keep_original(self):
        location = self.create().headers["Location"]
        limited = create_app({**self.config, "MAX_CONTENT_LENGTH": 128}).test_client()
        response = limited.post("/api/characters", data=b" " * 129,
                                content_type="application/json")
        self.assertEqual(response.status_code, 413)
        response = limited.put(location, json=self.character, headers={"If-Match": '"1"'})
        self.assertEqual(response.status_code, 413)
        # ASCII serialization may expand Unicode far beyond its UTF-8 input size.
        expanded = '{"_app":"dnd-cc","_v":1,"name":"' + '\u00e4' * 20 + '"}'
        self.assertLess(len(expanded.encode()), 128)
        self.assertEqual(limited.post("/api/characters", data=expanded.encode(),
                                     content_type="application/json").status_code, 413)
        self.assertEqual(self.client.get(location).json["revision"], 1)

    def test_missing_and_invalid_ids(self):
        for identifier in [str(uuid4()), "not-a-uuid", "..", str(uuid4()).upper()]:
            path = "/api/characters/" + identifier
            self.assertEqual(self.client.get(path).status_code, 404)
            self.assertEqual(self.client.put(path, json=self.character,
                                            headers={"If-Match": '"1"'}).status_code, 404)

    def test_static_files_and_private_paths(self):
        for path in ["/", "/index.html", "/classes.html", "/css/styles.css", "/js/app.js",
                     "/resources/logo.png"]:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, path)
            response.close()
        for path in ["/.git/config", "/server/app.py", "/server/requirements.txt",
                     "/DEVELOPMENT.md", "/.env", "/characters/test.json", "/resources/test.json",
                     "/css/../server/app.py", "/resources/../../.git/config", "/api/unknown"]:
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_storage_inside_repository_is_rejected(self):
        for directory in [ROOT, ROOT / "resources" / "characters"]:
            with self.assertRaises(ValueError):
                create_app({"CHARACTER_STORAGE_DIR": directory})

    def test_untrusted_host_is_rejected(self):
        self.assertEqual(self.client.get("/api/characters", base_url="http://evil.example").status_code, 400)

    def test_atomic_replace_failure_preserves_file(self):
        location = self.create().headers["Location"]
        before = self.client.get(location).json
        with patch("server.storage.os.replace", side_effect=OSError("synthetic failure")):
            with self.assertLogs(self.app.logger, level="ERROR"):
                response = self.client.put(location, json=self.character, headers={"If-Match": '"1"'})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(self.client.get(location).json, before)
        self.assertEqual(list(Path(self.temporary.name).glob("*.tmp")), [])

    def test_concurrent_process_updates_have_one_winner(self):
        identifier = self.create().json["id"]
        context = multiprocessing.get_context("spawn")
        barrier, results = context.Barrier(2), context.Queue()
        processes = [context.Process(target=concurrent_update,
                                    args=(self.temporary.name, identifier, barrier, results))
                     for _ in range(2)]
        try:
            for process in processes:
                process.start()
            statuses = [results.get(timeout=30) for _ in processes]
            self.assertEqual(sorted(statuses), [200, 409])
            for process in processes:
                process.join(timeout=15)
                self.assertEqual(process.exitcode, 0)
        finally:
            for process in processes:
                if process.is_alive():
                    process.terminate()
                    process.join()
            results.close()
        self.assertEqual(self.client.get("/api/characters/" + identifier).json["revision"], 2)

    def test_real_http_loopback_smoke(self):
        server = make_server("127.0.0.1", 0, self.app)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with urlopen(f"http://127.0.0.1:{server.server_port}/api/characters", timeout=5) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(json.load(response), {"characters": []})
        finally:
            server.shutdown()
            thread.join(timeout=5)
            server.server_close()


if __name__ == "__main__":
    unittest.main()
