# Charakterdateien, Backups und Wiederherstellung

Einrichtung/Start: [DEVELOPMENT.md](../DEVELOPMENT.md#normaler-start);
API-Vertrag: [server/README.md](../server/README.md). Diese Anleitung beschreibt
administrative Eingriffe; Tests nur nach [TESTING.md](TESTING.md#isolierter-live-test).

Der Speicher liegt standardmaessig unter
`%USERPROFILE%\.character-manager\characters`. `CC_CHARACTER_STORAGE` kann
einen anderen privaten Ordner ausserhalb des Repositories bestimmen.
Backups und Papierkorb liegen **innerhalb dieses privaten Speicherordners**:

```text
characters/
  {id}.json
  .library.lock
  backups/{id}.r{revision}.{UTC-Zeit}.{Archiv-UUID}.json
  trash/{id}.r{revision}.{UTC-Zeit}.{Archiv-UUID}.json
```

Archivdateien enthalten die vollstaendige urspruengliche Huelle einschliesslich
ID, Revision, Aenderungsdatum und unveraendertem Charakterobjekt. Der Dateiname
enthaelt zusaetzlich Sicherungs- bzw. Loeschzeit und eine neue UUID.
Archive sind ueber die Webanwendung nicht erreichbar und erscheinen nicht in
der Bibliothek. JSON-Dateien, Backups, Papierkorb und lokale Speicherordner
werden durch `.gitignore` ausgeschlossen; den Staging-Diff trotzdem pruefen.

## Schreiben und Loeschen

Vor jedem PUT wird die aktuelle Datei validiert und in `backups/` gesichert.
Die Sicherung wird vollstaendig geschrieben, geflusht, mit `fsync` gesichert
und atomar umbenannt, bevor die aktive Datei ersetzt wird. Scheitert das Backup,
bleibt der aktive Stand unveraendert und die API antwortet mit 500. Scheitert
nur das aktive Ersetzen, bleiben alter Stand und Backup erhalten. Ein bereits
identisches Backup derselben Revision wird wiederverwendet.

`DELETE /api/characters/{id}` erfordert wie PUT `If-Match: "revision"`.
Erfolg: 200 mit `{id, revision, deleted: true}`. Fehlende Vorbedingung: 428,
ungueltiger Header: 400, fehlende ID: 404, veraltete Revision: 409. Die aktive,
validierte Datei wird unter derselben Dateisperre atomar in `trash/` verschoben.
Ein fehlgeschlagenes Verschieben laesst sie am bisherigen Ort. Es gibt keine
endgueltige Loesch- oder Restore-API.

Die Sperre umfasst Lesen, Revisionspruefung, Backup und Mutation, auch zwischen
getrennten Prozessen. UUID-Pfade werden ausschliesslich vom Server abgeleitet.
Symlinks, Junction-Ausbrueche und Hardlinks auf Speicherdateien werden abgewiesen.
Anfragen aus fremden Browser-Herkunften duerfen die Bibliothek nicht veraendern.

## Aufbewahrung

Vor dem Start optional in PowerShell setzen:

```powershell
$env:CC_CHARACTER_BACKUP_COUNT = "10"
# Nur setzen, wenn geloeschte Charaktere nach dieser Frist verfallen sollen:
$env:CC_CHARACTER_TRASH_DAYS = "90"
.\.venv\Scripts\python.exe -m server.app
```

Standard: **10 vorherige Versionen je Charakter**, konfigurierbar von 1 bis
1000. **Der Papierkorb laeuft standardmaessig nicht ab.** Die optionale Frist
muss mindestens einen Tag betragen. Bereinigung erfolgt bei erfolgreichen
Updates/Loeschungen, nicht durch einen Hintergrunddienst. Fuer den Papierkorb
zaehlt die Loeschzeit im Archivnamen, nicht das urspruengliche Aenderungsdatum.
Ein Bereinigungsfehler wird im Backend protokolliert; eine bereits erfolgreiche
Speicherung wird dadurch nicht nachtraeglich als fehlgeschlagen gemeldet.
Bis zur Fehlerbehebung kann mehr als die konfigurierte Anzahl erhalten bleiben.

## Manuell wiederherstellen

1. Flask mit `Strg+C` stoppen und betroffene Browser-Tabs schliessen.
2. Gewuenschte Datei in `trash/` oder `backups/` anhand ID, Revision und Uhrzeit
   auswaehlen. Vor administrativen Eingriffen den gesamten Speicher sichern.
3. Im Repository-Stamm denselben Speicherpfad wie beim Server setzen, dann:

```powershell
$env:CC_CHARACTER_STORAGE = "C:\DND-local\character-library"
.\.venv\Scripts\python.exe -m server.restore "ID.r1.ZEIT.ARCHIV-UUID.json"
# Fuer ein Archiv aus backups/:
.\.venv\Scripts\python.exe -m server.restore --from backups "ID.r1.ZEIT.ARCHIV-UUID.json"
```

Die Platzhalter durch den **exakten Dateinamen ohne Verzeichnispfad** ersetzen.
Bei Nutzung des Standardspeichers die Umgebungsvariable nicht setzen. Der Befehl
prueft das Archiv, behaelt die Charakter-ID bei und schreibt eine neue aktive
Datei mit einer Revision oberhalb der noch vorhandenen Archivrevisionen. Das
Archiv bleibt erhalten. Eine bereits existierende aktive ID wird **niemals
ueberschrieben**: diese zuerst separat sichern und administrativ aus dem aktiven
Speicher nehmen, falls bewusst eine aeltere Version wiederhergestellt werden soll.
Danach Server starten und Browser neu laden. Alte Tabs nicht weiterverwenden,
insbesondere wenn zwischenzeitlich Archivhistorie bereinigt wurde.

## Beschaedigte Dateien und Grenzen

Unvollstaendige temporaere `.character-*.tmp`-Dateien werden nicht aufgelistet
oder wiederhergestellt. Bei beschaedigten aktiven Dateien melden Lesen, Liste,
Update und Loeschen einen Speicherfehler. Sie werden nicht stillschweigend
ueberschrieben, geloescht oder repariert. Betroffene Datei separat sichern,
serverseitiges Fehlerprotokoll pruefen und ein bekannt gutes Archiv verwenden.
Auch beschaedigte Archive werden nicht automatisch geloescht; sie koennen die
Aufbewahrungsbereinigung oder Wiederherstellung blockieren und muessen vom
Administrator untersucht werden. Interne Pfade erscheinen im Backend-Protokoll,
nicht in API-Fehlerantworten.

Dies ist eine lokale Versionssicherung, **kein externes Backup**. Bei Verlust
des Datentraegers gehen aktive Dateien und Archive zusammen verloren.
Netzlaufwerke und Stromausfaelle sind nicht garantiert abgesichert; nach einem
Prozessabbruch kann ein zusaetzliches Backup oder eine temporaere Datei bleiben.
Der Papierkorb kann ohne Frist unbegrenzt wachsen. Deshalb freien Speicher und
Serverprotokolle pruefen und den privaten Speicher regelmaessig extern sichern.

Alle Nutzer der Bibliothek duerfen alle Charaktere bearbeiten und loeschen.
Es gibt keine Authentifizierung. Der dokumentierte Entwicklungsserver bleibt
auf `127.0.0.1` beschränkt; eine LAN-/Internet-/Raspberry-Pi-Bereitstellung ist
nicht geprüft und gehört nicht zu dieser Anleitung.
