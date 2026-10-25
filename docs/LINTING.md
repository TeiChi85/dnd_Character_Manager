# Schlanke Fehlerpruefung

ESLint, Ruff und Stylelint ergaenzen die vorhandenen Tests. Sie sind reine
Entwicklungswerkzeuge: Offline-Start, Flask-Betrieb und datenfreie Node-Tests
benoetigen die Linter nicht. Kein Build-Schritt, Formatter oder Prettier.

## Einrichtung

Fuer Lint Node **22.13+ innerhalb 22.x oder 24+** und Python **3.12+** verwenden.
Die bisherigen datenfreien Tests funktionieren weiterhin mit Node 18+;
Playwright bleibt separat unter `tools/browser/` installiert.

Windows PowerShell, im Repository-Stamm:

```powershell
npm.cmd ci --ignore-scripts --no-fund --no-audit
# Falls noch keine .venv existiert: py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lint.txt
npm.cmd run --silent lint
node tools/validate_lint.mjs
```

Linux/macOS:

```sh
npm ci --ignore-scripts --no-fund --no-audit
# Falls noch keine .venv existiert: python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-lint.txt
npm run --silent lint
node tools/validate_lint.mjs
```

Der Runner und die Konfigurationspruefung verwenden `LINT_PYTHON`, falls gesetzt,
sonst die vorhandene Root-`.venv`, sonst `python` aus PATH. CI verwendet diesen
letzten Fall mit `actions/setup-python`. Ein fehlendes Werkzeug fuehrt zu einem
Fehler, nicht zu einem Skip. Bei einer unpassenden lokalen Python-Auswahl kann
`LINT_PYTHON` auf den vollstaendigen Interpreterpfad gesetzt werden.

Einzeln: `npm run --silent lint:js`, `npm run --silent lint:css` oder
`npm run --silent lint:py` (unter PowerShell bei Bedarf `npm.cmd`).
Direkter gemeinsamer Einstieg: `node tools/lint.mjs [js|css|py]`.
Normale Erfolgsausgabe: eine `OK`-Zeile je Sprache. Befunde erscheinen als
`Datei:Zeile:Spalte Regel Meldung`; alle Sprachen werden auch nach einem Befund
geprueft. Jeder fehlerhafte Lauf endet ungleich 0. Konfigurations-/Startfehler
behalten die Originaldiagnose des Werkzeugs. Es werden keine Fixes angewandt.

## Versionen und Konfiguration

| Werkzeug | Version / Datei | Aufgabe |
| --- | --- | --- |
| ESLint | 10.13.0 / `eslint.config.mjs` | JavaScript-Fehler |
| globals | 17.13.0 | Browser- und Node-Globals |
| eslint-plugin-html | 8.2.1 | Inline-Skripte mit HTML-Zeilennummern |
| Stylelint | 17.16.0 / `stylelint.config.mjs` | CSS-Fehler |
| postcss-html | 2.0.0 | CSS in HTML-Style-Bloecken |
| Ruff | 0.17.2 / `ruff.toml` | Python-Fehler, Zielsyntax Python 3.12 |

Direkte npm-Versionen stehen exakt in `package.json`, transitive Abhaengigkeiten
und Integritaetswerte in `package-lock.json`. Das Manifest ist privat und setzt
kein `type: module`, damit vorhandene CommonJS-Imports unveraendert funktionieren.
Ruff steht separat in `requirements-lint.txt`; `required-version` verhindert
abweichende Ruff-Versionen. Flask- und Playwright-Abhaengigkeiten bleiben getrennt.
Die beiden Root-JSON-Dateien sind gezielte Ignore-Ausnahmen ohne Regeldaten.
Updates bewusst durchfuehren, Lockfile pruefen und Lint/Konfigurationschecks
wiederholen; kein ungepinntes `npx` fuer den normalen Prueflauf.

## Umfang und Umgebungen

- JavaScript: `js/**/*.js`, `resources/pdf-fields.js`, Root-HTML-Seiten,
  `tools/**/*.mjs`, Root-`*.config.mjs` sowie die beiden vorhandenen WSH-Dateien
  `tools/validate.js` und `tools/cc_fetch.js`.
- Browser-Code bleibt klassisches Script. Nur Core-/UI-Module und
  `character-validation.js` erhalten ihre vorhandenen CommonJS-Globals.
  `PDFLib` wird ausschliesslich fuer `app.js` als optionaler Bibliotheksglobal
  zugelassen; die bestehende Laufzeitpruefung bleibt erhalten.
- Node-Tests und Entwicklungswerkzeuge sind ES-Module mit Node-Globals.
  Ausschliesslich `tools/browser/mobile.mjs` erhaelt zusaetzlich Browser-Globals
  fuer `evaluate`-/`addInitScript`-/`waitForFunction`-Callbacks. Der Linter kann
  diese Globals dort nicht auf den jeweiligen Callback begrenzen.
- WSH wird als ES5-Script mit `WScript`, `ActiveXObject` und `Enumerator`
  geprueft. Nur `cc_fetch.js` erhaelt die durch seinen `eval`-Loader injizierten
  Bindungen `window` und `ROOT`. Der Loader wird beim Lint nicht ausgefuehrt.
- CSS: `css/**/*.css` und `<style>`-Bloecke der Root-HTML-Seiten.
- Python: `server/**/*.py` und `tools/**/*.py`, einschliesslich Tests,
  Generatoren und vorhandener Packaging-/Sync-Hilfen. Lint fuehrt sie nicht aus.
- Ausgeschlossen: generierte `resources/data-*.js`, Features/Kreaturen,
  optionale PDF-Payloads und Fremdbibliotheken, `node_modules`, virtuelle
  Umgebungen, Browser-Artefakte sowie die lokalen Fremdordner `Microsoft/`
  und `CharacterManager_Harness_v0.1/`. Private Daten werden nicht als
  Linter-Eingaben verwendet. Ruff beachtet zusaetzlich die Git-Ignore-Regeln.

Neue Quellbereiche oder eine andere Laufzeit erfordern eine gezielte Ergaenzung
der Konfiguration und des Pruefkommandos. Inline-Eventattribute in HTML,
CSS in `style`-Attributen und JavaScript-/CSS-Fragmente in Strings werden nicht
als eigenstaendige Programme geprueft. Ein Linter erkennt keine falschen
Spielregeln, DOM-IDs, API-Antworten oder asynchronen Ablauffehler.

## Regeln und Umgang mit Befunden

ESLint prueft undefinierte Namen, Zuweisungen an Konstanten/Funktionen,
doppelte Parameter/Objektschluessel/Switch-Faelle, unerreichbaren Code,
unsichere Finally-Kontrollfluesse, NaN-Vergleiche und ungueltige Typeof-Werte.
Ruff verwendet `E9`, `F63`, `F7`, `F82`: Syntax-/Name-/Kontrollflussfehler und
offensichtlich fehlerhafte Ausdruecke. Stylelint prueft Syntax, unbekannte
Eigenschaften/Einheiten und ungueltige Hexfarben.

Keine Komplettpresets, Stilregeln, Import-Sortierung, ungenutzte-Namen-Sanierung
oder Massenformatierung. Das ist eine bewusste erste Regelauswahl, keine
pauschale Unterdrueckung bestehender Meldungen. Es gibt keine Befund-Baseline,
breiten Regelabschaltungen oder automatischen unsicheren Fixes.

Bei einem Befund zuerst Laufzeit/Globals und Dateiumfang pruefen. Echte Fehler
klein und mit passenden bestehenden Tests beheben. Optionale Verbesserungen
getrennt bewerten. Bei vielen Altbefunden einen begrenzten Umfang abstimmen,
statt Regeln fuer einen gruenen Lauf auszuschalten.

## CI und Nachweise

Der separate Linux-Job `Lint` in `.github/workflows/tests.yml` installiert aus
dem Lockfile und `requirements-lint.txt`, startet `npm run lint` und danach
`node tools/validate_lint.mjs`. Dieser datenfreie Check nutzt die echten
Linter mit synthetischen Fehlern, prueft Laufzeitgrenzen, HTML-Zeilennummern
und Ausschluesse. Er fuehrt keine Regeldaten/Generatoren aus und schreibt keine
Quell-Fixtures. Bestehende Windows-/Ubuntu-Tests und der Playwright-Job bleiben
erhalten. Tatsaechliche Einfuehrungslaeufe stehen in [LINT_RESULTS.md](LINT_RESULTS.md).
