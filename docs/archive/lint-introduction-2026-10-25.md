> **Historischer Stand – archiviert.** Der folgende Inhalt bleibt als damaliger
> Plan bzw. Prüfnachweis erhalten, ist keine aktuelle Betriebsanleitung und
> keine pauschale Aussage zum heutigen Teststatus. Überholte Serializer-,
> Scope- und Phasenaussagen sind historisch zu lesen. Aktuell maßgeblich:
> [Einrichtung](../../DEVELOPMENT.md), [Prüfungen](../TESTING.md),
> [State-Vertrag](../CHARACTER_STATE.md), [Architektur](../ARCHITECTURE.md).

# Linter-Einfuehrung: ausgefuehrte Pruefungen

Datum: **25.10.2026**, Windows, Branch `chore/slim-lint`, Basis `88d49aa`
(aktuelles `origin/main` nach Fetch). Node **24.22.1**, npm **11.19.1**,
Python **3.15.1** aus der vorhandenen `.venv`.
Einrichtung, Versionen, Regelumfang und Ausschluesse: [LINTING.md](../LINTING.md).

## Ausgangspruefung und Wiederholung

Alle folgenden Befehle liefen vor der Implementierung und erneut nach der
Linter-Einfuehrung, jeweils mit Exitcode **0**:

| Befehl im Repository-Stamm | Ausgang / nachher |
| --- | --- |
| `.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v` | jeweils 39 Tests bestanden |
| `node tools/validate_rules_core.mjs` | bestanden / bestanden |
| `node tools/validate_character_state.mjs` | bestanden / bestanden |
| `node tools/validate_ui_components.mjs` | bestanden / bestanden |
| `node tools/validate_mobile_ui.mjs` | bestanden / bestanden |
| `node tools/validate_rules_engine.mjs` | bestanden / bestanden |
| `node tools/validate_rules_adapters.mjs` | bestanden / bestanden |
| `node tools/validate_server_frontend.mjs` | bestanden / bestanden |
| `node tools/validate_class_loading.mjs` | bestanden / bestanden |
| `node tools/validate_theme.mjs` | bestanden / bestanden |
| `node tools/validate_rules.mjs --self-test` | bestanden / bestanden |
| `node tools/validate_rules.mjs` | jeweils 1.533 Checks, 0 Fehler |
| `node tools/browser/mobile.mjs` | jeweils 1.066 Browserchecks bestanden |

Die Klassenlade-Suite fuehrt beim Import auch die Frontendszenarien aus;
dies wird nicht als zusaetzliche Abdeckung gezaehlt. Die volle Regelsuite
nutzte die bereits vorhandenen lokalen ignorierten Ressourcen. Es wurden
keine Regeldaten heruntergeladen, generiert, veraendert oder hochgeladen.
Homebrew wurde mangels lokalem Buch sichtbar uebersprungen.
Playwright nutzte seine vorhandene getrennte Installation und ausschliesslich
den eigenen synthetischen Loopback-Testserver mit Chromium/WebKit.
Eine zusaetzliche Wiederholung der Browser-Ausgangspruefung ausserhalb der
Sandbox bestand ebenfalls; der erste Lauf lieferte spaeter ebenfalls Exit 0.
Zusaetzlich nach der Einfuehrung: `cscript.exe //nologo tools/validate.js`
mit 1.533 bestandenen Checks, 0 Fehlern und Exit 0; kein neuer WSH-Vorherlauf.

## Installation, Lint und Befunde

- Exakte Versionen aus npm/PyPI abgefragt; Installation mit
  `npm.cmd install --ignore-scripts --no-fund --no-audit` und
  `.\.venv\Scripts\python.exe -m pip install -r requirements-lint.txt` erfolgreich.
- Reproduzierbare Neuinstallation mit
  `npm.cmd ci --ignore-scripts --no-fund --no-audit`: Exit 0.
  Alle 188 Lockfile-Pakete als Entwicklungsabhaengigkeiten mit oeffentlichen
  npm-Registry-URLs und Integritaetswerten geprueft; keine Install-Skripte.
- `npm.cmd run --silent lint`: ESLint, Stylelint und Ruff jeweils ohne Befund,
  Exit 0. Keine Fix-Option verwendet, keine Anwendungsaenderung erforderlich.
- `node tools/validate_lint.mjs`: 26 synthetische Konfigurationschecks bestanden,
  Exit 0. Einschliesslich echter Fehlerdiagnosen, HTML-Zeilennummern,
  Browser-/Node-/WSH-Grenzen und Ressourcen-/Fremdordner-Ausschluessen.
- CLI-Fehlerfaelle bewusst geprueft: unbekanntes Argument liefert Exit 2;
  ein nicht vorhandener `LINT_PYTHON`-Interpreter liefert Exit 1 statt Erfolg.

Der erste Lint-Lauf meldete **18 `no-undef`-Konfigurationsbefunde**:

| Datei / Zeile | Regel | Meldung / Einordnung |
| --- | --- | --- |
| `js/app.js:3690` | `no-undef` | `'PDFLib' is not defined`: optionaler Bibliotheksglobal, durch bestehende Laufzeitpruefung abgesichert |
| `tools/browser/mobile.mjs:52-119` | `no-undef` | 17 Meldungen fuer `document`, `window`, `innerWidth`, `getComputedStyle`: Browser-Callbacks in einem Node-Runner |

Beide Faelle wurden durch dateibezogene Globals beschrieben; `no-undef` bleibt
aktiv. Ein zwischenzeitlich zu breites Ressourcen-Ignore schloss auch
`resources/pdf-fields.js` aus. Der Lauf scheiterte wegen dieser Warnung;
das Muster wurde korrigiert und die Aufnahme der Datei synthetisch geprueft.
Ein frueher Konfigurationscheck erwartete zwei ESLint-Meldungen in einer anderen
Reihenfolge; der Check vergleicht nun die Regelmenge ohne Reihenfolgezwang.
Das waren Konfigurations-/Testbefunde, keine Fehler im Anwendungscode.
Stylelint und Ruff hatten bereits im ersten Lauf keine Befunde mit der
vereinbarten begrenzten Fehlerauswahl. Optionale Stil-/Unused-Name-Aufraeumarbeiten
wurden nicht begonnen; es gibt keine pauschalen Regelabschaltungen.

## Grenzen

Lokale Linter liefen unter Node 24/Python 3.15; der CI-Lint-Job prueft
Node 22/Python 3.12 unter Linux. Der Status des GitHub-Laufs ist am Pull Request
sichtbar und wird nicht aus lokalen Tests abgeleitet.
Die manuelle Geraete-, Screenreader-, Dateipicker- und PDF-Abnahme sowie der
optionale Live-Library-Test wurden hier nicht ausgefuehrt. Keine Testschreibzugriffe
auf den Nutzerserver oder persoenliche Charakterdateien. Ungetracktes `Microsoft/`
bleibt unberuehrt; keine fremden Dateien werden committed.
Weitere Grenzen der statischen Pruefung stehen in [LINTING.md](../LINTING.md).
Der vollstaendige Quelldiff und die Lockfile-Eintraege wurden geprueft;
`git diff --cached --check` meldete keine Whitespace-Fehler.
