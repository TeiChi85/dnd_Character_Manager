# CharacterManager: Hinweise für Codex

- Lies zuerst `DEVELOPMENT.md` und `README.md`. Statische Anwendung in HTML,
  CSS und JavaScript; Python dient der lokalen Datengenerierung, nicht als Backend.
- `index.html` und die Referenzseiten sind die Einstiegspunkte,
  `js/app.js` enthält die Anwendungslogik, `css/styles.css` die Darstellung.
  `tools/regen_all.py` ruft die Datengeneratoren auf; `tools/datasrc.py`
  unterstützt einen expliziten Datenpfad und `CC_5ETOOLS_DATA`.
- Ändere das Verhalten nur im Rahmen des aktuellen Nutzerauftrags. Die erste
  Vorbereitung umfasst ausschließlich Dokumentation und Ignore-Regeln:
  keine Speicherung auf dem Server, Raspberry-Pi-Anbindung oder neuen Frameworks.
- Bewahre MIT-Lizenz, Copyright und Git-Historie des Originals.
- Keine Regeldaten, Homebrew-Bücher, Charakterexporte, PDF-Vorlagen oder
  Zugangsdaten committen. `.gitignore` nicht mit `git add -f` umgehen.
  Neue JSON-Quelldateien oder Ressourcen brauchen eine gezielte Prüfung und
  bei Bedarf eine enge Ignore-Ausnahme. Persönliche Dateien außerhalb halten.
- Regeldaten nur aus einer vom Nutzer autorisierten lokalen Quelle verarbeiten;
  keine automatischen Downloads oder Uploads. Ignorierte Dateien sind nicht
  automatisch vor Zugriff durch Agenten oder andere Werkzeuge geschützt.
- Kein npm-/pip-Setup für den normalen Start nötig. Verwende den lokalen
  Python-HTTP-Server aus `DEVELOPMENT.md` und binde ihn an `127.0.0.1`.
- Vorhandene Regressionstests: `cscript.exe //nologo tools\validate.js` unter
  Windows nach der Datengenerierung. Bei fehlenden Daten oder ohne Windows
  die Einschränkung nennen; einen ausgelassenen Test nie als bestanden melden.
- Upstream-Hilfen für Packaging, Dropbox, Git-Hooks oder Public-Sync nicht
  automatisch ausführen; sie gehören nicht zum Entwicklungsstart.
- Vor einem Commit `git diff --cached --name-only` und den Diff prüfen.
  Beschreibe Änderungen, Prüfungen und offene Einschränkungen.
