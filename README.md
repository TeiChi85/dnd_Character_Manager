# CharacterManager

A free, lightweight, self-hosted web application for private D&D 2024 (5.5e)
groups, built with plain HTML, CSS and JavaScript and a Flask shared character
library. The product targets mobile play, accurate supported rule calculations
and simple operation for four typical, at most seven simultaneous users on a
Raspberry Pi 3B. No production build or in-application accounts are required.
Existing D&D 2014 and offline functionality remain as legacy compatibility.

![CharacterManager home screen](docs/screenshot-home.png)

The application provides a guided builder, equipment and spell choices,
editable gameplay values, local JSON import/export and rule reference pages.
The library and sheet have responsive layouts; the complete mobile wizard design
is still open. Availability of classes, features and reference content depends on
your local data. The highest development priority is the interactive mobile
character sheet; the intended tablet/desktop group overview is not yet provided
by the library. The central [project definition](docs/PROJECT.md) separates the
product target, V1–V3 priorities, acceptance criteria and current baseline;
[mobile scope](docs/MOBILE_UI.md) documents the existing responsive implementation.

## Run locally

- **Offline:** open `index.html` in a current browser after preparing local data.
  A loopback file server is also supported. Local JSON files work without Flask.
  This remains available as legacy compatibility, not a future offline requirement.
- **Shared local library:** Flask serves the same frontend and a revision-checked
  storage API, with private backups/trash. The existing JSON-file store is the
  persistence baseline; no database migration is planned by the product definition.
  The current start binds to `127.0.0.1`. Private LAN access and later a domain
  with upstream access protection require a separate deployment task; there is
  no internal account/role system.

[DEVELOPMENT.md](DEVELOPMENT.md) is the authoritative setup/start guide, including
local data generation and optional PDF resources. The checkout ships no generated
rule content: use only a local 5etools-format source you are authorized to use.
Copyrighted rule texts, private rule files, homebrew books and personal characters
must stay outside the repository. Owning rulebooks or obtaining data does not
automatically permit redistribution; technical rule support and usage rights
are separate.
The original documentation named 5etools v2.33.1 as its validated reference;
this is not a guarantee for other source versions or a new test result.

The current Print/PDF actions open the generated HTML print view; the browser can
save it as PDF. An older template-based exporter remains in the code but is not
wired to these buttons. Its optional local resources are described in the setup
guide. Browser file dialogs and downloads vary by browser.

## Find the right documentation

- [Project goals and limits](docs/PROJECT.md)
- [Architecture map](docs/ARCHITECTURE.md): controller, state, pure rules modules,
  UI factories, generators and optional storage
- [Tests and verification](docs/TESTING.md), [lint setup](docs/LINTING.md)
- [Library usage and conflicts](docs/SERVER_LIBRARY.md), [API](server/README.md),
  [recovery](docs/STORAGE_RECOVERY.md)
- [Contributor workflow](docs/WORKFLOW.md), [Codex instructions](AGENTS.md)

## Origin and licence

Based on [TaylorMouse/dnd_character_creator](https://github.com/TaylorMouse/dnd_character_creator).
This repository is `TeiChi85/dnd_Character_Manager`. Preserve the original
copyright, Git history and [MIT licence](LICENSE).

Dungeons & Dragons is a trademark of Wizards of the Coast. This unofficial fan
tool distributes code, not game content. The code licence grants no rights to
redistribute rules, homebrew books, portraits or official PDF templates.
