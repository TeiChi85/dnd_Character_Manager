# Gemeinsame Charakterbibliothek: Bedienung

Flask ist nur für die gemeinsame Bibliothek erforderlich; lokale JSON-Dateien
funktionieren auch ohne Backend. [Einrichtung und Start](../DEVELOPMENT.md#normaler-start),
[API/Speicher](../server/README.md), [Wiederherstellung](STORAGE_RECOVERY.md).
Die Bibliothek verwendet dieselbe Herkunft und denselben Port wie die Anwendung,
keine fest eingebaute externe Adresse. Ein reiner Dateiserver bietet keine API.

## Öffnen und speichern

Die Startseite zeigt die Shared character library mit Name, Klasse, Stufe,
Edition und lokal dargestelltem Änderungsdatum, neueste zuerst. **Refresh**
lädt erneut. Suche filtert geladene Namen/Klassen; ein Eintrag öffnet den Charakter.

**Save to Server** legt ohne Serveridentität eine neue ID an und aktualisiert
anschließend genau diesen Eintrag. **Save as New on Server** erzeugt eine neue
ID; weitere Saves beziehen sich auf diese Kopie. Namen müssen nicht eindeutig
sein. Auch ein noch unvollständiger Charakter kann bei gültiger Struktur gespeichert
werden; bekannte Charakterfelder sind optional, siehe [State-Vertrag](CHARACTER_STATE.md).
Lokaler Export verwendet denselben Serializer, enthält aber keine Server-ID/Revision.

Ein erfolgreicher lokaler Import oder ein bewusst neuer Charakter trennt die alte
Serverzuordnung; der nächste Server-Save legt neu an. Ein **fehlgeschlagener**
Import darf die Zuordnung oder den alten Charakter nicht verlieren.
Lokale Recents, Dateiauswahl und Download-Fallback bleiben vorhanden; ihre
Verfügbarkeit hängt vom Browser ab.

## Konflikte und Löschen

PUT und DELETE senden die zuletzt bekannte Revision über `If-Match`.
Bei einem Save-Konflikt bleiben lokale Änderungen erhalten. **Reload server
version** verwirft sie erst nach Bestätigung und lädt den Serverstand;
**Save as New on Server** erhält sie unter neuer ID. Kein automatisches Merge.
Bei HTTP 404 kann die lokale Fassung weiterhin als neue Kopie gespeichert werden.

Löschen ist getrennt vom Öffnen. Der Dialog benennt Charakter und Wirkung:
Verschieben in den privaten Server-Papierkorb. Cancel, Escape oder Schließen
löschen nichts und geben den Fokus zurück. Erst ausdrückliches **Delete Character**
löst DELETE aus. Ein veralteter Listeneintrag führt zum Revisionskonflikt;
Refresh und eine neue ausdrückliche Bestätigung sind erforderlich.

Nur eine gültige Erfolgsantwort bestätigt die Löschung. Bei Netz-/Speicherfehlern
bleibt der Eintrag bis zur Klärung sichtbar. Nach Verbindungsabbruch zuerst
Refresh: der Server könnte die Anfrage bereits abgeschlossen haben.
Wiederherstellung ist administrativ, keine UI-Restore-Aktion.
[Recovery-Anleitung](STORAGE_RECOVERY.md).

## Datenverlustschutz

- ID/Revision liegen nur im Client-Laufzeitzustand. Ein Save behält einen
  abgetrennten Snapshot; währenddessen gemachte Änderungen bleiben anschließend dirty.
- Während Serveroperationen sind Speicheraktionen gesperrt und Charakterwechsel
  blockiert. Bearbeiten bleibt möglich. Änderungen während eines Loads benötigen
  vor der Übernahme eine erneute Verwerfbestätigung.
- Library-Ansichtswechsel erhält den aktuellen Charakter. Der ausdrückliche
  Start-Page-/Editionswechsel im Builder resettet nach Dirty-/Busy-Prüfung.
  Ein gewöhnlicher Wizard-Schrittwechsel verwirft keine Eingaben.
- Dirty-State vergleicht nur Charakter-Snapshots mit dem letzten Server-Load/-Save,
  nicht UI/Theme. Lokales Speichern setzt diese Server-Baseline nicht zurück;
  deshalb kann die Schutzabfrage danach weiter erscheinen.
- HTTP-Anfragen haben 20 Sekunden Timeout. Die Vorbereitung fehlender
  Klassenfeatures beim Serverimport im Frontend hat 15 Sekunden. Ungültige Antworten oder fehlende
  Referenzen dürfen den bisherigen Charakter nicht ersetzen. Import-/Renderfehler
  rollen State, UI, Referenzen und Dateihandle zurück; [Details](CHARACTER_STATE.md#import-rollback-und-kompatibilitaet).
- Keine automatischen Schreibwiederholungen, auch nicht bei POST: Nach Timeout
  kann ein Save bereits erfolgt sein. Vor einem erneuten Versuch die Liste prüfen,
  um unbeabsichtigte Duplikate zu vermeiden. HTTP 409 ersetzt nie automatisch Daten.

Servernamen/Status/Dialoge werden als Text dargestellt; Portraits sind validierte
PNG-Data-URLs. Bei Backend-Ausfall bleibt die lokale JSON-Speicherung erreichbar.
Browser können `beforeunload`-Bestätigungen unterdrücken; kein Autosave und keine
Garantie zur Wiederherstellung nach Browserabsturz.

## Prüfung und Grenzen

[TESTING.md](TESTING.md#pruefauswahl) beschreibt automatisierte Prüfungen und den
isolierten Live-Test. Manuelle Prüfungen mit synthetischen Charakteren ebenfalls
nur in einer getrennten Bibliothek durchführen: Save/Reload, Kopie, Zwei-Tab-Konflikt,
Delete/Cancel/Veraltet, Netzausfall und lokalen JSON-Roundtrip prüfen.
Die Nutzerbibliothek ist kein Testspeicher.

Direktes `file://` und der statische Server unterstützen keine gemeinsame
Bibliothek. Die API benötigt Browserunterstützung für Fetch, Promise und
AbortController. Keine Konten, Rollen, Autosave oder geprüfte Netzwerkfreigabe;
alle Benutzer mit Zugriff auf dieselbe lokale Bibliothek können alle Einträge
bearbeiten/löschen. Der dokumentierte Serverstart bleibt auf Loopback.
