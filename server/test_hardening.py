"""Failure injection and recovery using disposable, synthetic characters only."""

from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import errno
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from uuid import uuid4

from server.app import create_app
from server.test_api import synthetic_character


class HardeningTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="cc-hardening-test-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.config = {"TESTING": True, "CHARACTER_STORAGE_DIR": self.directory}
        self.app = create_app(self.config)
        self.client = self.app.test_client()
        self.store = self.app.extensions["character_store"]
        self.character = synthetic_character()
        response = self.client.post("/api/characters", json=self.character)
        self.assertEqual(response.status_code, 201)
        self.record = response.json
        self.url = response.headers["Location"]

    def update(self, revision=1):
        return self.client.put(self.url, json=self.character, headers={"If-Match": '"' + str(revision) + '"'})

    def delete(self, revision=1):
        return self.client.delete(self.url, headers={"If-Match": '"' + str(revision) + '"'})

    def archives(self, kind):
        return list((self.directory / kind).glob("*.json"))

    def test_delete_is_recoverable_and_disappears_from_list(self):
        response = self.delete()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"id": self.record["id"], "revision": 1, "deleted": True})
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.get("/api/characters").json, {"characters": []})
        archived = self.archives("trash")
        self.assertEqual(len(archived), 1)
        self.assertEqual(json.loads(archived[0].read_text()), self.record)
        restored = self.store.restore("trash", archived[0].name)
        self.assertEqual(restored["id"], self.record["id"])
        self.assertEqual(restored["revision"], 2)
        self.assertEqual(self.client.get(self.url).json["character"], self.character)
        self.assertTrue(archived[0].exists())
        self.assertEqual(self.delete(1).status_code, 409)
        with self.assertRaises(ValueError):
            self.store.restore("trash", archived[0].name)

    def test_update_keeps_previous_complete_revision(self):
        self.character["name"] = "New version"
        self.assertEqual(self.update().status_code, 200)
        archives = self.archives("backups")
        self.assertEqual(len(archives), 1)
        self.assertEqual(json.loads(archives[0].read_text()), self.record)
        self.assertEqual(self.delete(2).status_code, 200)
        self.assertEqual(json.loads(self.archives("trash")[0].read_text())["revision"], 2)
        self.assertEqual(len(self.archives("backups")), 1)

    def test_backup_retention_is_per_character(self):
        app = create_app({**self.config, "CHARACTER_BACKUP_COUNT": 2})
        self.client = app.test_client()
        for revision in range(1, 5):
            self.assertEqual(self.update(revision).status_code, 200)
        self.assertEqual(sorted(json.loads(path.read_text())["revision"] for path in self.archives("backups")), [3, 4])

    def test_conflicting_update_or_delete_creates_no_archive(self):
        self.assertEqual(self.delete(2).status_code, 409)
        self.assertEqual(self.update(2).status_code, 409)
        self.assertEqual(self.archives("backups"), [])
        self.assertEqual(self.archives("trash"), [])
        self.assertEqual(self.client.get(self.url).json, self.record)

    def test_delete_requires_revision_and_existing_canonical_uuid(self):
        self.assertEqual(self.client.delete(self.url).status_code, 428)
        self.assertEqual(self.client.delete(self.url, headers={"If-Match": "*"}).status_code, 400)
        for identifier in ("not-a-uuid", str(uuid4()), "..%2f..%2fprivate", "%5c..%5cprivate", str(uuid4()).upper()):
            response = self.client.delete("/api/characters/" + identifier, headers={"If-Match": '"1"'})
            self.assertEqual(response.status_code, 404)
        self.assertEqual(self.client.get(self.url).json, self.record)

    def test_backup_failure_never_changes_active_file(self):
        for code in (errno.ENOSPC, errno.EACCES):
            with patch.object(self.store, "atomic_write", side_effect=OSError(code, "synthetic backup failure")):
                with self.assertLogs(self.app.logger, level="ERROR"):
                    response = self.update()
            self.assertEqual(response.status_code, 500)
            self.assertNotIn(str(self.directory), response.get_data(as_text=True))
            self.assertEqual(self.client.get(self.url).json, self.record)

    def test_active_replace_failure_keeps_original_and_backup(self):
        replace = os.replace
        failed_targets = []
        def fail_active(source, target):
            if Path(target).parent == self.store.directory:
                failed_targets.append(target)
                raise OSError(errno.ENOSPC, "synthetic disk full")
            return replace(source, target)
        with patch("server.storage.os.replace", side_effect=fail_active), self.assertLogs(self.app.logger, level="ERROR"):
            self.assertEqual(self.update().status_code, 500)
        self.assertEqual(len(failed_targets), 1)
        self.assertEqual(self.client.get(self.url).json, self.record)
        self.assertEqual(json.loads(self.archives("backups")[0].read_text()), self.record)
        self.assertEqual(list(self.directory.rglob("*.tmp")), [])

    def test_trash_move_failure_keeps_original(self):
        with patch("server.storage.os.replace", side_effect=PermissionError("synthetic permission failure")), self.assertLogs(self.app.logger, level="ERROR"):
            self.assertEqual(self.delete().status_code, 500)
        self.assertEqual(self.client.get(self.url).json, self.record)
        self.assertEqual(self.archives("trash"), [])

    def test_corrupt_or_unmanaged_file_is_never_deleted_or_replaced(self):
        path = self.directory / (self.record["id"] + ".json")
        for content in ("{", '{"id":"wrong"}', json.dumps({**self.record, "character": {"_app": "wrong"}})):
            path.write_text(content)
            for operation in (self.delete, self.update):
                with self.assertLogs(self.app.logger, level="ERROR"):
                    response = operation()
                self.assertEqual(response.status_code, 500)
                self.assertEqual(path.read_text(), content)
        self.assertEqual(self.archives("trash"), [])

    def test_links_to_other_files_are_not_followed(self):
        path = self.directory / (self.record["id"] + ".json")
        other = self.directory / "private.txt"
        other.write_text("private")
        path.unlink()
        os.link(other, path)
        with self.assertLogs(self.app.logger, level="ERROR"):
            self.assertEqual(self.delete().status_code, 500)
        self.assertEqual(other.read_text(), "private")

    def test_private_archives_are_not_served(self):
        self.update()
        self.delete(2)
        for path in self.archives("backups") + self.archives("trash"):
            self.assertEqual(self.client.get("/" + path.parent.name + "/" + path.name).status_code, 404)

    def test_manual_recovery_rejects_paths_and_broken_archives(self):
        for filename in ("../private.json", "C:\\private.json", "not-an-archive.json"):
            with self.assertRaises(ValueError):
                self.store.restore("trash", filename)
        self.delete()
        archive = self.archives("trash")[0]
        archive.write_text("{")
        with self.assertRaises(ValueError):
            self.store.restore("trash", archive.name)
        self.assertEqual(archive.read_text(), "{")
        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_repeated_failed_updates_reuse_the_same_complete_backup(self):
        replace = os.replace
        failed_targets = []
        def fail_active(source, target):
            if Path(target).parent == self.store.directory:
                failed_targets.append(target)
                raise PermissionError("synthetic active write failure")
            return replace(source, target)
        for _ in range(2):
            with patch("server.storage.os.replace", side_effect=fail_active), self.assertLogs(self.app.logger, level="ERROR"):
                self.assertEqual(self.update().status_code, 500)
        self.assertEqual(len(failed_targets), 2)
        self.assertEqual(self.client.get(self.url).json, self.record)
        self.assertEqual(len(self.archives("backups")), 1)
        self.assertEqual(json.loads(self.archives("backups")[0].read_text()), self.record)
        self.assertEqual(self.update().status_code, 200)

    def test_retention_failure_does_not_report_a_committed_save_as_failed(self):
        self.store.backup_count = 1
        self.update()
        with patch("server.storage.Path.unlink", side_effect=PermissionError("synthetic retention failure")), self.assertLogs("server.storage", level="WARNING"):
            self.assertEqual(self.update(2).status_code, 200)
        self.assertEqual(self.client.get(self.url).json["revision"], 3)

    def test_validation_limits_and_nested_types(self):
        mutations = [
            ("name", "x" * 201), ("edition", "wrong"), ("className", []),
            ("details", {"faith": []}), ("abilities", {"base": []}),
            ("abilities", {"base": {"Strength": '<img onerror="x">'}}),
            ("equipment", {"inventory": ["wrong"]}), ("equipment", {"currency": {"gp": "bad"}}),
            ("equipment", {"inventory": [{"name": "Synthetic", "qty": '\" onfocus=bad'}]}),
            ("sheet", {"dark": "wrong"}), ("sheet", {"res": []}),
            ("customLanguages", ["x"] * 2001), ("bgCustomDesc", "x" * 65537),
            ("portrait", "https://remote.example/image.png"), ("slug", "../../private"),
            ("extra", {"__proto__": {"polluted": True}}), ("extra", 10 ** 400),
        ]
        for field, value in mutations:
            candidate = deepcopy(self.character)
            candidate[field] = value
            with self.subTest(field=field, value_type=type(value)):
                response = self.client.post("/api/characters", json=candidate)
                self.assertEqual(response.status_code, 400)
                self.assertIsInstance(response.json["message"], str)
        response = self.client.post("/api/characters", data='{"_app":"dnd-cc","_v":1,"name":"\\ud800"}', content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_older_sparse_exports_and_numeric_input_strings_remain_valid(self):
        for value in ({"_app": "dnd-cc", "_v": 1},
                      {"_app": "dnd-cc", "_v": 1, "abilities": {"assign": {"Strength": "0"}, "other": {"Strength": ""}}, "sheet": {"xp": "100"}}):
            response = self.client.post("/api/characters", json=value)
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.json["character"], value)

    def test_inventory_shape_written_by_add_item_obj_remains_valid(self):
        self.character["equipment"]["inventory"] = [{
            "name": "Synthetic Gear", "source": "", "cat": "Other Gear", "attune": None,
            "bonusWeapon": None, "requires": None, "base": None,
            "qty": 1, "equipped": False, "generic": True,
        }]
        response = self.update()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["character"], self.character)

    def test_cross_origin_mutations_are_rejected(self):
        for method in ("POST", "PUT", "DELETE"):
            response = self.client.open(self.url if method != "POST" else "/api/characters", method=method,
                                        json=self.character, headers={"If-Match": '"1"', "Origin": "https://untrusted.example"})
            self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.get(self.url).json, self.record)

    def test_concurrent_save_delete_cannot_remove_a_newer_revision(self):
        barrier = threading.Barrier(2)
        def action(method):
            with self.app.test_client() as client:
                barrier.wait(timeout=10)
                return client.open(self.url, method=method, json=self.character if method == "PUT" else None,
                                   headers={"If-Match": '"1"'}).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = sorted(pool.map(action, ("PUT", "DELETE")))
        self.assertIn(statuses, ([200, 404], [200, 409]))

    def test_trash_has_no_expiry_by_default_but_explicit_expiry_is_supported(self):
        self.delete()
        archive = self.archives("trash")[0]
        old = archive.with_name(archive.name.replace(archive.name.split(".")[2], "20000101T000000000000Z"))
        archive.rename(old)
        self.store.prune(self.record["id"])
        self.assertTrue(old.exists())
        self.store.trash_days = 30
        self.store.prune(self.record["id"])
        self.assertFalse(old.exists())

    def test_archive_revision_mismatch_is_neither_restored_nor_cleaned_up(self):
        self.delete()
        archive = self.archives("trash")[0]
        changed = archive.with_name(archive.name.replace(".r1.", ".r9."))
        archive.rename(changed)
        with self.assertRaises(ValueError):
            self.store.restore("trash", changed.name)
        self.store.trash_days = 1
        with self.assertLogs("server.storage", level="WARNING"):
            self.store.prune(self.record["id"])
        self.assertTrue(changed.exists())


if __name__ == "__main__":
    unittest.main()
