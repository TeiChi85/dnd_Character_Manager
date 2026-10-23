# CharacterManager: Hinweise für Codex

- Lies zuerst `DEVELOPMENT.md` und `README.md`. Anwendung in HTML, CSS und
  JavaScript; Python dient der lokalen Datengenerierung und als optionales
  Flask-Backend (`server/`) fuer die gemeinsame Charakterbibliothek.
- `index.html` und die Referenzseiten sind die Einstiegspunkte,
  `js/app.js` enthält die Anwendungslogik, `css/styles.css` die Darstellung.
  `tools/regen_all.py` ruft die Datengeneratoren auf; `tools/datasrc.py`
  unterstützt einen expliziten Datenpfad und `CC_5ETOOLS_DATA`.
- Aendere das Verhalten nur im Rahmen des aktuellen Nutzerauftrags. Bestehende
  Regelberechnungen, JSON-Import/-Export und MIT-Lizenz erhalten. Keine neuen
  Frameworks oder Raspberry-Pi-Bereitstellung ohne entsprechenden Auftrag.
- Repository: `TeiChi85/dnd_Character_Manager`; Original:
  `TaylorMouse/dnd_character_creator`.
- Bewahre MIT-Lizenz, Copyright und Git-Historie des Originals.
- Keine Regeldaten, Homebrew-Bücher, Charakterexporte, PDF-Vorlagen oder
  Zugangsdaten committen. `.gitignore` nicht mit `git add -f` umgehen.
  Neue JSON-Quelldateien oder Ressourcen brauchen eine gezielte Prüfung und
  bei Bedarf eine enge Ignore-Ausnahme. Persönliche Dateien außerhalb halten.
- Regeldaten nur aus einer vom Nutzer autorisierten lokalen Quelle verarbeiten;
  keine automatischen Downloads oder Uploads. Ignorierte Dateien sind nicht
  automatisch vor Zugriff durch Agenten oder andere Werkzeuge geschützt.
- Der reine Offline-Start benoetigt kein npm-/pip-Setup. Fuer Flask die vorhandene
  `.venv` nutzen bzw. erstellen und `server/requirements.txt` installieren;
  Start im Repository: `.\.venv\Scripts\python.exe -m server.app`.
  Beide lokalen Server aus `DEVELOPMENT.md` an `127.0.0.1` binden (Standard 8000).
- Tests: Python `-m unittest discover -s server -t . -v`; Node 18+ ohne npm-Pakete:
  `tools/validate_server_frontend.mjs`, `tools/validate_theme.mjs`,
  `tools/validate_class_loading.mjs` und `tools/validate_rules.mjs --self-test`.
  Die Klassenlade-Suite verwendet die Frontend-Testumgebung mit synthetischen
  Daten und kontrollierter Antwortreihenfolge. Sie importiert ausserdem den
  Frontend-Harness und fuehrt dessen Tests erneut aus.
  `tools/validate_live_library.mjs` ausschliesslich gegen einen separaten
  Testserver auf 127.0.0.1:8001 mit temporaerem Speicher ausserhalb des Repositorys.
- Vollstaendige Regelsuite: `node tools/validate_rules.mjs` oder weiterhin
  direkt `cscript.exe //nologo tools\validate.js` nach lokaler Datengenerierung
  (`CC_5ETOOLS_DATA` oder expliziter Datenpfad). Der Node-Adapter fuehrt dieselben
  Assertions aus der WSH-Suite aus; keine Regeldaten werden eingecheckt oder
  heruntergeladen.
  Bei fehlenden Daten/Werkzeugen die Einschraenkung nennen; einen ausgelassenen
  Test nie als bestanden melden. Aktuelle Baseline: `docs/TEST_BASELINE.md`.
- Upstream-Hilfen für Packaging, Dropbox, Git-Hooks oder Public-Sync nicht
  automatisch ausführen; sie gehören nicht zum Entwicklungsstart.
- Vor einem Commit `git diff --cached --name-only` und den Diff prüfen.
  Beschreibe Änderungen, Prüfungen und offene Einschränkungen.
