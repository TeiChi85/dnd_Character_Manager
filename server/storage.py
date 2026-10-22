"""File storage with a cross-process lock and atomic replacement."""

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import logging
import os
import re
from pathlib import Path
import tempfile
import time
from uuid import UUID, uuid4

from .validation import strict_json, validate_character


class StorageBusy(Exception):
    pass


class CharacterNotFound(Exception):
    pass


class Conflict(Exception):
    def __init__(self, revision):
        self.revision = revision


class Store:
    def __init__(self, directory, max_bytes, backup_count=10, trash_days=None):
        self.directory = Path(directory).expanduser().resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        self.trash_days = trash_days
        self.logger = logging.getLogger(__name__)

    def safe_path(self, path):
        # Resolve junctions and symlinks as well as '..'. Never follow archive links.
        if path.resolve() != path or path.is_symlink():
            raise OSError("Storage links are not allowed")
        if path.exists() and path.is_file() and path.stat().st_nlink > 1:
            raise OSError("Storage hard links are not allowed")
        return path

    def archive_dir(self, name):
        path = self.safe_path(self.directory / name)
        path.mkdir(exist_ok=True)
        return path

    @contextmanager
    def locked(self):
        # A permanent lock file avoids locking an inode replaced by os.replace.
        with self.safe_path(self.directory / ".library.lock").open("a+b") as handle:
            handle.seek(0, os.SEEK_END)
            if handle.tell() == 0:
                handle.write(b"\0")
                handle.flush()
            deadline = time.monotonic() + 5
            while True:
                handle.seek(0)
                try:
                    if os.name == "nt":
                        import msvcrt
                        msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                    else:
                        import fcntl
                        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except (OSError, BlockingIOError):
                    if time.monotonic() >= deadline:
                        raise StorageBusy() from None
                    time.sleep(0.02)
            try:
                yield
            finally:
                if os.name == "nt":
                    msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    fcntl.flock(handle, fcntl.LOCK_UN)

    def path(self, identifier):
        try:
            if str(UUID(identifier)) != identifier:
                raise ValueError()
        except ValueError:
            raise CharacterNotFound() from None
        return self.safe_path(self.directory / (identifier + ".json"))

    def read(self, identifier):
        try:
            return self.read_record(self.path(identifier), identifier)
        except FileNotFoundError:
            raise CharacterNotFound() from None

    def read_record(self, path, identifier):
        with self.safe_path(path).open("rb") as handle:
            raw = handle.read(self.max_bytes + 4097)
        if len(raw) > self.max_bytes + 4096:
            raise ValueError("Stored character exceeds size limit")
        record = strict_json(raw)
        if (not isinstance(record, dict) or record.get("id") != identifier
                or type(record.get("revision")) is not int
                or record["revision"] < 1
                or record["revision"] > 9007199254740991
                or not isinstance(record.get("updated_at"), str)
                or not isinstance(record.get("character"), dict)):
            raise ValueError("Invalid stored record")
        if datetime.fromisoformat(record["updated_at"].replace("Z", "+00:00")).tzinfo is None:
            raise ValueError("Stored timestamp must include its timezone")
        validate_character(record["character"])
        return record

    def archive_path(self, kind, record):
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        return self.archive_dir(kind) / (record["id"] + ".r" + str(record["revision"]) + "." + stamp + "." + str(uuid4()) + ".json")

    def archived_record(self, path, identifier=None):
        parts = path.name.split(".")
        if len(parts) != 5 or parts[4] != "json":
            raise ValueError("Unmanaged archive filename")
        if str(UUID(parts[0])) != parts[0] or str(UUID(parts[3])) != parts[3] or identifier and parts[0] != identifier:
            raise ValueError("Invalid archive identity")
        datetime.strptime(parts[2], "%Y%m%dT%H%M%S%fZ")
        record = self.read_record(path, parts[0])
        if parts[1] != "r" + str(record["revision"]):
            raise ValueError("Archive filename does not match its revision")
        return record

    def backup(self, record):
        pattern = record["id"] + ".r" + str(record["revision"]) + ".*.json"
        for path in self.archive_dir("backups").glob(pattern):
            if self.archived_record(path, record["id"]) == record:
                return  # A failed active replacement may already have saved this version.
        self.atomic_write(self.archive_path("backups", record), record)

    def atomic_write(self, destination, record):
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=destination.parent,
                prefix=".character-", suffix=".tmp", delete=False,
            ) as handle:
                temporary = handle.name
                json.dump(record, handle, ensure_ascii=True, allow_nan=False,
                          separators=(",", ":"))
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self.safe_path(destination))
        finally:
            if temporary and os.path.exists(temporary):
                os.unlink(temporary)

    def prune(self, identifier):
        # Maintenance failures never turn an already committed mutation into an error.
        try:
            backups = sorted(self.archive_dir("backups").glob(identifier + ".r*.json"),
                             key=lambda path: (path.stat().st_mtime_ns, path.name), reverse=True)
            for path in backups[self.backup_count:]:
                self.archived_record(path, identifier)
                self.safe_path(path).unlink()
            if self.trash_days is not None:
                cutoff = time.time() - self.trash_days * 86400
                for path in self.archive_dir("trash").glob("*.json"):
                    # Use the deletion time in our archive filename, not source mtime.
                    parts = path.name.split(".")
                    if len(parts) != 5:
                        continue
                    self.archived_record(path)
                    deleted = datetime.strptime(parts[2], "%Y%m%dT%H%M%S%fZ").replace(tzinfo=timezone.utc)
                    if deleted.timestamp() < cutoff:
                        self.safe_path(path).unlink()
        except (OSError, ValueError):
            self.logger.warning("Archive retention failed; inspect private storage", exc_info=True)

    def delete(self, identifier, revision):
        with self.locked():
            record = self.read(identifier)  # Refuse corrupt/unmanaged files before moving.
            if record["revision"] != revision:
                raise Conflict(record["revision"])
            target = self.archive_path("trash", record)
            os.replace(self.path(identifier), target)
            self.prune(identifier)
            return record

    def restore(self, kind, filename):
        """Administrator-only local recovery; never overwrite an active character."""
        if kind not in {"trash", "backups"} or not re.fullmatch(
            r"[0-9a-f-]{36}\.r[1-9][0-9]*\.[0-9]{8}T[0-9]{12}Z\.[0-9a-f-]{36}\.json", filename
        ):
            raise ValueError("Expected an archive filename, without a directory")
        identifier = filename.split(".")[0]
        with self.locked():
            if self.path(identifier).exists():
                raise ValueError("An active character with this ID already exists")
            record = self.archived_record(self.archive_dir(kind) / filename, identifier)
            revisions = [record["revision"]]
            for directory in ("trash", "backups"):
                for path in self.archive_dir(directory).glob(identifier + ".r*.json"):
                    revisions.append(self.archived_record(path, identifier)["revision"])
            record["revision"] = max(revisions) + 1
            if record["revision"] > 9007199254740991:
                raise ValueError("Revision limit reached")
            record["updated_at"] = datetime.now(timezone.utc).isoformat()
            self.atomic_write(self.path(identifier), record)
            return record

    def write(self, identifier, character, revision=None):
        with self.locked():
            if identifier is None:
                identifier = str(uuid4())
                while self.path(identifier).exists():
                    identifier = str(uuid4())
                next_revision = 1
            else:
                current = self.read(identifier)
                if current["revision"] != revision:
                    raise Conflict(current["revision"])
                next_revision = revision + 1
                if next_revision > 9007199254740991:
                    raise ValueError("Revision limit reached")
                # A backup must be durable before the active version can be replaced.
                self.backup(current)
            record = {
                "id": identifier,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "revision": next_revision,
                "character": character,
            }
            self.atomic_write(self.path(identifier), record)
            if revision is not None:
                self.prune(identifier)
            return record
