# CharacterManager unter Windows 11 entwickeln

**PR06 UI-Architektur:** Creator, Charakterbogen, Navigation, Bibliotheksdarstellung
und Regeltexte liegen in `js/ui/`. `app.js` verbindet sie mit State und Rules.
[Schnittstellen und Vorbereitung fuer PR07](docs/UI_ARCHITECTURE.md).
Zusatztest ohne Regeldaten: `node tools/validate_ui_components.mjs`.

**PR07 Library und Sheet:** Responsive Abschnitte, SectionSelector und mobile
Navigation sind implementiert. Der Builder folgt erst in PR08.
[Bedienung, Breakpoints und Browserpruefung](docs/MOBILE_UI.md).
Schnelltest: `node tools/validate_mobile_ui.mjs`; die optionale Playwright-
Entwicklungsumgebung liegt getrennt unter `tools/browser/` (Node 20+).

**Phase 4:** Revisionssicheres Loeschen mit privatem Papierkorb, automatische
Dateibackups, globale Theme-Auswahl und gemeinsame JSON-Validierung sind
implementiert. [Bedienung, Testbefehle und Grenzen](docs/PHASE4.md),
[Wiederherstellung](docs/STORAGE_RECOVERY.md), [Theme](docs/THEME.md).

**Phase 3 – Frontend:** Die Startseite bietet jetzt die gemeinsame
Charakterbibliothek; im Creator stehen **Save to Server** und **Save as New on
Server** bereit. Mit dem Flask-Server starten, damit die API verfuegbar ist.
[Startbefehle, Bedienung, manuelle Abnahme und Tests](docs/SERVER_LIBRARY.md).

**Erweiterung MVP 1, Phase A:** Fuer die optionale lokale Charakterbibliothek
gibt es jetzt ein Flask-Backend. Windows-Startbefehle, Speicherpfad, API und
Tests stehen in [server/README.md](server/README.md). Der folgende bisherige
statische Entwicklungsstart bleibt ohne pip-Abhaengigkeiten nutzbar.

CharacterManager basiert auf [TaylorMouse/dnd_character_creator](https://github.com/TaylorMouse/dnd_character_creator).
Die ursprüngliche Anwendung und die MIT-Lizenz bleiben unverändert. Diese
ursprüngliche Vorbereitung ergänzte nur Dokumentation und Ignore-Regeln.

## 1. Software installieren

- [Git for Windows](https://git-scm.com/downloads/win).
- [Python 3](https://www.python.org/downloads/windows/) mit Python-Launcher (`py`).
  Eine aktuelle Python-3-Version verwenden; die Generatoren nutzen die Standardbibliothek.
- [Visual Studio Code](https://code.visualstudio.com/).
- Offizielle **Codex-Erweiterung von OpenAI** in VS Code installieren und mit
  dem ChatGPT-Konto anmelden. Siehe [offizielle Einrichtung](https://developers.openai.com/codex/ide/).
  Alternativ das lokale Repository in der Codex-Desktop-Anwendung öffnen.
- Edge oder Chrome. Node.js 18+ wird fuer die plattformunabhaengigen
  Entwicklungstests benoetigt (keine npm-Pakete). Windows Script Host ist nur
  fuer den direkten Vergleich mit der bisherigen Windows-Regelsuite erforderlich.

PowerShell neu öffnen und prüfen:

```powershell
git --version
py -3 --version
```

Für den reinen Offline-Betrieb sind weder Node.js, npm noch ein OpenAI-API-Schlüssel
erforderlich. Die optionale Serverbibliothek benötigt Flask. Node.js wird fuer
Entwicklungstests und Lint gebraucht; die datenfreien Node-Tests benoetigen
weiterhin keine npm-Pakete. Die optionalen Linter benoetigen Node 22.13+ (22.x)
oder 24+ und eigene Entwicklungsabhaengigkeiten.
Codex ist das Entwicklungswerkzeug.

## 2. Repository klonen und in VS Code öffnen

Voraussetzung: Zugriff auf den GitHub-Fork `TeiChi85/dnd_Character_Manager`.

```powershell
New-Item -ItemType Directory -Force "$HOME\source" | Out-Null
Set-Location "$HOME\source"
git clone https://github.com/TeiChi85/dnd_Character_Manager.git
Set-Location dnd_Character_Manager
git remote add upstream https://github.com/TaylorMouse/dnd_character_creator.git
code .
```

Falls `code` nicht im PATH liegt: VS Code starten und **Datei → Ordner öffnen**.
Vor späteren Änderungen einen Arbeitsbranch anlegen, z. B. `git switch -c feature/meine-aenderung`.

## 3. Fehlende Regeldaten lokal bereitstellen

Der Checkout enthält absichtlich keine generierten D&D-Regeldaten.
Ohne diese startet die Oberfläche mit einem Hinweis; Charaktererstellung und
Regressionstests sind erst nach der Generierung vollständig nutzbar.

Benötigt wird ein eigener, zur lokalen Nutzung berechtigter Datensatz im
**5etools-JSON-Format**, kein PHB-PDF und keine Charakter-JSON. Der Upstream
nennt 5etools **v2.33.1** als zuletzt validierte Version. Ein reiner SRD-Text
ist kein direkter Ersatz für dieses Format. Die Code-MIT-Lizenz erteilt keine
Rechte zur Weiterverbreitung der Regelinhalte. Daten selbst aus einer Quelle
bereitstellen, für die entsprechende Nutzungsrechte vorliegen; diese Anleitung
lädt keine Bücher oder Regeldaten herunter.

Den vollständigen Datensatz **außerhalb** des Git-Ordners ablegen, zum Beispiel
`C:\DND-local\5etools-v2.33.1\data`. Erwartet werden unter anderem:

- `class\class-*.json`, `spells\spells-*.json`, `bestiary\bestiary-*.json`
- `backgrounds.json`, `races.json`, `feats.json`, `optionalfeatures.json`
- `items.json`, `items-base.json`, `magicvariants.json`, `languages.json`
- `generated\gendata-spell-source-lookup.json`

Das ist eine Orientierung, kein vollständiges Importschema. Den kompletten
kompatiblen `data`-Ordner verwenden, nicht einzelne Dateien zusammenstellen.
Wenn vorhanden, `package.json` neben `data` belassen: daraus wird die Version gelesen.

Im Repository-Stamm ausführen (Pfad an den tatsächlichen Speicherort anpassen):

```powershell
$env:PYTHONUTF8 = "1"
$env:CC_5ETOOLS_DATA = "C:\DND-local\5etools-v2.33.1\data"
Test-Path "$env:CC_5ETOOLS_DATA\generated\gendata-spell-source-lookup.json"
py -3 tools\datasrc.py
py -3 tools\regen_all.py "$env:CC_5ETOOLS_DATA"
if ($LASTEXITCODE -ne 0) { throw "Datengenerierung fehlgeschlagen: Ausgabe prüfen." }
```

`Test-Path` muss `True` ergeben; `regen_all.py` soll mit **FAILED: none** und
Exitcode 0 enden. Es erzeugt `resources/data-*.js`, `resources/features/*.js`
und Kreaturdateien unter `resources/creatures/`. Diese bleiben lokal ignoriert.
Bei einer Fehlermeldung Dateipfad und Datensatzversion prüfen, nicht die
Generatoren auf Verdacht ändern. Teilweise erzeugte Dateien bedeuten keinen
erfolgreichen Import. Nach einem Datenversionswechsel können alte generierte
Dateien übrig bleiben; vor einer erneuten Generierung die betreffenden lokalen
Ausgaben nach Sicherung gezielt entfernen, nicht pauschal alle Git-Dateien bereinigen.

Pfadpriorität: Kommandozeilenargument vor `CC_5ETOOLS_DATA` vor dem alten,
fest eingebauten `E:`-Pfad. Daher immer Argument oder Umgebungsvariable setzen.
Die obigen Umgebungsvariablen gelten nur im aktuellen PowerShell-Fenster.
Optionales Homebrew ebenfalls außerhalb ablegen; `CC_HOMEBREW` akzeptiert
Dateien oder Ordner, durch Semikolon getrennt. Die Loader suchen zusätzlich
in `homebrew/` und neben bzw. oberhalb des Datenordners nach passenden JSON-Dateien.

## 4. Entwicklungsserver starten und Browser öffnen

Fuer die gemeinsame Bibliothek den optionalen Flask-Server im Repository-Stamm
starten (vorhandene `.venv` weiterverwenden):

```powershell
# Nur bei neuer Einrichtung:
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server\requirements.txt
# Normaler Start:
.\.venv\Scripts\python.exe -m server.app
```

Flask liefert Anwendung und API unter <http://127.0.0.1:8000/> aus,
ohne Debugger/Reload und nur auf Loopback. Private JSON-Dateien, Backups und
Papierkorb liegen standardmaessig unter `%USERPROFILE%\.character-manager\characters`,
konfigurierbar ueber `CC_CHARACTER_STORAGE` ausserhalb des Repositorys.
Details: [server/README.md](server/README.md). Keine Authentifizierung;
keine Freigabe im Internet. Die Regeldaten muessen weiterhin lokal generiert sein.

Alternativ fuer die statische Anwendung ohne gemeinsame Bibliothek:

Im Repository-Stamm:

```powershell
py -3 -m http.server 8000 --bind 127.0.0.1
```

Im Browser [http://127.0.0.1:8000/index.html](http://127.0.0.1:8000/index.html)
öffnen. Mit `Strg+C` den Server beenden. Falls Port 8000 belegt ist, z. B.
8001 verwenden und die URL anpassen. Der Server ist nur ein lokaler Dateiserver.
Es gibt keinen Build-Schritt; nach Änderungen Browser neu laden, bei alten
Dateien `Strg+F5` verwenden. Alternativ funktioniert direktes Öffnen von `index.html`.

## 5. Vorhandene Tests ausführen

Zusaetzliche schnelle Fehlerpruefung fuer eigenen JavaScript-, Python- und
CSS-Code: [Einrichtung, Befehle, Umfang und Grenzen](docs/LINTING.md).
Nach einmaliger Installation: `npm.cmd run --silent lint`, danach bei
Konfigurationsaenderungen `node tools/validate_lint.mjs`. Derselbe Lint-Einstieg
laeuft im separaten CI-Job. Lint ersetzt die folgenden Tests nicht.

Backend ohne D&D-Regeldaten, mit isolierten temporaeren Speichern:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s server -t . -v
```

Frontend und portabler Harness-Selbsttest mit Node.js 18+ (keine npm-Pakete,
synthetische Daten/simulierter DOM):

```powershell
node tools\validate_server_frontend.mjs
node tools\validate_class_loading.mjs
node tools\validate_theme.mjs
node tools\validate_rules_core.mjs
node tools\validate_character_state.mjs
node tools\validate_ui_components.mjs
node tools\validate_mobile_ui.mjs
node tools\validate_rules_engine.mjs
node tools\validate_rules_adapters.mjs
node tools\validate_rules.mjs --self-test
```

Die Testarten und Grenzen sind in [docs/TESTING.md](docs/TESTING.md) beschrieben.
Die Klassenlade-Suite prueft den echten Event-Handler und Loader mit gezielt
vertauschten Script-Antworten; sie fuehrt beim Import auch die Frontend-Suite aus.
Wenn beide Befehle ausgefuehrt werden, laeuft die Frontend-Suite deshalb zweimal.
`validate_rules.mjs --self-test` prueft ausschliesslich den Node-Adapter mit
synthetischen Testdaten, die klare Fehlermeldung bei fehlenden Regeldaten und
einen absichtlich fehlschlagenden isolierten Testprozess. Das ist kein Test der
D&D-Regeln.
Der optionale Live-Test `node tools\validate_live_library.mjs` darf nur gegen
einen eigenen Flask-Testserver auf `127.0.0.1:8001` mit isoliertem temporaerem
`CC_CHARACTER_STORAGE` laufen, niemals gegen echte Charaktere. Er erzeugt
synthetische Charaktere und hinterlaesst deren Recovery-Archive im Test-Speicher.
Eine konkrete isolierte Start-/Stop-Anleitung steht in
[docs/TEST_BASELINE.md](docs/TEST_BASELINE.md).

Nach erfolgreicher lokaler Datengenerierung die vollstaendige Regelsuite mit Node
ausfuehren:

```powershell
node tools\validate_rules.mjs
if ($LASTEXITCODE -ne 0) { throw "Regel-Regressionstest fehlgeschlagen: Ausgabe prüfen." }
```

Der portable Runner nutzt dieselben Assertions in `tools/validate.js`; ein zweiter
Satz fachlicher Assertions wird nicht gepflegt. Er ersetzt die WSH-Zugriffe auf
Dateien und ActiveX-Objekte durch einen kleinen Adapter. Der bisherige direkte
Windows-Vergleich bleibt verfuegbar:

```powershell
cscript.exe //nologo tools\validate.js
if ($LASTEXITCODE -ne 0) { throw "Windows-Regressionsvergleich fehlgeschlagen: Ausgabe prüfen." }
```

Die WSH-Datei nutzt weiterhin ActiveX-/Dateisystemobjekte und einen simulierten
DOM; der Node-Adapter macht den Runner plattformunabhaengig. Beide vollstaendigen
Regellaeufe benoetigen lokal generierte Ressourcen und brechen bei fehlenden
Daten mit Fehler ab. GitHub Actions fuehrt nur den datenfreien Selbsttest aus,
nicht die vollstaendige Regelsuite. Die tatsaechlich ausgefuehrten Backend-,
Frontend- und Windows-Laeufe stehen in
[server/TEST_RESULTS.md](server/TEST_RESULTS.md).
Die fuer PR 01 neu ausgefuehrten Vorher-/Nachher-Laeufe, Exitcodes und
Einschraenkungen stehen getrennt in [docs/TEST_BASELINE.md](docs/TEST_BASELINE.md).

Im Browser zusätzlich einen Charakter erstellen, als JSON außerhalb des
Repos speichern, wieder laden und die Referenzseiten prüfen. PDF-Export ist
optional: `resources/pdf-lib.min.js` und `resources/pdf-template.js` fehlen
ebenfalls absichtlich. Die unveränderte README beschreibt die Bereitstellung;
eine eigene PDF-Vorlage lässt sich mit `tools/gen_pdf_template.py` einbetten.
Beide Dateien und die Ausgangs-PDF bleiben lokal.

## 6. Mit Codex arbeiten und Änderungen prüfen

Codex im geöffneten Projekt starten und zunächst `AGENTS.md` sowie diese Datei
lesen lassen. Ein geeigneter erster Auftrag: „Prüfe die lokale Einrichtung,
starte die bestehenden Tests und berichte Einschränkungen. Ändere noch keine Funktionen.“
Für Cloud-Arbeit muss der Fork zusätzlich für die GitHub-Anbindung von Codex
freigegeben und als Repository gewählt werden. Lokale ignorierte Daten werden
nicht automatisch mit übertragen; der vollständige Windows-Testlauf bleibt lokal.

Die `.gitignore` schützt generierte Ressourcen, JSON/PDF-Dateien, lokale
Arbeitsordner, IDE-Konfigurationen und typische Zugangsdaten. Neue legitime
JSON-Quelldateien benötigen eine gezielte Ignore-Ausnahme nach Inhaltsprüfung.
Eigene Charaktere/Porträts und Datensätze grundsätzlich außerhalb speichern.
Keine Ignore-Datei erkennt jeden privaten Inhalt oder verhindert `git add -f`.
Sie schützt auch nicht vor Zugriff durch Codex selbst oder vor anderen Upload-Werkzeugen.

Vor jedem Commit prüfen:

```powershell
git status --short --ignored
git diff
git diff --cached --name-only
git diff --cached
git ls-files "resources/data-*.js" "resources/features/*" "resources/creatures/*" "*.json" "*.pdf"
```

Der letzte Befehl soll im vorbereiteten Stand nichts ausgeben. Ignore-Regeln
wirken nicht rückwirkend auf bereits getrackte Dateien. Keine Regeldaten mit
`git add -f` erzwingen. Die Upstream-Skripte `install_hooks.py`, `package.py`,
`upload_dropbox.py` und `sync_public.py` sind für diesen Start nicht nötig
und werden nicht automatisch eingerichtet oder ausgeführt.
