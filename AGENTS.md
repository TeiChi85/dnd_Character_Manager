# CharacterManager: Einstieg für Codex

Vanilla HTML/CSS/JavaScript, ohne produktiven Build; Python für lokale
Datengenerierung und das optionale Flask-Backend. Repository:
`TeiChi85/dnd_Character_Manager`, Ursprung: `TaylorMouse/dnd_character_creator`.

## Arbeitsregeln

- Auftrag und Git-Status zuerst prüfen; bestehende Nutzeränderungen bewahren.
  Verhalten nur im beauftragten Umfang ändern, keine beiläufigen Umbauten.
- Charakter-JSON und v1-Kompatibilität erhalten. Importfehler dürfen Charakter,
  Dateihandle oder Serveridentität nicht verwerfen. Neue Felder vorab als
  persistent, UI, Derived oder Runtime klassifizieren.
- Regeleditionen 2014 (`classic`) und 2024 (`one`) getrennt berücksichtigen.
  Fachliche Fehlerkandidaten nicht stillschweigend zu Sollverhalten erklären.
- Reines Rendering, Navigation und Theme-Wechsel verändern keine persistenten
  Spielwerte. Gameplay-Synchronisierung gehört an Zustandsübergänge.
- Core/Engine haben keinen DOM-, API- oder Character-State-Zugriff. UI erhält
  State/UI/Derived sowie explizite Aktionen/Adapter vom Controller.
- MIT-Lizenz, Copyright und ursprüngliche Git-Historie bewahren. Kein neues
  Framework oder Raspberry-Pi-/Netzwerkdeployment ohne passenden Auftrag.
- Keine Regeldaten, Homebrew-Bücher, Charakterexporte, privaten Porträts,
  PDF-Vorlagen oder Zugangsdaten committen. Persönliche Dateien außerhalb halten.
  `.gitignore` nicht mit `git add -f` umgehen. Neue JSON-Quellen/Ressourcen
  gezielt prüfen; nur bei Bedarf eine enge Ignore-Ausnahme ergänzen.
- Regeldaten nur aus ausdrücklich autorisierten lokalen Quellen verarbeiten;
  keine automatischen Downloads/Uploads. Ignorierte Dateien sind nicht vor
  Zugriff durch Agenten oder andere Werkzeuge geschützt.
- Testschreibzugriffe nur auf isolierte synthetische Daten und temporären
  Speicher außerhalb des Repositorys, niemals auf die Nutzerbibliothek.
  Lokale Server auf `127.0.0.1` binden; Live-Test separat auf Port 8001.
- Packaging-, Dropbox-, Git-Hook- und Public-Sync-Hilfen nicht automatisch
  ausführen. Sie gehören nicht zum Entwicklungsstart.
- Nur tatsächlich ausgeführte Prüfungen als bestanden melden; statische Prüfung,
  fehlende Voraussetzungen und Skips ausdrücklich unterscheiden.
- Betroffene aktuelle Dokumentation im selben Änderungspaket anpassen.
  Keine Pflicht, unbetroffene Dokumente oder jedes Mal alle Tests anzufassen.
- Für kleine und große Aufgaben gilt [WORKFLOW.md](docs/WORKFLOW.md): `PR: neu`
  autorisiert Branch, Commit, Push und neuen PR; `PR: #<Nummer>`/PR-URL die
  Fortsetzung im passenden offenen PR. Nutzerbeschränkungen gehen vor.
  CI des letzten Pushs nachverfolgen; niemals mergen oder Auto-Merge aktivieren.
- `Server: starten` autorisiert den optionalen manuellen Start gemäß Workflow;
  `Server: aus` oder keine Angabe lässt vorhandene Server unverändert und startet
  keinen zusätzlichen Anwendungsserver. Eindeutige Sitzungsanweisungen beachten.
- Bei Verhaltensänderungen passende Tests pflegen; Fehler sinnvoll durch
  Regressionstests absichern. Verhalten/Fehlerfälle statt Implementierungsdetails
  prüfen, Erwartungen nicht für Grün abschwächen. Auswahl: [TESTING.md](docs/TESTING.md).
- UI-Arbeit verwendet vorhandene Tokens/Komponenten zuerst; neue Varianten nur
  bei Bedarf, kein Redesign ohne Auftrag. Design-Soll und Umsetzung unterscheiden.
- Gesamten Diff prüfen. Vor einem erlaubten Commit zusätzlich
  `git diff --cached --name-only` und Staging-Diff prüfen. Git-Aktionen richten
  sich nach dem Nutzerauftrag; keine zusätzlichen Freigabehürden erfinden.

## Aufgabenbezogen lesen

Die passenden verlinkten Dokumente ausdrücklich lesen; nicht pauschal alle.
`docs/archive/` gehört nicht zum regulären Einstiegskontext.

| Aufgabe | Einstieg |
| --- | --- |
| Ziel / unklarer Umfang | [Projekt](docs/PROJECT.md), [Landkarte](docs/ARCHITECTURE.md) |
| Einrichtung / Start / Daten | [DEVELOPMENT.md](DEVELOPMENT.md) |
| Prüfungen / Lint | [TESTING.md](docs/TESTING.md), [LINTING.md](docs/LINTING.md) |
| State / Import / Export | [CHARACTER_STATE.md](docs/CHARACTER_STATE.md) |
| Regeländerung | [RULES_ARCHITECTURE.md](docs/RULES_ARCHITECTURE.md) |
| UI / Theme / Mobil | [UI-Verträge](docs/UI_ARCHITECTURE.md), [Mobile Scope](docs/MOBILE_UI.md), [Design-Soll](docs/UI_DESIGN_SPEC.md) |
| Bibliothek / API / Speicher | [Bedienung](docs/SERVER_LIBRARY.md), [Backend](server/README.md), [Recovery](docs/STORAGE_RECOVERY.md) |
| Größere Arbeit / Übergabe | [Workflow](docs/WORKFLOW.md), [Aufgabenvorlage](docs/tasks/TEMPLATE.md) |
| Entscheidungen / offene Abweichungen | [DECISIONS.md](docs/DECISIONS.md), [Vertragsklärung](docs/tasks/CONTRACT_REVIEW.md) |
