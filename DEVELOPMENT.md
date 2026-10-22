# CharacterManager unter Windows 11 entwickeln

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
- Edge oder Chrome. Windows Script Host (`cscript.exe`) wird für die vorhandenen
  Tests benötigt. Falls durch Windows-/Organisationsrichtlinien deaktiviert,
  ist dieser Testlauf dort nicht verfügbar.

PowerShell neu öffnen und prüfen:

```powershell
git --version
py -3 --version
```

Für den reinen Offline-Betrieb sind weder Node.js, npm, zusätzliche pip-Pakete
noch ein OpenAI-API-Schlüssel erforderlich. Die optionale Serverbibliothek
benötigt Flask; der zusätzliche Frontend-Test eine Node-Laufzeit, ohne npm-Pakete.
Codex ist das Entwicklungswerkzeug.

## 2. Repository klonen und in VS Code öffnen

Voraussetzung: Der GitHub-Fork `TeiChi85/CharacterManager` wurde angelegt.

```powershell
New-Item -ItemType Directory -Force "$HOME\source" | Out-Null
Set-Location "$HOME\source"
git clone https://github.com/TeiChi85/CharacterManager.git
Set-Location CharacterManager
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

Nach erfolgreicher Datengenerierung in einem zweiten PowerShell-Fenster:

```powershell
cscript.exe //nologo tools\validate.js
if ($LASTEXITCODE -ne 0) { throw "Regressionstest fehlgeschlagen: Ausgabe prüfen." }
```

Die Suite nutzt Windows-spezifische ActiveX-/Dateisystemobjekte und einen
simulierten DOM. `node tools/validate.js` ist kein Ersatz. Ohne lokale Daten
bricht sie beim Laden ab. In Linux-basierten Cloud-Umgebungen ist sie nicht
unverändert ausführbar. Die ursprüngliche Vorbereitung führte weder eine
Datengenerierung noch Windows-Tests aus. Die später tatsächlich ausgeführten
Backend-, Frontend- und Windows-Läufe stehen in
[server/TEST_RESULTS.md](server/TEST_RESULTS.md).

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
