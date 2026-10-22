"""Local Flask API. Run from the repository root: python -m server.app."""

import json
import math
import os
from pathlib import Path
import re

from flask import Flask, abort, jsonify, request, send_from_directory, url_for
from werkzeug.exceptions import HTTPException

from .storage import Conflict, StorageBusy, Store


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MAX_BYTES = 2 * 1024 * 1024
PAGES = {"index.html", "classes.html", "creatures.html", "feats.html",
         "items.html", "races.html", "spells.html"}
# Types describe the export structure, not D&D rules. Optional keys stay optional.
STRINGS = {"name", "bgCustomName", "bgCustomDesc"}
NULLABLE_STRINGS = {"edition", "className", "source", "slug", "subclassName",
                    "raceLineage", "portrait"}
OBJECTS = {"choices", "bgChoices", "details", "raceChoices", "abilities",
           "equipment", "spells", "customProficiencies", "sheet"}
ARRAYS = {"customLanguages", "customDefences"}


def validate_character(value):
    if not isinstance(value, dict) or value.get("_app") != "dnd-cc":
        raise ValueError("Expected a dnd-cc character object")
    if type(value.get("_v")) is not int or value["_v"] != 1:
        raise ValueError("Expected character format version 1")
    for key, item in value.items():
        if key in STRINGS and not isinstance(item, str):
            raise ValueError(key + " must be a string")
        if key in NULLABLE_STRINGS and item is not None and not isinstance(item, str):
            raise ValueError(key + " must be a string or null")
        if key in OBJECTS and not isinstance(item, dict):
            raise ValueError(key + " must be an object")
        if key in ARRAYS and not isinstance(item, list):
            raise ValueError(key + " must be an array")
        if key in {"background", "race"} and item is not None and not isinstance(item, dict):
            raise ValueError(key + " must be an object or null")
        if key == "bgIsCustom" and type(item) is not bool:
            raise ValueError("bgIsCustom must be a boolean")
        if key == "level" and (type(item) is not int or not 1 <= item <= 20):
            raise ValueError("level must be an integer from 1 to 20")
        if key in {"hdFaces", "manualHp"} and item is not None and type(item) not in {int, float}:
            raise ValueError(key + " must be a number or null")
    # Bound nesting, reject non-finite numbers (including overflowing exponents).
    def check(item, depth=0):
        if depth > 64:
            raise ValueError("JSON nesting exceeds 64 levels")
        if isinstance(item, float) and not math.isfinite(item):
            raise ValueError("JSON numbers must be finite")
        if isinstance(item, dict):
            for child in item.values():
                check(child, depth + 1)
        elif isinstance(item, list):
            for child in item:
                check(child, depth + 1)
    check(value)
    return value


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key: " + key)
        result[key] = value
    return result


def create_app(config=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_mapping(
        MAX_CONTENT_LENGTH=DEFAULT_MAX_BYTES,
        CHARACTER_STORAGE_DIR=os.environ.get(
            "CC_CHARACTER_STORAGE", str(Path.home() / ".character-manager" / "characters")),
        TRUSTED_HOSTS=["127.0.0.1", "localhost", "[::1]"],
    )
    if config:
        app.config.update(config)
    directory = Path(app.config["CHARACTER_STORAGE_DIR"]).expanduser().resolve()
    if directory == ROOT or ROOT in directory.parents:
        raise ValueError("Character storage must be outside the repository")
    store = Store(directory, app.config["MAX_CONTENT_LENGTH"])
    app.extensions["character_store"] = store

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(error=error.name, message=error.description), error.code

    @app.errorhandler(StorageBusy)
    def busy_error(error):
        return jsonify(error="Storage busy; retry later"), 503

    @app.errorhandler(OSError)
    @app.errorhandler(ValueError)
    def storage_error(error):
        app.logger.error("Character storage operation failed", exc_info=True)
        return jsonify(error="Character storage unavailable"), 500

    @app.after_request
    def response_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    def character_body():
        if not request.is_json:
            abort(415, description="Use Content-Type: application/json")
        try:
            value = json.loads(request.get_data().decode("utf-8"),
                               object_pairs_hook=unique_object)
            validate_character(value)
            # Keep the canonical file bounded even for UTF-8/escape expansion.
            if len(json.dumps(value, ensure_ascii=True).encode("utf-8")) > store.max_bytes:
                abort(413)
            return value
        except (ValueError, UnicodeError, RecursionError):
            abort(400, description="Invalid JSON or character structure")

    def record_response(record, status=200):
        response = jsonify(record)
        response.status_code = status
        response.set_etag(str(record["revision"]))
        response.headers["Location"] = url_for("get_character", identifier=record["id"])
        return response

    @app.get("/api/characters")
    def list_characters():
        with store.locked():
            records = [store.read(path.stem) for path in sorted(store.directory.glob("*.json"))]
        return jsonify(characters=[{
            "id": record["id"], "updated_at": record["updated_at"],
            "revision": record["revision"],
            **{key: record["character"].get(key) for key in ("name", "edition", "className", "level")},
        } for record in records])

    @app.get("/api/characters/<identifier>")
    def get_character(identifier):
        try:
            with store.locked():
                record = store.read(identifier)
        except FileNotFoundError:
            abort(404)
        return record_response(record)

    @app.post("/api/characters")
    def create_character():
        return record_response(store.write(None, character_body()), 201)

    @app.put("/api/characters/<identifier>")
    def update_character(identifier):
        expected = request.headers.get("If-Match")
        if expected is None:
            abort(428, description='If-Match with the revision ETag is required')
        if not re.fullmatch(r'"[1-9][0-9]{0,15}"', expected):
            abort(400, description='If-Match must contain one quoted revision, e.g. "1"')
        character = character_body()
        try:
            record = store.write(identifier, character, int(expected[1:-1]))
        except FileNotFoundError:
            abort(404)
        except Conflict as error:
            return jsonify(error="Revision conflict", current_revision=error.revision), 409
        return record_response(record)

    @app.get("/")
    @app.get("/<path:filename>")
    def static_file(filename="index.html"):
        # Explicit public surface: never expose .git, server, exports, or tools.
        path = Path(filename)
        if filename not in PAGES:
            allowed = {"css": {".css"}, "js": {".js"},
                       "resources": {".js", ".png", ".ico", ".jpg", ".jpeg", ".webp"}}
            if (not path.parts or path.parts[0] not in allowed
                    or path.suffix.lower() not in allowed[path.parts[0]]
                    or any(part.startswith(".") for part in path.parts)):
                abort(404)
        resolved = (ROOT / path).resolve()
        public_root = ROOT if filename in PAGES else ROOT / path.parts[0]
        if public_root not in resolved.parents or resolved.is_dir():
            abort(404)
        return send_from_directory(ROOT, filename)

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=8000, debug=False, use_reloader=False)
