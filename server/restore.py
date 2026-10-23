"""Manual local recovery: python -m server.restore ARCHIVE_FILENAME."""

import argparse

from .app import create_app
from .storage import CharacterNotFound


def main():
    parser = argparse.ArgumentParser(description="Restore a private character archive without overwriting active files")
    parser.add_argument("filename", help="Filename inside trash/ or backups/; no directory")
    parser.add_argument("--from", dest="kind", choices=("trash", "backups"), default="trash")
    args = parser.parse_args()
    store = create_app().extensions["character_store"]
    try:
        record = store.restore(args.kind, args.filename)
    except (OSError, ValueError, CharacterNotFound) as error:
        parser.exit(1, "Recovery failed: " + (str(error) or "Invalid archive identity") + "\n")
    print("Restored " + record["id"] + " at revision " + str(record["revision"]))


if __name__ == "__main__":
    main()
