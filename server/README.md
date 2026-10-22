# Lokale Charakterbibliothek – MVP 1, Phase A

Optionales Flask-Backend fuer die bestehende statische Anwendung. Keine
Frontend-Anbindung, Benutzerkonten, Datenbank oder Pi-Bereitstellung. Die
Charaktererstellung, Berechnungen sowie JSON-Import und -Export bleiben unveraendert.
Zum reinen Offline-Betrieb ist Flask weiterhin nicht erforderlich.

## Windows 11: Start

Im Repository-Stamm mit installiertem Python **3.10 oder neuer** in PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server\requirements.txt
.\.venv\Scripts\python.exe -m server.app
```

Aufruf: <http://127.0.0.1:8000/>. Beenden mit `Strg+C`. Keine Aktivierung der
virtuellen Umgebung und keine Aenderung der PowerShell-Ausfuehrungsrichtlinie
noetig. Der Einstiegspunkt bindet ausschliesslich an `127.0.0.1:8000`, ohne
Debugger und Reloader. Alternativ fuer einen anderen lokalen Port:

```powershell
.\.venv\Scripts\python.exe -m flask --app server.app:create_app run --host 127.0.0.1 --port 8001
```

Wenn `py -3` keine Installation findet, einen installierten Python-Interpreter
mit vollem Pfad fuer den ersten Befehl verwenden. Der Windows-Launcher allein
ist noch keine Python-Installation.

Standard-Speicherort: `Path.home() / ".character-manager" / "characters"`,
unter Windows normalerweise `%USERPROFILE%\.character-manager\characters`.
Vor dem Start optional in demselben PowerShell-Fenster setzen:

```powershell
$env:CC_CHARACTER_STORAGE = "C:\DND-local\character-library"
.\.venv\Scripts\python.exe -m server.app
```

Der Ordner wird automatisch angelegt und muss beschreibbar sein. Speicherorte
innerhalb des Repositories werden auch bei aufgeloesten Symlinks abgewiesen.
Niemals den privaten Speicherordner ueber einen anderen Dateiserver freigeben.
Ein bestehender `http.server` auf Port 8000 muss vor dem Flask-Start beendet
werden. Die Oberflaeche benoetigt weiterhin die separat lokal generierten
Regeldaten; API und synthetische Tests benoetigen sie nicht.

## Exportformat und Validierung

`serializeChar()` in `js/app.js` schreibt ein Objekt mit `_app: "dnd-cc"`,
`_v: 1` und den 27 Feldern aus `SAVE_KEYS`. `loadCharObj()` uebernimmt nur
vorhandene SAVE_KEYS und ergaenzt unter anderem fehlende Sheet-Standardwerte.
Darum bleiben diese Felder in der API optional; ein aelterer Export wird nicht
durch neue Pflichtfelder unbrauchbar. Ein Test vergleicht die synthetische
Testfigur mit der tatsaechlichen SAVE_KEYS-Liste.

Die API prueft Objektwurzel, App-Marker, ganzzahlige Formatversion 1 und die
Grundtypen vorhandener bekannter Felder; `level` muss, wenn vorhanden, eine
Ganzzahl von 1 bis 20 sein. Verschachtelte Inhalte werden ohne Regelpruefung
aufbewahrt. Unbekannte Erweiterungsfelder bleiben erhalten. Keine Migration,
Neuberechnung oder Normalisierung des Charakters. Die API ersetzt keine
vollstaendige fachliche Validierung durch die Charakteranwendung.

Nur UTF-8-JSON mit JSON-Content-Type; doppelte Schluessel, nicht endliche Zahlen
und Verschachtelung ueber 64 Ebenen werden abgewiesen. Standardlimit:
**2 MiB (2.097.152 Bytes)** pro Anfrage, einschliesslich Portrait. Auch die
kanonische ASCII-JSON-Darstellung des Charakters darf dieses Limit nicht
ueberschreiten. Die kleine Metadatenhuelle kommt auf der Platte hinzu.
`create_app({...})` erlaubt fuer lokale Einbettung/Tests eine andere
`MAX_CONTENT_LENGTH`; der dokumentierte Start verwendet das Standardlimit.

## API

POST und PUT erhalten **direkt das bisherige Exportobjekt**, keine Huelle.
Die Antwort und die gespeicherte UUID-Datei verwenden folgende Huelle:

```javascript
{
  "id": "server-generated-uuid",
  "updated_at": "2026-10-22T12:00:00+00:00",
  "revision": 1,
  "character": {"_app": "dnd-cc", "_v": 1, "name": "Synthetic Test"}
}
```

`character` bleibt das originale Exportobjekt. Fuer den bestehenden Import
ausschliesslich dieses Unterobjekt als JSON verwenden. ID und Revision werden
vom Server verwaltet; `updated_at` ist ein UTC-Zeitstempel. Es gibt noch keinen
API-Aufruf im Frontend.

| Methode | Pfad | Verhalten |
| --- | --- | --- |
| GET | `/api/characters` | `200`, `{ "characters": [...] }`; pro Eintrag ID, Zeit, Revision, Name, Edition, Klasse und Level, ohne Charakterdetails/Portrait |
| GET | `/api/characters/{id}` | `200`, vollstaendige Huelle und `ETag: "1"` |
| POST | `/api/characters` | `201`, neue UUID und Revision 1; Huelle, ETag und Location in der Antwort |
| PUT | `/api/characters/{id}` | Vollstaendiger Ersatz des Exportobjekts; erfordert `If-Match: "1"`; `200` mit erhoehter Revision und aktuellem ETag |

Ein PUT verwendet die zuletzt gelesene Revision als gequoteten If-Match-Wert.
Fehlt der Header: **428**. Ungueltiger Header: **400**. Veraltete Revision:
**409** mit `current_revision`; der gespeicherte Stand bleibt unveraendert.
Der Client muss dann erneut laden und den Konflikt aufloesen. Ein PUT legt
keine neue ID an. Gleiche Charakternamen sind erlaubt.

Weitere Fehler: **400** bei ungueltigem JSON/Format, **404** bei unbekannter oder
ungueltiger UUID, **413** bei Groessenueberschreitung, **415** bei falschem
Content-Type, **503** bei Sperrzeitueberschreitung (nach fuenf Sekunden), **500**
bei Speicherfehlern oder beschaedigten Dateien. Fehlerantworten sind JSON und
enthalten keine internen Dateipfade. API-Antworten verwenden `Cache-Control:
no-store`. Bei beschaedigtem Speicher wird auch die Liste mit Fehler beendet,
anstatt Eintraege stillschweigend wegzulassen.

Beispiel ausschliesslich mit synthetischen Daten:

```powershell
$uri = "http://127.0.0.1:8000/api/characters"
$body = @{ _app = "dnd-cc"; _v = 1; name = "Synthetic Test"; level = 1 } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $body
Invoke-RestMethod -Uri $uri
$loaded = Invoke-RestMethod -Uri "$uri/$($created.id)"
$loaded.character.name = "Updated Synthetic"
$body = $loaded.character | ConvertTo-Json -Depth 64
$headers = @{ "If-Match" = ('"{0}"' -f $loaded.revision) }
Invoke-RestMethod -Method Put -Uri "$uri/$($created.id)" -Headers $headers -ContentType "application/json" -Body $body
```

## Dateien, Nebenlaeufigkeit und Grenzen

Jeder Charakter liegt in genau einer `{uuid}.json`-Datei. Eine permanente
`.library.lock` serialisiert Lesen und Schreiben auch zwischen getrennten
Prozessen auf demselben lokalen Speicher: `msvcrt` unter Windows, `flock` unter
Unix. Revisionspruefung und Ersetzung liegen in derselben Sperre. Schreiben
erfolgt in eine temporaere Datei im Speicherordner, mit Flush und `fsync`, dann
`os.replace`. Bei einem fehlgeschlagenen Ersetzen bleibt der alte Stand erhalten.
Bei einem Prozessabbruch kann eine `.character-*.tmp` zurueckbleiben; diese wird
nicht aufgelistet. Keine Garantie fuer Netzlaufwerke, Stromausfallfestigkeit
oder Wiederherstellung; keine Backups oder Versionshistorie implementiert.

Flask liefert nur die vorhandenen sieben HTML-Einstiegsseiten sowie CSS, JS und
Bildressourcen unter `css/`, `js/`, `resources/` aus, inklusive lokal generierter
JS-Regeldaten. `.git`, `server`, `tools`, JSON-Dateien, versteckte Pfade und
Symlink-Ausbrueche sind nicht oeffentlich. Keine Verzeichnislisten. Hostnamen
sind auf Loopback beschraenkt. Der Server ist fuer lokale Entwicklung gedacht;
Netzwerkfreigabe, Authentifizierung und Pi-Betrieb gehoeren in eine spaetere Phase.

Die bisherigen pauschalen JSON- und Regeldaten-Ignore-Regeln bleiben bestehen;
es gibt keine JSON-Ausnahmen fuer Tests. Testdaten entstehen nur aus Python-Code
in temporaeren Ordnern ausserhalb des Repositories. `.venv`, versehentliche
lokale Speicherordner und JSON-Temporaerdateien sind ebenfalls ignoriert.
Ignore-Regeln verhindern weder `git add -f` noch das Committen umbenannter
privater Dateien: weiterhin jeden Staging-Diff pruefen.

## Tests

```powershell
.\.venv\Scripts\python.exe -m unittest server.test_api -v
```

Die Suite prueft Anlegen, Auflisten, Laden, Aktualisieren, Persistenz nach
Neustart, unveraendertes JSON, aeltere/erweiterte Exporte, Unicode, unabhaengige
UUIDs, fehlerhafte JSON-Strukturen, PUT-Vorbedingungen und Revisionen,
Groessen-/Tiefenlimits, private statische Pfade, Speicherortschutz, Host-Pruefung,
atomaren Schreibfehler, Sperrfehler sowie konkurrierende Updates aus zwei
getrennten Prozessen. Ein HTTP-Smoke-Test verwendet einen echten Loopback-Port.

Tatsaechlich ausgefuehrte Laeufe und Einschraenkungen: [TEST_RESULTS.md](TEST_RESULTS.md).
