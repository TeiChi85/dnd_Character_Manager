# Gemeinsame Charakterbibliothek – Frontend (Phase 3)

Phase 4 erweitert diese Bedienung um den Loeschdialog, globale Darstellung und
Backups: [aktuelle Anleitung](PHASE4.md).

Die Startseite zeigt neben den bisherigen lokalen Dateien eine **Shared character
library**. Die Eintraege sind nach Aenderungsdatum sortiert, neueste zuerst,
mit Name, Klasse, Level, Edition und lokal dargestellter Uhrzeit. **Refresh**
liest die Liste erneut. Die Bibliothek verwendet dieselbe Herkunft und denselben
Port wie die geoeffnete Anwendung; es gibt keine fest eingebaute externe Adresse.

## Windows 11: Starten

PowerShell im Repository-Stamm, mit installiertem Python 3.10 oder neuer:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server\requirements.txt
.\.venv\Scripts\python.exe -m server.app
```

Bei bereits eingerichteter `.venv` reicht der letzte Befehl. Browser:
<http://127.0.0.1:8000/>. Nach einem Codewechsel Server bei Bedarf mit `Strg+C`
beenden, neu starten und im Browser `Strg+F5` verwenden. Einen alten
`http.server` auf Port 8000 vorher beenden: dieser bietet keine Speicher-API.
Falls `py -3` keine Installation findet, fuer `venv` den vollen Pfad zu einem
installierten Python verwenden. Eine vorhandene `.venv` laesst sich direkt wie
oben starten; keine PowerShell-Aktivierung notwendig.

Optional vor dem Start im selben Fenster einen eigenen privaten Speicher setzen:

```powershell
$env:CC_CHARACTER_STORAGE = "C:\DND-local\character-library"
.\.venv\Scripts\python.exe -m server.app
```

Standard: `%USERPROFILE%\.character-manager\characters`, ausserhalb des
Repositories. Der Speicherordner wird automatisch angelegt. Vollstaendige
API- und Speicherbeschreibung: [server/README.md](../server/README.md).

## Bedienung und manuelle Abnahme

1. Einen synthetischen Charakter erstellen, z. B. mit Namen `Library Test`.
   **Save to Server** legt ihn mit einer neuen Server-ID an. Danach erscheint
   `Saved to server.`. Derselbe Knopf aktualisiert diesen Eintrag bei spaeteren
   Aenderungen. Auch ein noch nicht fertig erstellter Charakter kann gespeichert
   werden; wie im Backend sind SAVE_KEYS-Felder optional.
2. Ueber das Menue zur **Start Page** wechseln. Der neue Eintrag erscheint in der
   Bibliothek. Anklicken stellt den Charakter wieder her. Klasse, Unterklasse,
   Level, Auswahlwerte, Ausruestung, Zauber, HP und Ressourcen pruefen.
3. Den geladenen Charakter bearbeiten und **Save to Server** waehlen. Zur
   Startseite zurueckkehren und erneut oeffnen: die Aenderung muss erhalten sein.
4. **Save as New on Server** erzeugt eine zweite UUID-Datei. Ab dann bezieht sich
   **Save to Server** auf diese neue Kopie. Beide Eintraege bleiben in der Liste.
5. Fuer einen Konflikttest denselben Eintrag in zwei Tabs laden. In Tab A etwas
   aendern und speichern, dann in Tab B etwas aendern und speichern. Tab B muss
   einen Konflikt melden, waehrend seine eigenen Aenderungen erhalten bleiben.
   **Reload server version** laedt nach Bestaetigung des Verwerfens den Stand
   aus A; **Save as New on Server** bewahrt B unter einer neuen ID auf.
6. Mit ungespeicherten Aenderungen zur Startseite wechseln: **Abbrechen** muss
   den aktuellen Charakter behalten. Auch beim Schliessen/Neuladen der Seite
   fordert der Browser normalerweise eine Bestaetigung an.
7. Den bisherigen lokalen Save-Knopf benutzen und die exportierte JSON-Datei
   ausserhalb des Repositories speichern. Danach ueber **Load a saved character**
   wieder importieren. Lokale Recents, Dateiauswahl, Ueberschreibabfrage und
   Download-Fallback bleiben verfuegbar. Ein lokaler Import oder neuer Charakter
   vergisst die vorherige Server-ID; sein naechster Server-Save ist ein POST.
8. Zum Ausfalltest Flask mit `Strg+C` beenden und im noch geoeffneten Tab
   **Refresh** oder **Save to Server** ausloesen. Es erscheint eine verstaendliche
   Fehlermeldung; der aktuelle Charakter bleibt erhalten. Danach Flask erneut
   starten und die Liste bewusst aktualisieren.

## Schutz vor Datenverlust

ID und Revision liegen nur im Arbeitsspeicher neben dem Charakterzustand, nie
im JSON-Export. Ein PUT sendet den zuletzt bestaetigten Revisionswert als
`If-Match`. HTTP 409 loest keine automatische Ersetzung und keinen Retry aus.
Auch fehlgeschlagene POSTs werden nicht wiederholt. Bei Netzwerkausfaellen kann
eine Schreibanfrage den Server bereits erreicht haben: vor einem erneuten
Speicherversuch die Bibliothek pruefen, um unbeabsichtigte Duplikate zu vermeiden.

Waehrend Server-Operationen sind die Speicheraktionen gesperrt und ein
Charakterwechsel wird verhindert. Bearbeitungen bleiben moeglich: Aenderungen
waehrend eines Speichervorgangs gelten danach weiterhin als ungespeichert.
Entstehen Aenderungen waehrend des Ladens, wird erneut vor dem Ersetzen gefragt.
HTTP-Anfragen brechen nach 20 Sekunden ab, fehlende Feature-Dateien nach
15 Sekunden. Beim Laden fehlender/ungueltiger Daten bleibt der aktuelle Stand
erhalten. Bekannte Felder und verschachtelte Standardwerte werden auf einem
frischen Charakter wiederhergestellt, damit alte Exporte nichts vom vorherigen
Charakter uebernehmen. Ein Fehler beim Wiederherstellen setzt den alten Stand
zurueck. Servertexte in der Bibliothek werden als Textknoten dargestellt;
Server-Portraits sind auf PNG-Data-URLs beschraenkt.

## Tests und Grenzen

```powershell
.\.venv\Scripts\python.exe -m unittest server.test_api -v
cscript.exe //nologo tools\validate.js
node tools\validate_server_frontend.mjs
```

Der letzte Befehl benoetigt eine aktuelle Node-Laufzeit (Node 18 oder neuer),
aber keine npm-Pakete. Node wird nur fuer diesen neuen Testlauf benoetigt,
nicht fuer den Start oder die Benutzung der Anwendung. Der Test fuehrt die
tatsaechlichen Browser-Skripte mit synthetischem DOM und HTTP-Mock aus. Die
Regeldatenpopulation und das Rendern der Charakterberechnungen sind dort
ausgeklammert; dafuer dient weiterhin die unveraenderte Windows-JScript-Suite.
Tatsaechliche Ergebnisse: [server/TEST_RESULTS.md](../server/TEST_RESULTS.md).

Direktes Oeffnen per `file://` und der reine Python-Dateiserver unterstuetzen
weiterhin lokale Dateien, aber keine gemeinsame Serverbibliothek. Eine aktuelle
Browser-Version mit Fetch, Promise und AbortController wird fuer die API
benoetigt. Die Schutzabfrage vergleicht den Zustand mit dem letzten Laden oder
Server-Speichern: nach rein lokalem Speichern kann sie vorsichtshalber weiterhin
erscheinen. Browser koennen `beforeunload`-Dialoge unterdruecken; es gibt kein
Autosave und keine Wiederherstellung nach Browserabsturz.

Keine Konten, Rechteverwaltung, Datenbank, Autosave oder
Raspberry-Pi-Bereitstellung. Der Server bleibt auf Loopback beschraenkt.
Regeldaten und private Charaktere bleiben lokal; Tests und Screenshots werden
nicht als Charakterdateien oder Datensaetze ins Repository aufgenommen.
