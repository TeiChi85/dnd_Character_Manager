# Testarchitektur und Ausfuehrung

## Tests im Ueberblick

| Test | Befehl | Regeldaten | GitHub Actions |
| --- | --- | --- | --- |
| Flask-API und Speicher | `python -m unittest discover -s server -t . -v` | Nein; synthetische Charaktere und temporaere Ordner | Ja |
| Frontend/API-Integration im simulierten Browser | `node tools/validate_server_frontend.mjs` | Nein; synthetische Daten | Ja |
| Klassenlade-Regression | `node tools/validate_class_loading.mjs` | Nein; kontrollierte synthetische Scriptantworten | Ja |
| Theme-Verhalten | `node tools/validate_theme.mjs` | Nein; simulierte Browser- und Speicher-APIs | Ja |
| Portabler Regel-Runner: Adapter-Selbsttest | `node tools/validate_rules.mjs --self-test` | Nein; nur eigens erzeugte synthetische Smoke-Daten | Ja |
| Vollstaendige D&D-Regelsuite | `node tools/validate_rules.mjs` | Ja; lokal generierte Dateien unter `resources/` | Nein |
| Historischer Windows-Regelvergleich | `cscript.exe //nologo tools\validate.js` | Ja; dieselben lokalen Dateien unter `resources/` | Nein |
| Live-Bibliothek | `node tools/validate_live_library.mjs` | Keine Regeldaten; synthetische Charaktere und eigener Testserver | Nein; separat und bewusst nicht Teil des Standardlaufs |

Node.js 18 oder neuer ist fuer die Entwicklungstests erforderlich, aber nicht
fuer den produktiven Betrieb des Vanilla-JavaScript-Frontends. Es gibt kein
npm-Manifest und keine zusaetzlichen Node-Paketabhaengigkeiten. Das Backend
verwendet die Pakete aus `server/requirements.txt`.

## Lokale Befehle

Im Repository-Stamm unter Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v
node tools\validate_server_frontend.mjs
node tools\validate_class_loading.mjs
node tools\validate_theme.mjs
node tools\validate_rules.mjs --self-test
```

Die entsprechenden plattformneutralen Befehle sind:

```sh
python -m unittest discover -s server -t . -v
node tools/validate_server_frontend.mjs
node tools/validate_class_loading.mjs
node tools/validate_theme.mjs
node tools/validate_rules.mjs --self-test
```

Die Klassenlade-Suite importiert derzeit `validate_server_frontend.mjs`; der
Import fuehrt dessen Tests ebenfalls aus. Werden beide Befehle wie oben
ausgefuehrt, erscheinen die 26 Frontend-Szenarien daher zweimal. Das ist eine
bekannte Doppelzaehlung, keine zusaetzliche Abdeckung.

## Vollstaendige Regelsuite lokal ausfuehren

Zuerst die vom Nutzer bereitgestellten und zur lokalen Nutzung autorisierten
5etools-Daten wie in [DEVELOPMENT.md](../DEVELOPMENT.md) generieren. Die Daten
bleiben lokal und ignoriert. Danach:

```powershell
node tools\validate_rules.mjs
```

oder unter Linux/macOS:

```sh
node tools/validate_rules.mjs
```

Der portable Runner laedt und fuehrt den bestehenden Assertion-Code aus
`tools/validate.js` in einem Node-`vm`-Kontext aus. Ein kleiner Adapter stellt
nur die verwendeten WSH-Oberflaechen (`ActiveXObject`, Dateizugriff,
Verzeichnisaufzaehlung und `WScript`) mit Node-Standardbibliotheken bereit.
Damit bleiben die fachlichen Assertions an einer Stelle; die bestehende
`cscript.exe`-Ausfuehrung bleibt als Windows-Vergleich erhalten. `app.js` wird
weiterhin nur im Testlauf textuell um einen kontrollierten Zugriff auf interne
Funktionen ergaenzt. Diese Uebergangsschnittstelle bleibt auf die Testdatei
beschraenkt und kann nach der Regel-Extraktion in PR 03 ersetzt werden.

Ohne generierte Dateien beendet sich der vollstaendige Runner mit Exitcode 2
und nennt die fehlende Ressource. Fehlende Daten werden nicht als Skip oder
erfolgreicher Lauf ausgegeben. Assertions- oder Laufzeitfehler liefern einen
Exitcode ungleich 0. Eine erfolgreiche vollstaendige Ausfuehrung gibt die
Anzahl bestandener und fehlgeschlagener Checks sowie die Zahl gerenderter
Unterklassen aus. Homebrew-Checks werden nur ausgefuehrt, wenn im lokalen
Datensatz ein Homebrew-Buch vorhanden ist; andernfalls wird der Skip sichtbar
ausgegeben. Die bekannte Referenz bei passendem Datensatz ist 1.513 Checks,
0 Fehler und 242/242 Unterklassen; Werte sind nur mit identischen Daten direkt
vergleichbar.

`node tools/validate_rules.mjs --self-test` ist fuer CI und Umgebungen ohne
Regeldaten gedacht. Es prueft mit temporaeren, synthetischen Dateien den
WSH-Adapter und startet isolierte Kindprozesse, um die Fehlermeldung bei
fehlenden Daten und den tatsaechlichen Nicht-Null-Exitcode eines absichtlich
fehlschlagenden Checks zu verifizieren. Dieser Smoke-Test belegt nur die
Testinfrastruktur, nicht die Korrektheit von D&D-Regeln.

## Regressionstests erweitern

- Frontend-Verhalten mit synthetischen Daten in der passenden
  `tools/validate_*.mjs`-Suite pruefen; keine Regeldaten fuer reine Zustands-,
  API- oder DOM-Verhaltensfaelle verwenden.
- Fachliche Regelberechnungen als neue Assertions in `tools/validate.js`
  ergaenzen. Der Node-Runner fuehrt diese Datei aus, sodass keine zweite
  Assertion-Kopie gepflegt werden muss.
- Erwartungswerte nur nach nachvollziehbarer Regel- und Fehleranalyse aendern.
- Keine geschuetzten Regeltexte, Regeldatensaetze, Homebrew-Dateien oder
  Charakterexporte als Testfixtures einchecken.
- Bei einem reproduzierten Fehler den Befehl, den benutzten Datensatz bzw.
  dessen Version, Pass-/Fehlerzahlen und erklaerte Abweichungen in
  `docs/TEST_BASELINE.md` festhalten.

## GitHub Actions und Grenzen

`.github/workflows/tests.yml` laeuft fuer Pull Requests gegen `main` und Pushes
auf `main` auf Windows und Ubuntu. Es installiert die Python-Abhaengigkeiten,
fuehrt die Backend- und datenfreien Node-Tests aus und verwendet keine
Regeldaten, Uploads oder externen Testdienste. Die vollstaendige Regel- und
Live-Bibliotheks-Suite wird dort absichtlich nicht als bestanden ausgegeben.

Ein Test gilt nur dann als bestanden, wenn sein Prozess mit Exitcode 0 endet.
Ein expliziter Skip (zum Beispiel Homebrew ohne lokale Homebrew-Daten) bleibt
als Skip sichtbar; nicht vorhandene Pflicht-Regeldaten beenden stattdessen den
vollstaendigen Lauf mit Fehler.
