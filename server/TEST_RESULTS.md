# Ausgefuehrte Pruefungen – 22.10.2026

## Phase 3: Frontend-Integration (22./23.10.2026)

- Neue Suite `tools/validate_server_frontend.mjs`: **16 Szenarien bestanden**.
  Ausgefuehrt mit der vorhandenen eingebetteten Node-Laufzeit ueber den
  JavaScript-Test-Runner, durch Import der Datei. `node` liegt in dieser
  PowerShell-Sitzung nicht im PATH; der dokumentierte CLI-Befehl wurde deshalb
  nicht als Shell-Befehl ausgefuehrt. Keine npm-Pakete installiert.
- `.\.venv\Scripts\python.exe -m unittest server.test_api -v`: erneut
  **18 Tests bestanden**, Exitcode 0.
- `cscript.exe //nologo tools\validate.js`: erneut **1513 Checks bestanden,
  0 Fehler**, Exitcode 0; **242/242 Subklassen**. Homebrew mangels Buch weiterhin
  uebersprungen.
- Echter Chrome-Browser gegen eine separate Flask-Testinstanz auf
  `127.0.0.1:8001`, mit temporaerem Speicher ausserhalb des Repositories:
  Anlegen, Liste, Oeffnen im Charakterbogen, Aktualisieren, zweite Serverkopie,
  Konflikt in zwei Tabs und explizites Neuladen erfolgreich. Die Bibliothek bei
  390 Pixeln Breite geprueft: Eintraege untereinander, Bedienflaechen innerhalb
  des Viewports; kein horizontaler Ueberlauf der Bibliothek.

Die neue Suite prueft die echten Skripte fuer Bibliothek, Transport,
Revisionsverwaltung, Lokalspeichern/-laden und Zustandswiederherstellung.
HTTP und DOM sowie Regelpopulation und Charakter-Rendering sind dabei
simuliert. Sie umfasst ungueltige Antworten, sichere Textdarstellung,
Netzausfall, Timeout, 413/404/409, keine automatischen Schreibwiederholungen,
Schutz vor Doppelklicks, Aenderungen waehrend Anfragen, alte Exporte ohne
Altzustandsreste, Rollback bei Renderfehlern sowie lokalen Export/Import ohne
Servermetadaten. Die echte API und die bestehenden Berechnungen werden von
den beiden anderen Suiten geprueft.

Nicht im echten Browser durchgefuehrt: Betriebssystem-Dateipicker samt
Schreibberechtigung, PDF-Export und mobile Hardware. Der lokale Download-
Fallback und FileReader-Import sind automatisiert im simulierten DOM getestet.
Kein Netzwerk-/Pi-Betrieb getestet. Die bereits lokal vorhandenen Regeldaten
wurden weder generiert noch hochgeladen. UI-Belege liegen nur im ignorierten
`local/`-Ordner; sie sind nicht Teil des Commits.

## Phase A: Backend

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
