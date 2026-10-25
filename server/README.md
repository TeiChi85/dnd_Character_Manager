# Lokale Bibliothek: Backend, API und Speicher

Optionales Flask-Backend zur statischen Oberfläche. Maßgebliche Einrichtung und
Start: [DEVELOPMENT.md](../DEVELOPMENT.md#normaler-start). Bedienung/Konflikte:
[SERVER_LIBRARY.md](../docs/SERVER_LIBRARY.md). Keine Konten, Rollen, Datenbank
oder geprüfte Netzwerkbereitstellung; der dokumentierte Einstieg bindet nur
an `127.0.0.1:8000`, ohne Debugger/Reloader.

## Verantwortung und Validierung

`server/app.py` erstellt API und erlaubte statische Routen. `server/validation.py`
prüft JSON-Struktur, `server/storage.py` verwaltet Dateien/Revisionen/Sperren,
`server/restore.py` ist die administrative Wiederherstellung.
Kein D&D-Regelabgleich, keine Neuberechnung oder Frontend-Normalisierung.
Der Frontend-Serializer und optionale Felder sind allein im
[State-Vertrag](../docs/CHARACTER_STATE.md) beschrieben; die API erhält sichere
unbekannte Erweiterungen im Charakterobjekt.

Nur UTF-8-JSON mit JSON-Content-Type; Formatmarker `_app: "dnd-cc"` und
Ganzzahl `_v: 1`. Bekannte vorhandene Felder müssen ihre Typen einhalten;
`level` ist optional, aber dann eine Ganzzahl 1–20, `edition` ist `classic`,
`one` oder `null`. Fehlende optionale Felder machen alte Exporte nicht ungültig.
Die API ergänzt keine Defaults. Gültiges Legacy-`sheet.dark` kann im Serverobjekt
bleiben, auch wenn das Frontend es beim Normalisieren entfernt.

| Grenze | Aktueller Standardvertrag |
| --- | --- |
| Anfrage / kanonische ASCII-JSON-Darstellung des Charakters | jeweils höchstens 2 MiB; Speicherhülle kommt auf Platte hinzu |
| Bekannte kurze Labels / JSON-Schlüssel | höchstens 200 UTF-16-Einheiten |
| Sonstige Strings | höchstens 65.536 UTF-16-Einheiten |
| Array-/Objekteinträge | höchstens 2.000 je Container |
| Werte / Tiefe | höchstens 50.000 Werte / 64 Ebenen |
| Zahlen | endlich, Betrag höchstens `1e12`; passende numerische Formularstrings und bestimmte optionale Itemwerte `null` bleiben zulässig |
| Portrait | ausschließlich PNG-Data-URL, innerhalb des Gesamtlimits |

Doppelte Schlüssel, ungültiges Unicode, unsichere Prototype-Keys, ungeeignete
Typen und manipulierte numerische Attribute werden abgewiesen.
`create_app({...})` kann `MAX_CONTENT_LENGTH` für lokale Einbettung/Tests ändern;
der dokumentierte Start nutzt den Standard. Frontendprüfungen spiegeln die
strukturellen Grenzen, ersetzen aber nicht die API-Prüfung.
Die offene `customDefences`-Typabweichung ist in der
[Vertragsklärung](../docs/tasks/CONTRACT_REVIEW.md) beschrieben.

## API

POST/PUT erhalten direkt das Charakterexportobjekt, keine Speicherhülle.
GET/POST/PUT liefern eine Hülle; schematisches Beispiel mit synthetischen Daten:

```javascript
{
  "id": "server-generated-uuid",
  "updated_at": "2026-10-22T12:00:00+00:00",
  "revision": 1,
  "character": {"_app": "dnd-cc", "_v": 1, "name": "Synthetic Test"}
}
```

ID/Revision verwaltet der Server, Zeitstempel sind UTC. Für einen lokalen
Charakterimport ausschließlich `character` verwenden, nicht die Hülle.

| Methode | Pfad | Verhalten |
| --- | --- | --- |
| GET | `/api/characters` | 200, `{characters:[...]}` mit ID, Zeit, Revision, Name, Edition, Klasse, Level; ohne Portrait/Charakterdetails |
| GET | `/api/characters/{id}` | 200, vollständige Hülle, ETag |
| POST | `/api/characters` | 201, neue UUID/Revision 1, Hülle, ETag und Location |
| PUT | `/api/characters/{id}` | Vollständiger Ersatz, `If-Match` erforderlich; 200 mit erhöhter Revision/ETag |
| DELETE | `/api/characters/{id}` | `If-Match` erforderlich; 200 mit `{id,revision,deleted:true}` nach Verschieben in privaten Papierkorb |

`If-Match` enthält genau eine gequotete positive Revision, etwa `"1"`.
Fehlt sie: **428**; ungültiger Header: **400**; veraltete Revision: **409**
mit `current_revision`, ohne Überschreiben. PUT erzeugt keine neue ID.
Gleiche Charakternamen sind erlaubt.

Weitere Fehler: **400** bei ungültigem JSON/Format, **403** bei fremder Herkunft
von Schreibanfragen, **404** bei unbekannter/ungültiger ID, **413** bei zu großen
Daten, **415** bei falschem Content-Type, **503** bei Sperrtimeout (fünf Sekunden),
**500** bei Speicherfehlern oder beschädigten Dateien. Auch die Liste schlägt bei
beschädigtem Speicher fehl, statt Einträge still wegzulassen. Fehlerantworten sind
JSON ohne interne Pfade; technische Details stehen im Backendlog.
API-Antworten haben `Cache-Control: no-store`.

Beispiel **nur gegen den eigenen isolierten Testserver** aus
[TESTING.md](../docs/TESTING.md#isolierter-live-test), nicht gegen Nutzerdateien:

```powershell
$uri = "http://127.0.0.1:8001/api/characters"
$body = @{ _app = "dnd-cc"; _v = 1; name = "Synthetic Test"; level = 1 } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $body
Invoke-RestMethod -Uri $uri
$loaded = Invoke-RestMethod -Uri "$uri/$($created.id)"
$loaded.character.name = "Updated Synthetic"
$body = $loaded.character | ConvertTo-Json -Depth 64
$headers = @{ "If-Match" = ('"{0}"' -f $loaded.revision) }
Invoke-RestMethod -Method Put -Uri "$uri/$($created.id)" -Headers $headers -ContentType "application/json" -Body $body
```

## Speicher und Auslieferung

Speicherort konfigurieren: [Einrichtung](../DEVELOPMENT.md#normaler-start).
Der Server lehnt Speicher innerhalb des Repositorys auch nach Pfadauflösung ab.
Eine permanente `.library.lock` serialisiert Zugriff zwischen lokalen Prozessen
(`msvcrt` Windows, `flock` Unix). Lesen, Revision, Backup und Mutation liegen
in derselben Sperre. Pro Charakter eine `{uuid}.json`; Schreiben über temporäre
Datei, Flush/`fsync` und `os.replace`. Ersetzungsfehler lassen den alten Stand
bestehen. `.character-*.tmp` nach Abbruch wird nicht gelistet.

Backups vor PUT, Soft-Delete, Linkschutz, Aufbewahrung, Restore und ihre
Fehlerbedingungen stehen maßgeblich in
[STORAGE_RECOVERY.md](../docs/STORAGE_RECOVERY.md). Lokale atomare Dateien sind
keine Garantie für Netzlaufwerke, Stromausfall oder Datenträgerverlust.

Flask liefert die sieben erlaubten HTML-Einstiegsseiten sowie passende
CSS-/JS-/Bilddateien unter `css/`, `js/`, `resources/`, einschließlich lokaler
Regeldaten. `.git`, `server`, `tools`, JSON, versteckte Pfade, Verzeichnislisten
und Symlink-Ausbrüche sind nicht öffentlich. Hostprüfung ist auf Loopback-Namen
beschränkt; Cross-origin-Schreibanfragen werden abgewiesen. Das ist keine
Authentifizierung oder Bereitstellungsanleitung.

Prüfauswahl und alle Testkommandos: [TESTING.md](../docs/TESTING.md#pruefauswahl).
