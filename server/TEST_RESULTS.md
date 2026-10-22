# Ausgefuehrte Pruefungen – 22.10.2026

Umgebung: lokale Windows-Sitzung, Python 3.15.1 in `.venv`, Flask 3.1.3,
Werkzeug 3.1.9. Keine realen Charakterdateien fuer API-Tests verwendet.

| Befehl | Tatsaechliches Ergebnis |
| --- | --- |
| `.\.venv\Scripts\python.exe -m unittest server.test_api -v` | 18 Tests, **OK**, Exitcode 0 |
| `cscript.exe //nologo tools\validate.js` | **1513 Checks bestanden, 0 Fehler**, Exitcode 0; 242/242 Subklassen gerendert |
| `.\.venv\Scripts\python.exe -m pip check` | **No broken requirements found**, Exitcode 0 |
| `git diff --check` | Keine Whitespace-Fehler, Exitcode 0 |

API-Abnahme mit synthetischem Exportobjekt: POST 201 mit UUID/Revision 1,
Liste 200, GET 200 mit unveraendertem Charakterobjekt, PUT 200 mit Revision 2,
erneutes Laden auch nach neuer App-Instanz erfolgreich. Ungueltiges JSON und
ungueltige Feldtypen: 400. Uebergrosse Anfragen: 413. Fehlender If-Match: 428.
Veralteter If-Match: 409 ohne Ueberschreiben. Zwei separate Windows-Prozesse
mit derselben Revision: genau einmal 200 und einmal 409. Simulierter Fehler
beim atomaren Ersetzen: 500, bisherige Datei und Revision unveraendert.
Ein echter HTTP-GET ueber einen temporaeren Loopback-Port lieferte 200.

Ignore-Pruefung mit `git check-ignore --no-index`: Charakter-JSON, Regeldaten-JS,
Feature-JS, lokale/private JSON-Dateien, `server/storage` und `.venv` werden
ignoriert. `server/test_api.py` wird nicht ignoriert. `git ls-files` fuer
JSON/PDF und generierte Regeldaten ergab keine getrackten Dateien.

Die bestehende JScript-Suite verwendete ausschliesslich bereits lokal
vorhandene generierte Ressourcen. Keine Datengenerierung, keine Downloads und
keine Uploads von Regeldaten. Ihr Homebrew-Abschnitt wurde von der Suite mangels
Homebrew-Buch uebersprungen und ist daher **nicht als bestanden bewertet**.

Nicht geprueft: Unix-Dateisperre, weitere Python-Versionen, Netzlaufwerke,
Stromausfallverhalten, Raspberry Pi und manuelle Browser-Charaktererstellung.
Die neue HTTP-Pruefung verwendet einen freien Port; die Standardbindung
`127.0.0.1:8000` ist im Einstiegspunkt festgelegt. Keine Frontend-Anbindung
implementiert. Die virtuelle Umgebung und alle API-Testdateien bleiben lokal;
die Testdateien werden nach jedem Test entfernt.
