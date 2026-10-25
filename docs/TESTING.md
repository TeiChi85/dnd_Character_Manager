# Testarchitektur und Ausfuehrung

## Tests im Ueberblick

| Test | Befehl | Regeldaten | GitHub Actions |
| --- | --- | --- | --- |
| Flask-API und Speicher | `python -m unittest discover -s server -t . -v` | Nein; synthetische Charaktere und temporaere Ordner | Ja |
| Rules Core | `node tools/validate_rules_core.mjs` | Nein; synthetische Zahlen und Stufengrenzen | Ja |
| Character State / Serialization | `node tools/validate_character_state.mjs` | Nein; Defaults und synthetische v1-Exports | Ja |
| UI-Komponenten und echte App-Renderer | `node tools/validate_ui_components.mjs` | Nein; synthetische Daten, DOM und Events | Ja |
| Mobile Hosts, SectionSelector und State-Isolation | `node tools/validate_mobile_ui.mjs` | Nein; synthetisch | Ja, Windows/Ubuntu |
| Mobile Browsermatrix | `node tools/browser/mobile.mjs` | Nein; eigene synthetische HTTP-/API-Fixture | Ja, separater Linux-Job |
| Rules Engine | `node tools/validate_rules_engine.mjs` | Nein; synthetische AC-/Kampf-/Item-/Effekteingaben | Ja |
| Rules-Adapter | `node tools/validate_rules_adapters.mjs` | Nein; echte App-Adapter mit synthetischer Ausruestung und Features | Ja |
| Frontend/API-Integration im simulierten Browser | `node tools/validate_server_frontend.mjs` | Nein; synthetische Daten | Ja |
| Klassenlade-Regression | `node tools/validate_class_loading.mjs` | Nein; kontrollierte synthetische Scriptantworten | Ja |
| Theme-Verhalten | `node tools/validate_theme.mjs` | Nein; simulierte Browser- und Speicher-APIs | Ja |
| Portabler Regel-Runner: Adapter-Selbsttest | `node tools/validate_rules.mjs --self-test` | Nein; nur eigens erzeugte synthetische Smoke-Daten | Ja |
| Vollstaendige D&D-Regelsuite | `node tools/validate_rules.mjs` | Ja; lokal generierte Dateien unter `resources/` | Nein |
| Historischer Windows-Regelvergleich | `cscript.exe //nologo tools\validate.js` | Ja; dieselben lokalen Dateien unter `resources/` | Nein |
| Live-Bibliothek | `node tools/validate_live_library.mjs` | Keine Regeldaten; synthetische Charaktere und eigener Testserver | Nein; separat und bewusst nicht Teil des Standardlaufs |

Node.js 18 oder neuer ist fuer die Entwicklungstests erforderlich, aber nicht
fuer den produktiven Betrieb des Vanilla-JavaScript-Frontends. Es gibt keine
zusaetzlichen Node-Paketabhaengigkeiten fuer diese datenfreien Tests.
Die optionalen Linter im Root-Manifest benoetigen Node 22.13+ (22.x) oder 24+;
Playwright verwendet weiterhin sein separates Manifest. Das Backend verwendet
die Pakete aus `server/requirements.txt`.

Ergaenzende Fehlerpruefung: `npm run --silent lint`; Konfigurationspruefung:
`node tools/validate_lint.mjs`. [Installation, Regeln und Ausschluesse](LINTING.md)
sowie [tatsaechliche Einfuehrungslaeufe](LINT_RESULTS.md). Ein eigener CI-Job
`Lint` prueft dieselben Quellen ohne Regeldaten; die Testjobs bleiben erhalten.

## Lokale Befehle

Im Repository-Stamm unter Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v
node tools\validate_rules_core.mjs
node tools\validate_character_state.mjs
node tools\validate_ui_components.mjs
node tools\validate_mobile_ui.mjs
node tools\validate_rules_engine.mjs
node tools\validate_rules_adapters.mjs
node tools\validate_server_frontend.mjs
node tools\validate_class_loading.mjs
node tools\validate_theme.mjs
node tools\validate_rules.mjs --self-test
```

Die entsprechenden plattformneutralen Befehle sind:

```sh
python -m unittest discover -s server -t . -v
node tools/validate_rules_core.mjs
node tools/validate_character_state.mjs
node tools/validate_rules_engine.mjs
node tools/validate_rules_adapters.mjs
node tools/validate_server_frontend.mjs
node tools/validate_class_loading.mjs
node tools/validate_theme.mjs
node tools/validate_rules.mjs --self-test
```

Die Klassenlade-Suite importiert derzeit `validate_server_frontend.mjs`; der
Import fuehrt dessen Tests ebenfalls aus. Werden beide Befehle wie oben
ausgefuehrt, erscheinen die Frontend-Szenarien daher zweimal. Das ist eine
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
beschraenkt. Seit PR 04 laedt die Suite vor der App auch `rules-core.js` und
`rules-engine.js`. Aufrufzaehler und 20 zusaetzliche Assertions belegen, dass
die produktiven Core-/Engine-Pfade erreicht werden. Die alten App-Fallbacks
sind damit nicht mehr die alleinige Grundlage der Regelchecks.

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

Die PR04-Referenz mit demselben lokalen Datensatz ist 1.533 Checks (die bisherigen
1.513 plus 20 Aufrufnachweise), 0 Fehler und 242/242 Unterklassen. Die separaten
Core-/Engine-/Adapter-Suiten pruefen die ausgelagerte Implementierung auch ohne
Regeldaten. Die Adapter-Suite ersetzt Featureliste, Startaufruf und Redraw-Route;
AC, Item-/Attunement-Filter, Angriffszeilen, aktive Effekte und Zauber-Summary
verwenden echte App-Funktionen. Es handelt sich weiterhin um einen simulierten
DOM, keine Sichtpruefung im Browser. Echte Sheet-HTML-Ausgabe und Equip-/Level-
Event-Handler werden fuer beide Editionen geprueft. Eine manipulierte Engine-AC
muss den Sheet-Test in einem separaten Prozess mit Exitcode 1 scheitern lassen.

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
  ergaenzen, wenn reale Klassen-/Regeldaten beteiligt sind. Reine Core-/Engine-
  Mathematik mit synthetischen Eingaben direkt in den entsprechenden Unit-Suiten
  pruefen. Der Node-Runner und WSH fuehren dieselbe Legacy-Assertiondatei aus.
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

## PR05: State- und Importabdeckung

`validate_character_state.mjs` prueft den produktiven UMD/CommonJS-State-Vertrag
direkt: Defaults und Referenzunabhaengigkeit, Gameplay-Roundtrips, Legacy-UI-
Bereinigung, unbekannte Zusatzfelder, stabile Exportstruktur, gefrorene Eingaben,
Zyklen und unsichere Objekt-Keys. Kein Regeldatensatz oder Backend erforderlich.

`validate_server_frontend.mjs` prueft zusaetzlich UI- versus Gameplay-Dirty-State,
Snapshots waehrend Saves, Dateihandle-/State-Rollback, invalide und verzoegerte
Dateileser, fehlende Referenzen und Importwechsel mit synthetischen Daten.
`validate_rules_adapters.mjs` prueft echte Sheet-/Rules-Ergebnisse nach Import,
Reset, Levelwechsel und Charakterwechsel fuer beide Editionen. Die Harnesses
laden `character-state.js` explizit; es gibt keinen alten State-Fallback.

Die Legacy-Suite verwendet denselben persistenten State und einen separaten
Derived-Testzugriff. Ihre bisherigen String-Suchen fuer Proficiency-Persistierung
und Legacy-Migration pruefen jetzt echte Serialize-/Normalize-Ergebnisse.
Der Backend-Fixture-Test liest die Feldliste aus dem State-Modul. Assertions und
Erwartungswerte fuer Regeln werden dadurch nicht entfernt oder abgeschwaecht.

## PR06: UI- und Interaktionsabdeckung

`validate_ui_components.mjs` verwendet CommonJS-Komponenten und die echten
Browsermodule mit `ui_test_harness.mjs`. Dieser kleine Standardbibliotheks-
Harness liest `index.html`, baut einen simulierten DOM mit ersetzbaren Knoten,
lokalen Listener-Sets und einfachen Selektoren und startet die produktive App
mit synthetischen Katalogen. Er ersetzt keine Renderer oder Regeladapter.
Aufrufzaehler an den Factory-Exports belegen die produktive Modulverwendung.

117 Checks decken Initialisierung, leere Daten, Escaping, Collapsible Panels,
wiederholtes Rendering, Listener-Anzahl, isolierte Listen/Sheet-Abschnitte,
Klasse/Level/Unterklasse, Background, Species, Abilities, Equipment und Spells
ab. Dazu kommen Navigation/Menue/Escape, HP, Ressourcen, Inspiration, Effekte,
Rest, Importbereinigung und Reset. Tief eingefrorene persistente Objekte
pruefen alle Creator-/Sheet-Renderer und Schrittwechsel ohne State-Mutation.

Busy-/Dirty-Schutz, Datei-/Serverimporte, Identitaet, Dialoge und verspaetete
Klassen-/Dateiantworten bleiben in den bestehenden 37 Frontend- und 8
Klassenladeszenarien abgedeckt. Diese Harnesses laden nun alle produktiven
UI-Module. Der Legacy-Harness behaelt saemtliche Assertions; statische
DOM-/Icon-Vertragssuchen lesen zusaetzlich die ausgelagerten Quelldateien.

Der DOM-Harness prueft kein CSS-Layout, echtes Event-Bubbling, Touch-Verhalten
oder native Datei-/PDF-Dialoge. Ein lokaler HTML-Vergleich mit der Basisversion
kann ueber `createUIHarness({appSource: baselineSource})` durchgefuehrt werden;
CI benoetigt weder Git-Historie noch Regeldaten. Architektur, Vertrauensgrenzen
fuer HTML und PR07-Voraussetzungen: [UI_ARCHITECTURE.md](UI_ARCHITECTURE.md).

## PR07: Mobile Browser und State-Isolation

Die zusaetzliche datenfreie Mobile-Suite prueft 93 Faelle: die produktive mobile
Komposition, zehn Abschnittswechsel, eindeutige IDs, Fokus-Rueckgabe, persistente
HP nach Redraw/Navigation, bestehender Builder sowie Library-Suche und sicheres
Text-Rendering. Der gemeinsame DOM-Harness modelliert dafuer Knotenverschiebung,
aktiven Fokus, Dialog-Close-Events und einen expliziten mobilen Media-Query-Modus.
Die alten Harnesses wurden nur um die benoetigte `setAttribute`-Methode ergaenzt;
ihre bisherigen Assertions bleiben erhalten.

Die Playwright-Suite startet ihre eigene synthetische API/Dateiauslieferung auf
einem freien Loopback-Port. Sie verwendet niemals den laufenden Flask-Server
oder persoenliche Charakterdateien. Optionale npm-Entwicklungsabhaengigkeiten
liegen in `tools/browser/`; die uebrigen Tests benoetigen weiterhin keine Pakete.
Node 20+ ist nur fuer diese Browser-Suite erforderlich (CI: 22).

```powershell
npm.cmd ci --prefix tools/browser
npx.cmd --prefix tools/browser playwright install chromium webkit
node tools/browser/mobile.mjs
```

Unter Linux `npm`/`npx`; bei fehlenden Systembibliotheken Playwright mit
`install --with-deps chromium webkit` ausfuehren. Die reproduzierbare Matrix
beinhaltet beide Browser, beide Themes und sieben Phone-/Tablet-/Desktop-
Viewports. Sie prueft Seitenueberlauf, 44-px-Controls, semantische Farbkontraste,
Dialogfokus, Back, Busy-/Konflikt-/Offline-Zustaende, Filter, JSON und persistente
HP-/Slot-/Equip-/Attunement-Werte. Builder-Styles werden mit und ohne Mobile-CSS
verglichen; beide Editionen bleiben bedienbar. Screenshots bleiben lokal ignoriert.

Dies sind Headless-Browserchecks, keine echte Android-/iPhone-, Screenreader-,
Softwaretastatur- oder native Dateidialog-Abnahme. Die Desktop-Reflow-Probe mit
halbierter CSS-Breite ist keine vollstaendige Zoompruefung. Details und bekannte
Grenzen: [MOBILE_UI.md](MOBILE_UI.md).
