"""File storage with a cross-process lock and atomic replacement."""

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import time
from uuid import UUID, uuid4


class StorageBusy(Exception):
    pass


class Conflict(Exception):
    def __init__(self, revision):
        self.revision = revision


class Store:
    def __init__(self, directory, max_bytes):
        self.directory = Path(directory).expanduser().resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.max_bytes = max_bytes

    @contextmanager
    def locked(self):
        # A permanent lock file avoids locking an inode replaced by os.replace.
        with (self.directory / ".library.lock").open("a+b") as handle:
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
            raise FileNotFoundError() from None
        path = self.directory / (identifier + ".json")
        if path.is_symlink():
            raise OSError("Character file must not be a symbolic link")
        return path

    def read(self, identifier):
        with self.path(identifier).open("rb") as handle:
            raw = handle.read(self.max_bytes + 4097)
        if len(raw) > self.max_bytes + 4096:
            raise ValueError("Stored character exceeds size limit")
        record = json.loads(raw)
        if (not isinstance(record, dict) or record.get("id") != identifier
                or type(record.get("revision")) is not int
                or record["revision"] < 1
                or not isinstance(record.get("updated_at"), str)
                or not isinstance(record.get("character"), dict)):
            raise ValueError("Invalid stored record")
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
            record = {
                "id": identifier,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "revision": next_revision,
                "character": character,
            }
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w", encoding="utf-8", dir=self.directory,
                    prefix=".character-", suffix=".tmp", delete=False,
                ) as handle:
                    temporary = handle.name
                    json.dump(record, handle, ensure_ascii=True, allow_nan=False,
                              separators=(",", ":"))
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(temporary, self.path(identifier))
            finally:
                if temporary and os.path.exists(temporary):
                    os.unlink(temporary)
            return record
