# Prüfauswahl, Befehle und Grenzen

Diese Datei ist die maßgebliche Prüfanleitung; gewöhnliche Laufergebnisse
gehören in PR/CI oder die betroffene Aufgabenübergabe. Historische Protokolle
unter `docs/archive/` sind kein aktueller Teststatus. Einrichtung und Serverstart:
[DEVELOPMENT.md](../DEVELOPMENT.md). Lint: [LINTING.md](LINTING.md).

<a id="pruefauswahl"></a>

## Prüfauswahl

Nach betroffenem Verhalten auswählen; bei übergreifenden Änderungen kombinieren.
Die Tabelle ist kein Zwang zu Volltests für jeden kleinen Fix.

| Änderungsart | Passende Prüfungen | Zusätzlich bei konkretem Anlass |
| --- | --- | --- |
| Dokumentation | Lokale Links/Anker und Linux-Pfadschreibweise, Befehle gegen Skripte/Manifeste/CI, Aussagen gegen Code, ganzer Diff und `git diff --check` | Keine App-/Browser-/Regeldatentests ohne Verhaltens- oder Konfigurationsänderung |
| Regeln | Rules Core, Engine und Adapter; Lint für betroffene Sprache | Vollständige lokale Regelsuite bei datenabhängiger Auswahl/Interpretation; beide Editionen |
| State/Import/Export | Character State, Frontend und Klassenladen; Rules-Adapter bei Folgewerten | Backend bei gemeinsamem Validierungsvertrag; Dateifehler, Unknown Fields, Dirty-State und Rollback |
| Backend/Speicher | Alle Python-Backendtests; Frontend bei API-Vertragsänderung; Lint | Isolierter Live-Test bei echtem Transport/Recovery; nie Nutzerspeicher |
| UI/Theme/Mobil | UI-Komponenten, Mobile-UI, Theme und betroffene Frontend-/Adaptertests; Lint | Playwright bei Layout/Interaktion; manuelle Geräte-/Dateidialogprüfung, wenn betroffen |
| Prüfkonfiguration | Lint und `validate_lint.mjs` bei Linteränderung; Runner-Selbsttest bei Harnessänderung | Betroffene bestehenden Tests/CI; Lockfile-Installation, wenn Abhängigkeiten geändert werden |

## Voraussetzungen

Alle Befehle aus dem Repository-Stamm. Datenfreie Node-Suiten und die volle
Node-Regelsuite verwenden Node **18+** ohne npm-Pakete. Backendtests benötigen
Flask aus `server/requirements.txt`; unter Windows die vorhandene
`.venv/Scripts/python.exe`, unter Unix `.venv/bin/python` verwenden.
Playwright ist separat unter `tools/browser/` installiert und benötigt Node
**20+**. Lint hat eine eigene neuere Mindestversion laut [LINTING.md](LINTING.md).
Das Root-Manifest fügt keine produktiven Abhängigkeiten und keinen Test-Runner hinzu.

## Datenfreie Tests

Jeden Tabellenbefehl direkt starten; kein gemeinsames `npm test` im Root behaupten.
`python` in der Tabelle durch den passenden venv-Interpreter ersetzen.

| Bereich | Befehl | Prüfgrenze |
| --- | --- | --- |
| Backend/API/Storage | `python -m unittest discover -s server -t . -v` | Synthetische Charaktere, temporäre Speicher, Fehler-/Sperr-/Prozess- und Loopback-HTTP-Fälle |
| Rules Core | `node tools/validate_rules_core.mjs` | Numerische Grundfunktionen und Stufengrenzen |
| Character State | `node tools/validate_character_state.mjs` | Defaults, Normalisierung, Serialization, Erweiterungen, Mutation-/Prototype-Schutz |
| Rules Engine | `node tools/validate_rules_engine.mjs` | AC, Kampf, Items/Effekte; gefrorene Eingaben und wiederholte Aufrufe |
| Rules-Adapter | `node tools/validate_rules_adapters.mjs` | Produktive Berechnung/Sheet-HTML und Events mit synthetischen Daten für beide Editionen |
| UI-Komponenten | `node tools/validate_ui_components.mjs` | Echte Factories/Renderer, Events, Escaping, Isolation und eingefrorener persistenter State |
| Mobile-UI | `node tools/validate_mobile_ui.mjs` | Hosts, Navigation/Dialoge, eindeutige IDs, Suche und persistente Spielwerte |
| Frontend/API | `node tools/validate_server_frontend.mjs` | Echter Client/Controller, simulierte HTTP-/Browser-APIs, Dirty-/Busy-/Import-/Rollback-Fälle |
| Klassenladen | `node tools/validate_class_loading.mjs` | Echte Loader/Handler mit kontrollierter Antwortreihenfolge und Invalidierung |
| Theme | `node tools/validate_theme.mjs` | Alle HTML-Seiten, Speicher-/Systemwahl, Tab-Synchronisierung; Browserneustart simuliert |
| Portabler Runner | `node tools/validate_rules.mjs --self-test` | Synthetischer Adapter-Smoke, Missing-Data-Diagnose und absichtlicher Failure-Exit; keine Regelabnahme |

**Bekannte doppelte Ausführung:** Klassenlade- und Live-Library-Suite importieren
`validate_server_frontend.mjs`; dessen Szenarien laufen beim Import erneut.
Separate CLI-Aufrufe beider Suiten zählen diese Abdeckung deshalb nicht doppelt.
Bei der Interpretation von Summen diese erneute Ausführung berücksichtigen.

Der DOM-Harness modelliert nur benötigte Browseroberflächen. Core-/Engine-Tests
prüfen Mathematik; Adapter-/UI-Tests belegen produktive Pfade mit synthetischen
Katalogen und teils ersetzten Start-/Redraw-Routen. Layout, vollständiges
Event-Bubbling und native Datei-/PDF-Dialoge sind damit nicht geprüft.
Die Adapter-Suite muss eine absichtlich falsche Engine-AC in einem separaten
Prozess erkennen; reine Fallback-Ausführung darf eine Regression nicht verdecken.

<a id="browserpruefung"></a>

## Browserprüfung mit Playwright

Einmalig bei Bedarf, Windows (`npm`/`npx` statt `.cmd` unter Unix):

```powershell
npm.cmd ci --prefix tools/browser
npx.cmd --prefix tools/browser playwright install chromium webkit
node tools/browser/mobile.mjs
```

Linux benötigt gegebenenfalls Systempakete; der vorhandene CI-Befehl ist
`npx --prefix tools/browser playwright install --with-deps chromium webkit`.
Versionen sind nur im [Browser-Manifest](../tools/browser/package.json) und
[Lockfile](../tools/browser/package-lock.json) maßgeblich.
Der Runner startet selbst einen synthetischen HTTP-/API-Server auf einem freien
Loopback-Port. Er verwendet keine Nutzerbibliothek und ersetzt Ressourcen durch
synthetische Kataloge/leere Antworten. Screenshots bleiben im ignorierten
`tools/browser/artifacts/`; keine automatischen Uploads.

Geprüft werden Chromium und WebKit in beiden Themes mit Phone-/Tablet-/Desktop-
Viewports, Überlauf, Controls/Kontrast, Fokus/History, Filter, JSON und Persistenz
von HP/Slots/Equip/Attunement nach Save/Reload. Die Builder-Probe vergleicht Styles
mit und ohne Mobile-CSS. Die genaue Matrix steht im Runner; Design-Abnahmeziele
stehen ausschließlich in [UI_DESIGN_SPEC.md](UI_DESIGN_SPEC.md#10-ui-abnahmekriterien).
Headless WebKit ist kein echter iPhone-Test. Geräte, Softwaretastatur, Safe Areas,
Screenreader und native Datei-/PDF-Dialoge benötigen manuelle Prüfung. Halbierte
CSS-Breite ist nur eine Reflow-Probe und kein vollständiger 200-%-Zoomnachweis.

## Vollständige lokale Regelsuite

Nur nach autorisierter lokaler [Datenbereitstellung](../DEVELOPMENT.md#lokale-regeldaten-bereitstellen):

```powershell
node tools/validate_rules.mjs
# Optionaler Vergleich unter Windows:
cscript.exe //nologo tools/validate.js
```

Node führt dieselben Assertions aus `tools/validate.js` in einem `vm`-Kontext mit
WSH-Datei-/Prozessadapter aus. Beide laden echte lokale Ressourcen und produktive
Module; keine zweite fachliche Assertionsammlung. Die internen App-Funktionen
werden nur im Test textuell freigegeben. Aufrufzähler belegen Core-/Engine-Nutzung.
Fehlende Pflichtdaten: Exitcode 2 mit fehlender Ressource, kein erfolgreicher Skip.
Assertions-/Laufzeitfehler: ungleich 0. Homebrew ohne lokales Buch wird sichtbar
übersprungen. Testzahlen hängen von Quelle und Code ab; hier keine feste Sollzahl.

## Isolierter Live-Test

Optional bei Transport-/Bibliotheksänderungen. Nie gegen den Nutzerserver.
`tools/validate_live_library.mjs` verwendet fest `127.0.0.1:8001`, erzeugt
synthetische eigene IDs und hinterlässt deren Recovery-Archive im Testspeicher.
DOM und Rendering bleiben simuliert. Kein Live-Test gegen echte Charaktere.

In einem eigenen PowerShell-Fenster einen temporären Speicher außerhalb des
Repositorys und einen eigenen Server starten:

```powershell
.\.venv\Scripts\python.exe -u -c @"
from tempfile import TemporaryDirectory
from server.app import create_app
from werkzeug.serving import make_server
with TemporaryDirectory(prefix='cc-isolated-') as directory:
    app = create_app({'CHARACTER_STORAGE_DIR': directory})
    server = make_server('127.0.0.1', 8001, app)
    print('Isolated test server ready on 127.0.0.1:8001', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
"@
```

Bei belegtem Port abbrechen; niemals ersatzweise gegen den vorhandenen Dienst
laufen lassen. Erst nach der Bereitschaftsmeldung in einem zweiten Fenster
`node tools/validate_live_library.mjs` ausführen. Danach im ersten Fenster mit
`Strg+C` stoppen; der Context entfernt synthetische Dateien und Archive.
Für Unix denselben Python-Block über `.venv/bin/python` ausführen.

## Fertigkriterien und CI

- Geändertes Verhalten und relevante Fehlerfälle am produktiven Pfad prüfen;
  erwartete Werte fachlich begründen, nicht für einen grünen Lauf anpassen.
- Beide Editionen berücksichtigen. UI-/Theme-/Navigationsaktionen dürfen keinen
  persistenten State verändern; Änderungen durch explizite Spielaktionen erhalten.
- Importfehler, Konflikte und späte Antworten dürfen keine fremden/alten Daten
  anwenden. Bei State-/Speicheränderungen Kompatibilität und Rollback beachten.
- Nur synthetische eigene Fixtures einchecken; keine Regeldaten, echten Charaktere
  oder geschützten Regeltexte. Gesamten Diff und betroffene Dokumentation prüfen.
- Nur ausgeführte Prüfungen mit Ergebnis/Exitcode als bestanden melden. Grenzen,
  fehlende Werkzeuge/Daten und Skips separat benennen; historische Erfolge gelten
  nicht automatisch für den heutigen Checkout.

Laut [Workflow-Konfiguration](../.github/workflows/tests.yml) laufen bei PRs gegen
`main` und Pushes auf `main` ein Linux-Lint-Job, Backend-/datenfreie Node-Tests auf
Windows/Ubuntu und ein separater synthetischer Linux-Browserjob. CI verwendet
Node 22/Python 3.12; vollständige Regelsuite und Live-Test bleiben außerhalb.
Dies beschreibt die Konfiguration, nicht den Erfolg eines aktuellen CI-Laufs.
Bei langsamer Browserinstallation zuerst Download/Systempakete von Testlaufzeit
unterscheiden; fehlgeschlagene Installation ist keine fachliche Testdiagnose.
