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
