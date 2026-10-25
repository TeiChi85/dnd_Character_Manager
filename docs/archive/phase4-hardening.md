> **Historischer Stand – archiviert.** Der folgende Inhalt bleibt als damaliger
> Plan bzw. Prüfnachweis erhalten, ist keine aktuelle Betriebsanleitung und
> keine pauschale Aussage zum heutigen Teststatus. Überholte Serializer-,
> Scope- und Phasenaussagen sind historisch zu lesen. Aktuell maßgeblich:
> [Einrichtung](../../DEVELOPMENT.md), [Prüfungen](../TESTING.md),
> [State-Vertrag](../CHARACTER_STATE.md), [Architektur](../ARCHITECTURE.md).

# Phase 4 – Bedienung, Sicherheit und Zuverlaessigkeit

Geaenderte Dateien dieser Phase:

| Bereich | Dateien |
| --- | --- |
| Backend | `server/app.py`, `server/storage.py`, `server/validation.py`, `server/restore.py` |
| Frontend | `js/app.js`, `js/server-library.js`, `js/character-validation.js`, `js/theme.js`, `css/styles.css` |
| Seiten | `index.html`, `classes.html`, `races.html`, `spells.html`, `items.html`, `feats.html`, `creatures.html` |
| Tests | `server/test_hardening.py`, `tools/validate.js`, `tools/validate_server_frontend.mjs`, `tools/validate_theme.mjs`, `tools/validate_live_library.mjs` |
| Dokumentation/Ignore | `.gitignore`, `README.md`, `DEVELOPMENT.md`, `server/README.md`, `server/TEST_RESULTS.md`, `docs/SERVER_LIBRARY.md`, `docs/PHASE4.md`, `docs/THEME.md`, `docs/STORAGE_RECOVERY.md` |

## Windows-Start und manuelle Abnahme

Im Repository-Stamm (vorhandene `.venv`):

```powershell
.\.venv\Scripts\python.exe -m pip install -r server\requirements.txt
.\.venv\Scripts\python.exe -m server.app
```

Dann <http://127.0.0.1:8000/> oeffnen und nach Codewechsel `Strg+F5` verwenden.
Bei einer neuen Installation vorher `py -3 -m venv .venv` ausfuehren. Der Server
bindet weiterhin ausschliesslich an `127.0.0.1:8000`. Lokales Oeffnen per
`file://` erlaubt weiterhin JSON-Import/-Export und die Theme-Auswahl; fuer die
gemeinsame Bibliothek ist Flask notwendig.

**Loeschen:** Einen synthetischen Charakter speichern und zur Startseite
wechseln. Der Papierkorb rechts am Eintrag oeffnet einen Dialog mit dessen
Namen. Zuerst **Cancel**, Escape und das Schliesskreuz testen: der Eintrag muss
bleiben. Danach **Delete Character** bestaetigen: er verschwindet aus der Liste,
und eine Erfolgsmeldung bestaetigt die Verschiebung in den privaten Papierkorb.
Das Papierkorbsymbol darf den Charakter nicht gleichzeitig oeffnen.

**Konflikt:** Liste in Tab A laden, denselben Charakter in Tab B bearbeiten und
speichern. Der alte Loeschversuch in A muss mit einem Revisionskonflikt abbrechen.
**Refresh** aktualisiert die Liste; ein neuer Versuch benoetigt einen neuen
ausdruecklich bestaetigten Dialog. Bei Netz- oder Speicherfehlern bleibt der
bisherige Eintrag sichtbar. Die Liste wird nicht als Beleg einer erfolgreichen
Loeschung behandelt, solange keine gueltige Antwort vorliegt. Nach einem
Verbindungsabbruch zuerst Refresh waehlen: der Server kann die Anfrage bereits
abgeschlossen haben. Es gibt keine automatischen Schreibwiederholungen.

**Dark Mode:** Den stets oben rechts sichtbaren Schalter auf Startseite,
Bibliothek, jedem Creator-Schritt, Bogen und den sechs Referenzseiten pruefen.
Seite neu laden und Browser neu starten. Einen alten Charakter mit einem
entgegengesetzten `sheet.dark` importieren: die persoenliche Darstellung muss
erhalten bleiben. Weitere Details: [THEME.md](../UI_ARCHITECTURE.md#theme).

**Lokale Dateien:** Einen Charakter lokal exportieren und wieder importieren,
auch bei gestopptem Flask-Server. Daten muessen erhalten bleiben; Server-ID,
Revision und die globale Theme-Auswahl werden nicht in den Export eingefuegt.
Mit einem ungespeicherten Charakter die Startseite wechseln und Abbrechen
waehlen: der aktuelle Stand muss erhalten bleiben.

## Validierung und sichere Darstellung

Backend und Frontend pruefen Formatmarker `_app: "dnd-cc"` und `_v: 1`,
bekannte Feldtypen, Editionswerte `classic`, `one` oder `null`, Klasse als
Textreferenz, Level 1..20 und verschachtelte Container. Es erfolgt keine
Regelberechnung oder Pruefung gegen urheberrechtliche Regeldaten. SAVE_KEYS
bleiben fuer alte Exporte optional. Fehlende Felder werden beim Laden auf einem
frischen Charakter mit Standardwerten ergaenzt. Unbekannte Erweiterungsfelder
werden vom Backend erhalten; der bestehende Frontend-Export bleibt auf SAVE_KEYS
beschraenkt.

Grenzen: **2 MiB** Anfrage/Datei, **200 UTF-16-Einheiten** fuer Charakterlabels
und JSON-Schluessel, **65.536** fuer sonstige Strings, **2.000** Eintraege je
Array/Objekt, **50.000** Werte insgesamt und **64** Verschachtelungsebenen.
Portraets duerfen bis zum Gesamtlimit reichen, ausschliesslich als PNG-Data-URL.
Zahlen muessen endlich und betragsmaessig hoechstens `1e12` sein; typische
numerische Formularwerte als Strings und optionale Ausruestungswerte als `null`
bleiben kompatibel. Doppelte Schluessel, ungueltiges Unicode, unsichere
Prototyp-Schluessel und manipulierte numerische Attribute werden abgewiesen.
API-Antworten, Server- und lokale Dateiimporte werden vor der Uebernahme geprueft.

Bibliotheksnamen, Dialogtexte und Statusmeldungen verwenden Textknoten.
Portraets sind keine frei waehlbaren URLs. Die kontrollierte Regeltag-Darstellung
bleibt erhalten; eingebrachte Texte werden zuvor escaped. Auch dynamische
Inventarmengen und die Entry-Felder `count`/`attributes` werden escaped.
Fehlerantworten nennen keine internen Speicherpfade; technische Details stehen
in den Backend-Protokollen.

## Backups und manuelle Wiederherstellung

Standardordner: `%USERPROFILE%\.character-manager\characters`. Darin liegen
aktive UUID-Dateien, `backups/` mit standardmaessig zehn vorherigen Versionen je
Charakter und `trash/` ohne automatische Ablaufzeit. Vor dem Start sind
`CC_CHARACTER_STORAGE`, `CC_CHARACTER_BACKUP_COUNT` und optional
`CC_CHARACTER_TRASH_DAYS` konfigurierbar. Ein Backup-Fehler verhindert das Update.
Eine fehlgeschlagene Papierkorbverschiebung laesst die aktive Datei erhalten.

Fuer die Wiederherstellung Server stoppen, Browser-Tabs schliessen und den
exakten Archivnamen auswaehlen. Im selben konfigurierten Speicher:

```powershell
.\.venv\Scripts\python.exe -m server.restore "ID.r3.ZEIT.ARCHIV-UUID.json"
# Alternativ ein Backup aus backups/:
.\.venv\Scripts\python.exe -m server.restore --from backups "ID.r2.ZEIT.ARCHIV-UUID.json"
```

Platzhalter ersetzen; keine Pfade als Dateiname angeben. Der Befehl validiert
das Archiv und dessen Identitaet, erhaelt die urspruengliche ID und setzt eine
hoehere Revision. Ein vorhandener aktiver Charakter wird nicht ueberschrieben.
Vollstaendige Anleitung, Aufbewahrungsregeln und Behandlung beschaedigter Dateien:
[STORAGE_RECOVERY.md](../STORAGE_RECOVERY.md).

## Tests

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v
cscript.exe //nologo tools\validate.js
node tools\validate_server_frontend.mjs
node tools\validate_theme.mjs
```

Die Node-Tests benoetigen Node 18+ ohne npm-Pakete; die Anwendung selbst nicht.
Optional: Flask mit einem **separaten Test-Speicher** auf Port 8001 starten,
dann `node tools\validate_live_library.mjs` ausfuehren. Dieser Test verwendet
die echten HTTP-Endpunkte und verschiebt nur die von ihm selbst angelegten IDs
in den Papierkorb. Er hinterlaesst deren Archive im Test-Speicher. DOM und
Charakter-Rendering sind dabei simuliert. Ergebnisse und nicht ausgefuehrte
Pruefungen stehen in [server/TEST_RESULTS.md](server-test-results-phase-a-4.md).

## Grenzen und Raspberry Pi

Alle Spieler duerfen alle Charaktere ansehen, bearbeiten und loeschen.
Es gibt weiterhin keine Konten, Rollen, Eigentuemerdaten oder Authentifizierung.
Ein spaeterer Netzwerkbetrieb ist nur fuer ein vertrauenswuerdiges Netzwerk
gedacht. Loopback-Bindung und Host-Pruefung sind jetzt bewusst unveraendert;
die Anwendung wird in dieser Phase nicht im LAN oder Internet freigegeben.

Die Dateiversionen sind kein Ersatz fuer ein Backup auf einem anderen
Datentraeger. Unbegrenzter Papierkorb und fehlgeschlagene Bereinigung koennen
Speicher verbrauchen; Protokolle und freien Speicher pruefen. Lokale atomare
Umbenennungen und `fsync` sichern keine vollstaendige Stromausfallfestigkeit zu.
Netzlaufwerke, Linux-Sperre, ARM und Pi 3B wurden nicht geprueft.

Phase 4 verbessert die Grundlage, ist aber **noch keine gepruefte Pi-
Bereitstellung**. Vor deren Freigabe bleiben mindestens reale Browser-/Mobil-
Sichtpruefung, Linux/ARM-Tests, Produktionsserver-/Startkonfiguration, Netz- und
externe Backup-Strategie zu erledigen. Kein Docker, keine Datenbank und kein
Autosave wurden eingefuehrt.
