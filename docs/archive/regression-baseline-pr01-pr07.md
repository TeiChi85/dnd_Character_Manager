> **Historischer Stand – archiviert.** Der folgende Inhalt bleibt als damaliger
> Plan bzw. Prüfnachweis erhalten, ist keine aktuelle Betriebsanleitung und
> keine pauschale Aussage zum heutigen Teststatus. Überholte Serializer-,
> Scope- und Phasenaussagen sind historisch zu lesen. Aktuell maßgeblich:
> [Einrichtung](../../DEVELOPMENT.md), [Prüfungen](../TESTING.md),
> [State-Vertrag](../CHARACTER_STATE.md), [Architektur](../ARCHITECTURE.md).

# PR 01: Regression Baseline & Stabilization

Neu ausgefuehrte Laeufe am **23.10.2026**, Windows 11, Python **3.15.1** aus der
vorhandenen `.venv`. Ausgangspunkt: `0c384c2` (aktuelles `main` beim Start),
Arbeitsbranch `refactor/01-baseline`. Das vorhandene ungetrackte `Microsoft/`
wurde nicht veraendert oder aufgenommen. Keine Regeldaten heruntergeladen,
neu generiert oder committed; die WSH-Suite las die bereits lokal vorhandenen
ignorierten Ressourcen.

## Testaufbau

- `server/test_api.py` und `server/test_hardening.py`: unittest, synthetischer
  Charakter, temporaere Speicher, Flask-Testclient sowie echte HTTP-/Prozess-
  und Konkurrenzpruefungen. Keine echten Charaktere noetig.
- `tools/validate_server_frontend.mjs`: Node `assert`/`vm`, echte App-/API-Skripte,
  synthetische Daten, simulierter DOM und HTTP-Transport. State, Serialisierung,
  Event-Handler, Validierung, Konflikte und lokale Dateien werden geprueft;
  Regel-/Darstellungsaufbau wird gezielt ersetzt.
- `tools/validate_theme.mjs`: isolierte Browser-/Storage-/Media-Mocks und Pruefung
  aller sieben HTML-Seiten. Browserneustart wird simuliert.
- `tools/validate_live_library.mjs`: derselbe Frontend-Harness mit echtem HTTP
  zu einer separaten Flask-Instanz auf 127.0.0.1:8001. DOM bleibt simuliert.
- `tools/validate.js`: Windows Script Host, ActiveX-Dateizugriff, simulierter DOM,
  echte lokal generierte Daten und Regel-/Renderchecks, inklusive Subklassen.

## Tatsaechlich ausgefuehrte Vorher-/Nachher-Laeufe

Alle Shell-Befehle wurden im Repository-Stamm ausgefuehrt.

| Befehl / Modul | Vor der Korrektur | Nach der Korrektur | Exitcode / Fehler |
| --- | --- | --- | --- |
| `.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v` | 39 bestanden | 39 bestanden | jeweils 0; keine Fehler |
| `cscript.exe //nologo tools\validate.js` | 1513 bestanden, 242/242 Subklassen | 1513 bestanden, 242/242 Subklassen | jeweils 0; 0 Fehler; Homebrew mangels Buch uebersprungen |
| `tools/validate_server_frontend.mjs` | 26 bestanden | 26 bestanden | Modulimport erfolgreich; kein eigener Prozess-Exitcode |
| `tools/validate_theme.mjs` | 14 bestanden | 14 bestanden | Modulimport erfolgreich; kein eigener Prozess-Exitcode |
| `tools/validate_class_loading.mjs` (neu) | Erste Assertion reproduziert den Fehler; Lauf stoppt dort | 8 bestanden | Vorher AssertionError, nachher erfolgreicher Modulimport; kein eigener Prozess-Exitcode |
| `tools/validate_live_library.mjs` | In diesem Auftrag vorher nicht ausgefuehrt | 8 bestanden, zusaetzlich 26 importierte Frontend-Szenarien | Erfolgreicher Modulimport; isolierter Server anschliessend Exitcode 0 |

**Node-Ausfuehrung:** `node` und `gh` sind nicht im PowerShell-PATH verfuegbar
(`where.exe` jeweils Exitcode 1). Die `.mjs`-Tests wurden tatsaechlich mit
`await import('file:///C:/Users/marco/Projects/dnd_Character_Manager/tools/DATEI.mjs')`
in der vorhandenen eingebetteten Node-Laufzeit ausgefuehrt. Vor dem finalen
Klassenlade-Lauf wurde deren Kernel zurueckgesetzt, damit der Modulcache keine
alte App-Version verwendet. Das ist kein als ausgefuehrt ausgegebener
`node ...`-CLI-Aufruf. Der Testwerkzeug-Rueckgabewert meldete jeweils keinen
Fehler; beim erwarteten Vorher-Fehler wurde die Assertion zum Protokollieren
aufgefangen. Bei vorhandenem Node 18+ sind die aequivalenten CLI-Aufrufe:

```powershell
node tools\validate_server_frontend.mjs
node tools\validate_theme.mjs
node tools\validate_class_loading.mjs
```

`validate_class_loading.mjs` importiert den bestehenden Harness und fuehrt dabei
auch dessen 26 Szenarien aus. Diese werden nicht als neue Tests mitgezaehlt.

Die frueheren 1513/242-Werte aus `server/TEST_RESULTS.md` sind historische
Referenzen. Die obige Tabelle basiert auf neuen Laeufen vor und nach PR 01;
sie bestaetigt diese Werte erneut. Kein Rueckgang und keine Abweichung in den
bestehenden Ergebnissen. D&D-Regelberechnungen, SAVE_KEYS, Charakter-Schema,
Serialisierung, Backend, HTML und CSS wurden in diesem PR nicht veraendert.

## Nachgewiesene Race Condition und Korrektur

Der neue Test lieferte zuerst Wizard, dann die aeltere Fighter-Antwort.
Vorher wurde `state.fdata.syntheticSelection` von `current` auf `stale`
ueberschrieben, obwohl Klasse und Auswahl weiter Wizard waren: AssertionError
in der ersten Regression. Es handelt sich um einen tatsaechlich reproduzierten
Callback-/State-Fehler, nicht um eine visuelle Browserbeobachtung.

Ein Generationszaehler in `app.js` schuetzt jetzt ausschliesslich das Anwenden
von Klassendaten im State. Jeder neue Auswahlauftrag erhaelt eine Generation;
Callbacks pruefen Generation und aktuellen Slug. Leere Auswahl, Reset, Rueckkehr
zur Startseite und Charakterimport invalidieren alte Auftraege. Auch ein
Klassenimport ohne Slug darf nicht durch eine alte Antwort zur Bogenansicht
zurueckspringen. Der rohe Script-Loader bleibt fuer das reine Vorladen der
Serverbibliothek nutzbar; dessen Promise wird nicht durch Auswahl-Invalidierung
unbeabsichtigt haengengelassen. Navigation innerhalb desselben Creators darf
die weiterhin ausgewaehlte Klasse normal fertig laden.

Neue deterministische Szenarien pruefen State, Auswahlelement und protokollierte
Renderaufrufe des bestehenden Harness:

1. Fighter -> Wizard, Fighter kommt zuletzt.
2. Fighter -> Wizard -> Fighter, die erste Fighter-Antwort kommt vor der letzten.
3. Dieselbe Folge, aber die letzte Fighter-Antwort kommt zuerst; alter Erfolg
   und alter Ladefehler duerfen sie nicht ersetzen.
4. Auswahl leeren, dann alte Antwort.
5. Charakter zuruecksetzen und dieselbe Klasse neu waehlen, dann alte Antwort.
6. Creator zur Startseite verlassen, dann alte Antwort ohne zusaetzliches Rendern.
7. Normaler sofortiger Abschluss und synchroner Cache-Treffer beim Klassenwechsel.
8. Laufenden lokalen Import durch einen sparse Legacy-Charakter ohne Klasse
   ersetzen; die alte Antwort darf weder Daten noch Ansicht wiederherstellen.

## Isolierter Live-Test

Im tatsaechlichen Lauf wurde Flask mit `create_app` und einer expliziten
`CHARACTER_STORAGE_DIR` aus `tempfile.TemporaryDirectory` gestartet.
`werkzeug.serving.make_server` belegte exklusiv 127.0.0.1:8001. Erst nach der
Bereitschaftsmeldung lief der Test. Ein nur im Testprozess registrierter
Stop-Endpunkt beendete den Request-Loop danach; der Server wurde geschlossen
und der temporaere Speicher vollstaendig entfernt (Exitcode 0).
Ein vorhandener Server auf Port 8000 blieb unberuehrt.

Manuell reproduzierbar mit Node im PATH, in einem eigenen PowerShell-Fenster:

```powershell
@'
from tempfile import TemporaryDirectory
from server.app import create_app
from werkzeug.serving import make_server

with TemporaryDirectory(prefix="cc-baseline-isolated-") as directory:
    app = create_app({"CHARACTER_STORAGE_DIR": directory})
    server = make_server("127.0.0.1", 8001, app)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
'@ | .\.venv\Scripts\python.exe -u -
```

Bei belegtem Port abbrechen, nicht den Test gegen einen fremden Server starten.
In einem zweiten Fenster `node tools\validate_live_library.mjs` ausfuehren.
Anschliessend im ersten Fenster mit Strg+C stoppen: der Context entfernt die
synthetischen Dateien samt Archiven. Kein Standard-/Privatspeicher wird verwendet.

## Grenzen und naechster Schritt

Keine reale Browser-/Mobil-Sichtpruefung, kein echter Browserneustart,
OS-Dateipicker-/PDF-Test oder Linux/ARM/Pi-Test in diesem PR. Die Renderkonsistenz
des neuen Tests bedeutet konsistente Snapshots am echten Render-Aufrufpunkt;
die Darstellung selbst bleibt im Node-Harness ersetzt. Die bestehende WSH-Suite
prueft dagegen das echte Rendering gegen lokale Regeldaten. Homebrew benoetigt
ein autorisiertes lokales Buch und wurde mangels Buch nicht getestet.

Das Script wird bei ungueltiger Antwort nicht abgebrochen; es darf weiter den
Cache befuellen, aber keinen veralteten State-/UI-Callback anwenden. Bestehende
Script-Ladefehler und moegliche lange Netzlaufzeiten werden hier nicht neu
gestaltet. Kein Framework, kein neues Paket und keine Testmigration eingefuehrt.

**Bereit fuer PR 02 – Testmodernisierung:** ja, mit dieser dokumentierten
Vorher-/Nachher-Baseline und reproduzierbarer Regression. Die genannten
Umgebungs-/Sichtpruefungsgrenzen und die Abhaengigkeit der WSH-Suite von Windows
und lokalen Daten bleiben offen.

## PR 02: Portabler Regel-Runner und CI

### Architektur

`tools/validate_rules.mjs` fuehrt `tools/validate.js` unveraendert als
gemeinsame Quelle der 1.513 Regel-Assertions aus. Der Node-Adapter implementiert
die von der Suite benoetigten WSH-Datei- und Prozessoberflaechen mit der
Node-Standardbibliothek. Die bisherige direkte `cscript.exe`-Ausfuehrung bleibt
als Vergleich erhalten. Die Test-Quelltext-Erweiterung zum Zugriff auf interne
App-Funktionen bleibt ausschliesslich in der Testdatei; `js/app.js` und die
Regelberechnungen wurden fuer PR 02 nicht geaendert.

`.github/workflows/tests.yml` fuehrt Backend-, Frontend-, Klassenlade-, Theme-
und Adapter-Selbsttests fuer Ubuntu und Windows aus. Die vollstaendige
Regelsuite wird ohne Regeldaten in CI nicht als bestanden gemeldet. Der
Klassenlade-Test importiert weiterhin den Frontend-Harness und fuehrt diesen
mit aus; bei separatem Aufruf beider Befehle erscheinen die 26
Frontend-Szenarien daher zweimal.

### In dieser Sitzung tatsaechlich ausgefuehrt

| Befehl | Ergebnis |
| --- | --- |
| `.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v` | 39 Tests bestanden, Exitcode 0 |
| `cscript.exe //nologo tools\validate.js` | 1.513 Checks bestanden, 0 Fehler, 242/242 Unterklassen, Exitcode 0; Homebrew mangels Buch uebersprungen |

Die lokale Node.js-Laufzeit ist weder im PATH noch an den ueblichen
Installationspfaden vorhanden. Deshalb wurden `validate_rules.mjs --self-test`,
die portablen Node-Frontendtests und der vollstaendige Node-/WSH-Paritaetslauf
hier nicht ausgefuehrt. Auch ein GitHub-Actions-Lauf wurde in dieser Sitzung
nicht gestartet. Die Workflow-Datei ist damit noch nicht durch einen
tatsaechlichen CI-Lauf verifiziert. Fuer die Abnahme sind der
Node-Selbsttest, die Node-Suiten und – mit denselben lokalen Regeldaten – ein
Vergleich `node tools/validate_rules.mjs` gegen die oben dokumentierte
WSH-Ausgabe erforderlich. Bis diese Laeufe erfolgreich sind, ist die
plattformunabhaengige Migration implementiert, aber nicht vollstaendig
verifiziert; PR 03 sollte auf diesen Ergebnissen aufbauen.

## PR 04: Komplexe Rules Engine

Tatsaechlich ausgefuehrt am **24.10.2026**, Windows, Node **24.22.1**,
Python **3.15.1** aus `.venv`. Ausgangspunkt: `e39fe52` (PR03 in main),
vorhandener Arbeitsbranch `refactor/04-rules-engine` auf identischem Commit.
Das vorhandene ungetrackte `Microsoft/` bleibt ausserhalb der Aenderung.
Es wurden ausschliesslich bereits vorhandene lokale Regeldaten verwendet,
keine Daten heruntergeladen, generiert oder hochgeladen.

| Befehl | Vor Extraktion | Nach Extraktion | Exitcode |
| --- | --- | --- | --- |
| `node tools/validate_rules.mjs` | 1.513 Checks, 0 Fehler, 242/242 Unterklassen | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | jeweils 0 |
| `cscript.exe //nologo tools\validate.js` | 1.513 Checks, 0 Fehler, 242/242 Unterklassen | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | jeweils 0 |
| `node tools/validate_rules_core.mjs` | Neu; vor der komplexen Extraktion 172 bestanden | 172 bestanden | 0 |
| `node tools/validate_rules_engine.mjs` | Neu | 92 bestanden | 0 |
| `node tools/validate_rules_adapters.mjs` | Neu | 52 bestanden | 0 |
| `node tools/validate_server_frontend.mjs` | In PR04 vorher nicht ausgefuehrt | 26 Szenarien bestanden | 0 |
| `node tools/validate_class_loading.mjs` | In PR04 vorher nicht ausgefuehrt | 8 Szenarien und erneut 26 importierte Frontendszenarien bestanden | 0 |
| `node tools/validate_theme.mjs` | In PR04 vorher nicht ausgefuehrt | 14 Szenarien bestanden | 0 |
| `node tools/validate_rules.mjs --self-test` | In PR04 vorher nicht ausgefuehrt | Synthetischer Smoke-Test, Missing-Data-Diagnose und Fehler-Exit bestaetigt | 0 |
| `.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v` | In PR04 vorher nicht ausgefuehrt | 39 Tests bestanden | 0 |

Die 20 neuen Legacy-Assertions pruefen Aufrufzaehler an den tatsaechlich
geladenen Core-/Engine-Funktionen; die bisherigen 1.513 Assertions und deren
Erwartungswerte bleiben unveraendert. PR03 hatte den Core noch nicht in diese
Suite geladen. `Number.isNaN(Number(score))` wurde durch das aequivalente
`isNaN(Number(score))` ersetzt, damit der produktive Pfad auch im historischen
JScript-Runner laeuft. Node-/WSH-Ergebnisse stimmen auf demselben Datensatz
ueberein.

Die drei neuen datenfreien Suiten sind in den bestehenden Windows-/Ubuntu-
Workflow aufgenommen. Sie testen unter anderem negative Modifikatoren,
AC-Kandidaten statt Addition alternativer Formeln, Quellen/Overrides,
Item-/Attunement-Filter, Monk-Editionen, Kampfstyles, Kritschwellen und blockierte
Effekte. Gefrorene Engine-Eingaben pruefen die nebenwirkungsfreie Berechnung.
Die Adapter-Suite laedt die echten Browsermodule und App-Funktionen mit
synthetischen Daten. Featureliste, Startup und Redraw-Route sind dort ersetzt.
Die echte Sheet-HTML-Ausgabe und Equip-/Level-Handler werden fuer beide Editionen
geprueft. Eine absichtlich falsche Engine-AC fuehrt im isolierten Kindprozess
zum erwarteten Exitcode 1; der gesamte Adaptertest endet mit Exitcode 0.

Bekannte unterschiedliche Zauberbonus-Pfade und bestehende Sonderfaelle sind
in [RULES_ARCHITECTURE.md](../RULES_ARCHITECTURE.md) dokumentiert und bewusst beibehalten.
Keine stillschweigende Regelkorrektur, keine Aenderung von SAVE_KEYS,
JSON-Format, Backend, Lizenz, Weapon Mastery oder Extra Attack.

Grenzen: Homebrew in beiden vollstaendigen Laeufen mangels Buch uebersprungen.
Keine manuelle Browser-/PDF-/Dateipicker-Abnahme, kein neuer Live-Library-Test
und kein Linux-Lauf lokal. Die Windows-/Ubuntu-CI wird nach dem Push am PR
geprueft; ihr Ergebnis wird im abschliessenden Bericht mit dem PR verlinkt.
Die lokalen Ergebnisse oben sind keine Aussage ueber einen GitHub-Actions-Lauf.

## PR05: Character State / Serialization

Am **24.10.2026** nach dem bestaetigten Merge von PR04 (#6) auf `main`
gestartet. Basis: `f42d3ec`, Branch `refactor/05-state-serialization`.
Windows, Node 24.22.1, Python 3.15.1 aus `.venv`. Keine Downloads, Generierung
oder Commits von Regeldaten; derselbe vorhandene lokale Datensatz wie in PR04.

| Befehl | Vorher | Nachher | Exitcode |
| --- | --- | --- | --- |
| `node tools/validate_rules.mjs` | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | jeweils 0 |
| `cscript.exe //nologo tools\validate.js` | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | jeweils 0 |
| `node tools/validate_character_state.mjs` | Neu | 90 Checks bestanden | 0 |
| `node tools/validate_server_frontend.mjs` | Historisch 26 Szenarien | 37 Szenarien bestanden | 0 |
| `node tools/validate_class_loading.mjs` | Historisch 8 Szenarien | 8 bestanden, plus erneut importierte 37 Frontendszenarien | 0 |
| `node tools/validate_rules_adapters.mjs` | Historisch 52 Checks | 82 Checks bestanden | 0 |
| `node tools/validate_rules_core.mjs` | Historisch 172 Checks | 172 bestanden | 0 |
| `node tools/validate_rules_engine.mjs` | Historisch 92 Checks | 92 bestanden | 0 |
| `node tools/validate_theme.mjs` | Historisch 14 Szenarien | 14 bestanden | 0 |
| `node tools/validate_rules.mjs --self-test` | Historisch bestanden | Smoke, Missing-Data- und Failure-Exit-Probes bestanden | 0 |
| `.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v` | Historisch 39 Tests | 39 bestanden | 0 |

Historische Werte sind keine neuen Vorher-Laeufe; nur die beiden vollstaendigen
Regel-Runner wurden in diesem Auftrag vor und nach der Implementierung ausgefuehrt.
Die Gameplay-/Rules-Erwartungen bleiben unveraendert. Zwei bisherige String-Suchen
pruefen echte Serialize-/Normalize-Ergebnisse fuer Proficiency-Persistierung und
Migration. Der Python-Fixture-Test liest den verlegten Feldvertrag; die
Derived-Daten werden ueber einen separaten Testzugriff bereitgestellt.

Neue Tests decken v1-Roundtrips, sichere Zusatzfelder, Detached Snapshots,
UI-/Gameplay-Dirty-State, Fehler-/Handle-Rollback, verspätete Dateileser und
Klassenantworten sowie Rules nach Import/Reset/Level-/Charakterwechsel ab.
Keine fachliche Aenderung an Core, Engine, Flask-API oder Python-Validierung.
`server-library.js` blieb unveraendert.

Homebrew in beiden vollstaendigen Laeufen mangels Buch uebersprungen. Keine
manuelle Browser-/Dateipicker-/PDF-Pruefung und kein erneuter Live-Library-Test;
die synthetischen Harnesses ersetzen Browser-APIs und Teile des UI-Startablaufs.
Windows-/Ubuntu-CI wird am PR nach dem Push ueberwacht und im Abschlussbericht
verlinkt. Der lokale Cache `Microsoft/` bleibt ausserhalb aller Commits.

## PR06: UI-Komponenten und Rendering

Am **24.10.2026** nach bestaetigtem Merge von PR05 (#7) gestartet.
Basis `ac8431c`, Branch `refactor/06-ui-components`, PR #8. Windows,
Node 24.22.1, Python 3.15.1 aus `.venv`. Vorher/Nachher verwenden denselben
bereits vorhandenen lokalen Regeldatensatz; keine Datengenerierung oder Downloads.
Designreferenz: die vom Nutzer bereitgestellte `docs/UI_DESIGN_SPEC.md` v1.0.

| Befehl | Vorher | Nachher | Exitcode |
| --- | --- | --- | --- |
| `node tools/validate_rules.mjs` | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | jeweils 0 |
| `cscript.exe //nologo tools\validate.js` | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | 1.533 Checks, 0 Fehler, 242/242 Unterklassen | jeweils 0 |
| `node tools/validate_ui_components.mjs` | Neu | 117 Checks bestanden | 0 |
| `node tools/validate_character_state.mjs` | PR05-Referenz: 90 | 90 Checks bestanden | 0 |
| `node tools/validate_rules_core.mjs` | PR05-Referenz: 172 | 172 Checks bestanden | 0 |
| `node tools/validate_rules_engine.mjs` | PR05-Referenz: 92 | 92 Checks bestanden | 0 |
| `node tools/validate_rules_adapters.mjs` | PR05-Referenz: 82 | 82 Checks bestanden | 0 |
| `node tools/validate_server_frontend.mjs` | PR05-Referenz: 37 | 37 Szenarien bestanden | 0 |
| `node tools/validate_class_loading.mjs` | PR05-Referenz: 8 | 8 bestanden, plus erneut importierte 37 Frontendszenarien | 0 |
| `node tools/validate_theme.mjs` | PR05-Referenz: 14 | 14 Szenarien bestanden | 0 |
| `node tools/validate_rules.mjs --self-test` | PR05-Referenz: bestanden | Smoke, Missing-Data-Diagnose und Failure-Exit bestaetigt | 0 |
| `.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v` | PR05-Referenz: 39 | 39 Tests bestanden | 0 |

Nur die beiden vollstaendigen Regel-Runner wurden in diesem Auftrag als neue
Vorher-/Nachher-Laeufe ausgefuehrt; PR05-Referenzen sind historische Ergebnisse.
Alle fachlichen Legacy-Assertions bleiben erhalten. Die Module werden in den
Harnesses produktiv geladen; statische DOM-/Icon-Suchen lesen deren neue Pfade.
Gefrorene State-Tests belegen nebenwirkungsfreies Rendering und Navigation;
die frueheren HP-/Inventory-Seiteneffekte liegen an State-Uebergaengen.

Ein zusaetzlicher lokaler Vergleich mit `origin/main:js/app.js` bestaetigte
**40 identische HTML-Ausgaben**: zehn Creator-/Sheet-Ziele in vier synthetischen
Zustaenden (leer/Grundklasse, Background/Species, Level/Gear/Spells und manuelle
HP/Ressourcen/Entwuerfe/unsicherer Benutzertext). Kein Layout-/CSS-Redesign.

Die datenfreien Tests einschliesslich neuer UI-Suite bestanden in GitHub Actions
unter Windows und Ubuntu auf `64f48f5` (Run `40109949053`). Weitere Pushes werden
am PR erneut geprueft. Die lokale vollstaendige Suite wird in CI weiterhin
nicht ausgefuehrt, weil keine privaten Regeldaten hochgeladen werden.

Grenzen: Homebrew mangels lokalem Buch explizit uebersprungen. Keine manuelle
Browser-/Touch-/Dateipicker-/PDF-Abnahme und kein erneuter Live-Library-Test.
Der vorhandene Benutzerserver und dessen Charakterbibliothek wurden nicht fuer
Testschreibzugriffe verwendet. `Microsoft/` bleibt ausserhalb der Commits.
Uebergangsadapter, DOM-Host-Vertrag und PR07-Voraussetzungen stehen in
[UI_ARCHITECTURE.md](../UI_ARCHITECTURE.md).

## PR07: Mobile Library und Character Sheet

Am **24.10.2026** auf dem gemergten PR06 begonnen: Basis `faa695c`, Branch
`feature/07-mobile-library-sheet`, PR #9. Windows, Node 24.22.1,
Python 3.15.1 aus `.venv`. Derselbe vorhandene lokale Regeldatensatz wie PR06;
keine Regeldaten heruntergeladen, generiert oder hochgeladen.

| Pruefung | Vorher | Nachher | Ergebnis |
| --- | --- | --- | --- |
| `node tools/validate_rules.mjs` | 1.533 Checks, 242/242 Unterklassen | 1.533 Checks, 242/242 Unterklassen | 0 Fehler, Exit 0 |
| `cscript.exe //nologo tools\validate.js` | 1.533 Checks, 242/242 Unterklassen | 1.533 Checks, 242/242 Unterklassen | 0 Fehler, Exit 0 |
| `node tools/validate_mobile_ui.mjs` | neu | 93 Checks | bestanden |
| `node tools/browser/mobile.mjs` | neu | 1.066 Checks, 28 Browser/Theme/Viewport-Kombinationen | bestanden |
| `node tools/validate_ui_components.mjs` | PR06: 117 | 117 Checks | bestanden |
| Character State / Rules Core / Rules Engine | PR06: 90 / 172 / 92 | 90 / 172 / 92 Checks | bestanden |
| Rules-Adapter | PR06: 82 | 82 Checks | bestanden |
| Frontend / Klassenladen / Theme | PR06: 37 / 8 / 14 | 37 / 8 / 14 Szenarien | bestanden |
| `node tools/validate_rules.mjs --self-test` | PR06: bestanden | Smoke, Missing-Data-Diagnose, Failure-Exit | bestanden |
| Python `-m unittest discover -s server -t . -v` | PR06: 39 | 39 Tests | bestanden |

Nur die beiden vollstaendigen Regel-Runner wurden hier als neue Vorher-/Nachher-
Laeufe ausgefuehrt; die mit PR06 markierten Werte sind historische Referenzen.
Die Klassenlade-Suite fuehrt beim Harness-Import die 37 Frontendszenarien erneut aus.
Saemtliche fachlichen Assertions bleiben erhalten. Die DOM-Fixtures erhielten
`setAttribute`; der neue mobile Harness zusaetzlich Focus-/Close-/Move-Semantik.

Browser: Playwright **1.64.1**, Chromium und WebKit headless auf Windows,
jeweils Dark und Light, Viewports 320x700, 375x812, 390x844, 430x932, 768x1024,
1024x768 und 1440x900. Die 1.066 Checks umfassen Ueberlauf, sichtbare 44-px-
Controls, Text-/Button-Kontraste, Dialogfokus/Back, Sections, Suche/Gradfilter,
Busy-/Offline-/Konfliktzustaende, Delete/Cancel, lokale JSON-Dateien und
Persistenz von HP, Slots, Equip und Attunement nach Save und Reload.
Die Builder-Probe vergleicht bestehende Control-Styles mit aktivem/deaktiviertem
Mobile-CSS; 2014- und 2024-Erstellung bleiben erreichbar. Sie deckte eine
geerbte Textfarbe in WebKit auf, die anschliessend enger begrenzt wurde.

Zentrale synthetische Screenshots wurden lokal visuell geprueft, darunter
Library, Overview, Skills, Combat, Spells und Inventory in beiden Themes.
Die Pruefung fuehrte zu einem kompakteren Kopf und gestapelten Angriffszeilen.
Artefakte bleiben im ignorierten Browser-Artefaktordner. Die CI ergaenzt die
93 schnellen Tests auf Windows/Ubuntu und einen separaten Linux-Browserjob;
der finale Checkstatus wird am PR ueberwacht.
Run `40119233326` auf `874eaac` bestand mit allen drei Jobs; auch unter Linux
meldete die Browsermatrix 1.066 erfolgreiche Checks. Ein zuvor nur dort sichtbarer
3-px-Ueberlauf bei 320 px wurde durch flexible Kopfzeilenbreite behoben.

Grenzen: keine echten Android-/iPhone-Geraete, kein Screenreader-/Software-
tastaturtest, kein nativer Dateipicker-/PDF-Dialogtest. Die halbierte Desktop-
CSS-Breite prueft Reflow, keinen vollstaendigen echten Textzoom. Browser-API-
Persistenz ist synthetisch; reale Backend-Speicherung wird durch die 39
Python-Tests abgedeckt. Kein erneuter Live-Library-Lauf gegen Flask.
Homebrew wurde mangels lokalem Buch in der vollstaendigen Suite explizit
uebersprungen. Der Nutzerserver und seine Charakterdateien wurden nicht fuer
Testschreibzugriffe verwendet. `Microsoft/` bleibt ausserhalb der Commits.
Anleitung, Scope PR08/PR09 und Einschraenkungen: [MOBILE_UI.md](../MOBILE_UI.md).
