"""Local Flask API. Run from the repository root: python -m server.app."""

import json
import os
from pathlib import Path
import re

from flask import Flask, abort, jsonify, request, send_from_directory, url_for
from werkzeug.exceptions import HTTPException

from .storage import CharacterNotFound, Conflict, StorageBusy, Store
from .validation import strict_json, validate_character


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MAX_BYTES = 2 * 1024 * 1024
PAGES = {"index.html", "classes.html", "creatures.html", "feats.html",
         "items.html", "races.html", "spells.html"}


def create_app(config=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_mapping(
        MAX_CONTENT_LENGTH=DEFAULT_MAX_BYTES,
        CHARACTER_STORAGE_DIR=os.environ.get(
            "CC_CHARACTER_STORAGE", str(Path.home() / ".character-manager" / "characters")),
        TRUSTED_HOSTS=["127.0.0.1", "localhost", "[::1]"],
        CHARACTER_BACKUP_COUNT=os.environ.get("CC_CHARACTER_BACKUP_COUNT", "10"),
        CHARACTER_TRASH_DAYS=os.environ.get("CC_CHARACTER_TRASH_DAYS"),
    )
    if config:
        app.config.update(config)
    directory = Path(app.config["CHARACTER_STORAGE_DIR"]).expanduser().resolve()
    if directory == ROOT or ROOT in directory.parents:
        raise ValueError("Character storage must be outside the repository")
    backup_count = int(app.config["CHARACTER_BACKUP_COUNT"])
    trash_days = app.config["CHARACTER_TRASH_DAYS"]
    trash_days = int(trash_days) if trash_days is not None else None
    if not 1 <= backup_count <= 1000 or trash_days is not None and trash_days < 1:
        raise ValueError("Backup count must be 1..1000; trash days must be positive or unset")
    store = Store(directory, app.config["MAX_CONTENT_LENGTH"], backup_count, trash_days)
    app.extensions["character_store"] = store

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(error=error.name, message=error.description), error.code

    @app.errorhandler(StorageBusy)
    def busy_error(error):
        return jsonify(error="Storage busy; retry later"), 503

    @app.errorhandler(OSError)
    @app.errorhandler(ValueError)
    @app.errorhandler(CharacterNotFound)
    @app.errorhandler(RecursionError)
    def storage_error(error):
        app.logger.error("Character storage operation failed", exc_info=True)
        return jsonify(error="Character storage unavailable"), 500

    @app.after_request
    def response_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.before_request
    def same_origin_writes():
        if request.path.startswith("/api/") and request.method in {"POST", "PUT", "DELETE"}:
            origin = request.headers.get("Origin")
            if request.headers.get("Sec-Fetch-Site") == "cross-site" or origin and origin != request.host_url.rstrip("/"):
                abort(403, description="Cross-origin character changes are not allowed")

    def character_body():
        if not request.is_json:
            abort(415, description="Use Content-Type: application/json")
        try:
            value = strict_json(request.get_data().decode("utf-8"))
            validate_character(value)
            # Keep the canonical file bounded even for UTF-8/escape expansion.
            if len(json.dumps(value, ensure_ascii=True).encode("utf-8")) > store.max_bytes:
                abort(413)
            return value
        except json.JSONDecodeError:
            abort(400, description="Invalid JSON")
        except (UnicodeError, RecursionError):
            abort(400, description="Invalid JSON encoding or nesting")
        except ValueError as error:
            abort(400, description=str(error))

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
        except CharacterNotFound:
            abort(404)
        return record_response(record)

    @app.post("/api/characters")
    def create_character():
        return record_response(store.write(None, character_body()), 201)

    def expected_revision():
        expected = request.headers.get("If-Match")
        if expected is None:
            abort(428, description='If-Match with the revision ETag is required')
        if not re.fullmatch(r'"[1-9][0-9]{0,15}"', expected):
            abort(400, description='If-Match must contain one quoted revision, e.g. "1"')
        return int(expected[1:-1])

    @app.put("/api/characters/<identifier>")
    def update_character(identifier):
        expected = expected_revision()
        character = character_body()
        try:
            record = store.write(identifier, character, expected)
        except CharacterNotFound:
            abort(404)
        except Conflict as error:
            return jsonify(error="Revision conflict", current_revision=error.revision), 409
        return record_response(record)

    @app.delete("/api/characters/<identifier>")
    def delete_character(identifier):
        expected = expected_revision()
        try:
            record = store.delete(identifier, expected)
        except CharacterNotFound:
            abort(404)
        except Conflict as error:
            return jsonify(error="Revision conflict", current_revision=error.revision), 409
        return jsonify(id=record["id"], revision=record["revision"], deleted=True)

    @app.route("/api/characters/<path:invalid>", methods=["PUT", "DELETE"])
    def invalid_character_path(invalid):
        abort(404)

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
