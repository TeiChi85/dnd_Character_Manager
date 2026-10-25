# Einrichtung und lokaler Start

Maßgebliche Anleitung für den aktuellen Checkout. Produktumfang:
[PROJECT.md](docs/PROJECT.md); Prüfungen: [TESTING.md](docs/TESTING.md);
Arbeitsablauf und Review: [WORKFLOW.md](docs/WORKFLOW.md).

## Voraussetzungen

| Zweck | Voraussetzung |
| --- | --- |
| Offline-Oberfläche | Aktueller Browser, lokal erzeugte Regeldaten; kein npm-/pip-Setup |
| Lokale Datengeneratoren | Python 3, Standardbibliothek; autorisierte lokale 5etools-Quelle |
| Optionale Serverbibliothek | Python 3.10+ und Pakete aus [server/requirements.txt](server/requirements.txt); CI verwendet Python 3.12 |
| Entwicklungstests | Node/Python je Prüfart, siehe [TESTING.md](docs/TESTING.md#voraussetzungen) |
| Lint | Separate Entwicklungsabhängigkeiten, siehe [LINTING.md](docs/LINTING.md) |

Git und ein Editor nach Wahl genügen für Quelltextarbeit. Für den normalen
Anwendungsbetrieb ist kein OpenAI-API-Schlüssel erforderlich.

## Einmaliges Setup

PowerShell, falls noch kein Checkout existiert:

```powershell
git clone https://github.com/TeiChi85/dnd_Character_Manager.git
Set-Location dnd_Character_Manager
```

Vor Änderungen Git-Status prüfen und nach Auftrag auf einem Arbeitsbranch
arbeiten; bestehende Änderungen nicht überschreiben. Upstream-Ursprung:
[TaylorMouse/dnd_character_creator](https://github.com/TaylorMouse/dnd_character_creator).

Nur für Flask eine Umgebung einrichten; eine vorhandene `.venv` weiterverwenden:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server/requirements.txt
```

Falls der Python-Launcher keine Installation findet, den vollständigen Pfad
zum installierten Python verwenden. Eine Aktivierung oder Änderung der
PowerShell-Ausführungsrichtlinie ist nicht nötig. Unter Linux/macOS entsprechen
`python3 -m venv .venv` und `.venv/bin/python` diesen Befehlen.

## Lokale Regeldaten bereitstellen

Der Checkout enthält keine generierten D&D-Regeldaten. Ohne sie zeigt die App
einen Hinweis; datenabhängige Erstellung und Referenzen sind nicht vollständig
nutzbar. Es wird eine eigene, lokal zur Nutzung berechtigte Quelle im
**5etools-JSON-Format** benötigt, kein PHB-PDF oder Charakterexport. Diese Anleitung
lädt keine Daten herunter. Die Upstream-Referenz war v2.33.1; andere Versionen
sind damit nicht automatisch kompatibel.

Den vollständigen Datensatz außerhalb des Repositorys ablegen, beispielsweise
`C:\DND-local\5etools-v2.33.1\data`. Erwartet werden u.a. `class/class-*.json`,
`spells/spells-*.json`, `bestiary/bestiary-*.json`, `backgrounds.json`, `races.json`,
`feats.json`, `optionalfeatures.json`, `items.json`, `items-base.json`,
`magicvariants.json`, `languages.json` und
`generated/gendata-spell-source-lookup.json`. Das ist keine vollständige Dateiliste;
keinen Teildatensatz auf Verdacht zusammenstellen. Falls vorhanden, das
Quell-`package.json` neben `data` belassen: daraus liest der Generator die Version.

Im Repository-Stamm, mit dem tatsächlichen eigenen Pfad:

```powershell
$env:PYTHONUTF8 = "1"
$env:CC_5ETOOLS_DATA = "C:\DND-local\5etools-v2.33.1\data"
Test-Path "$env:CC_5ETOOLS_DATA\generated\gendata-spell-source-lookup.json"
py -3 tools/datasrc.py
py -3 tools/regen_all.py "$env:CC_5ETOOLS_DATA"
if ($LASTEXITCODE -ne 0) { throw "Datengenerierung fehlgeschlagen: Ausgabe prüfen." }
```

`Test-Path` muss `True` und die Generierung `FAILED: none` mit Exitcode 0 liefern.
Die Ausgaben unter `resources/data-*.js`, `resources/features/` und
`resources/creatures/` bleiben ignoriert und lokal. Teilweise erzeugte Dateien
belegen keinen Erfolg. Bei Fehlern Quelle/Pfad/Version prüfen, nicht auf Verdacht
Generatoren ändern. Nach Quellenwechsel können alte Ausgaben übrig bleiben;
nur gezielt und nach Sicherung bereinigen, nie pauschal Git-Dateien löschen.

`tools/datasrc.py` verwendet Argument vor `CC_5ETOOLS_DATA` vor einem alten
festen `E:`-Fallback. Immer expliziten Pfad oder Umgebungsvariable setzen.
Homebrew ebenfalls außerhalb halten: `CC_HOMEBREW` nimmt Dateien/Ordner mit
Semikolontrennung an. Der Loader berücksichtigt zusätzlich konfigurierte
Legacy-Pfade und `homebrew`-/Nachbarordner der Quelle; Bucherkennung über
`_meta.sources`. Suchlogik: [tools/homebrew.py](tools/homebrew.py).
Umgebungsvariablen gelten nur im jeweiligen Terminal; diese Befehle lesen Quellen.

## Normaler Start

Für die gemeinsame Bibliothek im Repository-Stamm:

```powershell
.\.venv\Scripts\python.exe -m server.app
```

Anwendung und API: <http://127.0.0.1:8000/>. Ohne Debugger/Reload, nur Loopback.
Standard-Privatspeicher: `%USERPROFILE%\.character-manager\characters`.
Optional vor dem Start im selben Fenster setzen:

```powershell
$env:CC_CHARACTER_STORAGE = "C:\DND-local\character-library"
```

Der Speicher muss außerhalb des Repositorys liegen; der Server prüft auch
aufgelöste Pfade. Nie über einen anderen Dateiserver freigeben.
[API](server/README.md), [Bedienung](docs/SERVER_LIBRARY.md),
[Aufbewahrung und Wiederherstellung](docs/STORAGE_RECOVERY.md).
Keine Authentifizierung und keine geprüfte LAN-/Internetbereitstellung.

Für die statische Anwendung ohne Speicher-API alternativ:

```powershell
py -3 -m http.server 8000 --bind 127.0.0.1
```

Dann <http://127.0.0.1:8000/index.html> öffnen. Direktes Öffnen von `index.html`
ist ebenfalls möglich. Beide Server mit `Strg+C` beenden; bei Portkonflikten
keinen fremden Prozess beenden oder versehentlich gegen ihn testen. Nach
Codewechsel Browser neu laden, gegebenenfalls `Strg+F5`; Flask bei Bedarf neu starten.
Es gibt keinen produktiven Build-Schritt.

## Optionale PDF-Ressourcen

Die sichtbaren Print/PDF-Aktionen rufen `printSheet()` auf: eine erzeugte
HTML-Druckansicht, die über den Browser auch als PDF gespeichert werden kann.
Sie benötigt keine externe PDF-Vorlage. Der ältere Formularpfad `exportPdf()`
ist im Code erhalten, aktuell aber nicht an diese Buttons gebunden.
Er erwartet zusätzlich `window.PDFLib` und entweder
`CC_SHEET_TEMPLATE`/`CC_SHEET_FIELDS` oder die Fallback-Vorlage `CC_PDF_TEMPLATE`.
Die vorhandenen HTML-Script-Includes und tatsächlichen Payloads müssen dazu passen;
das Bereitstellen der Dateien allein verdrahtet keinen neuen UI-Exportweg.

Für die WotC-Fallback-Vorlage die MIT-Bibliothek `pdf-lib` als
`resources/pdf-lib.min.js` lokal bereitstellen und eine eigene berechtigte
form-fillable PDF einbetten:

```powershell
py -3 tools/gen_pdf_template.py "C:\DND-local\eigene-form-fillable-vorlage.pdf"
```

Das erzeugte `resources/pdf-template.js`, die Ausgangs-PDF und alternative
PowerPoint-/PDF-Payloads bleiben lokal. Die Generatoren der alternativen Vorlage
sind kein Teil des Entwicklungsstarts und werden nicht automatisch ausgeführt.
Fehlende PDF-Ressourcen sind kein fehlgeschlagener normaler App-Start.

## Prüfen und private Dateien schützen

Prüfauswahl, Befehle und Grenzen nur in [TESTING.md](docs/TESTING.md),
Linterinstallation in [LINTING.md](docs/LINTING.md) pflegen.
Keine vollständige Regelsuite ohne autorisierte lokale Quelle behaupten.

`.gitignore` ist eine Schutzschicht, keine Zugriffssperre für Agenten. Neue
JSON-Quellen und Ressourcen gezielt auf private/geschützte Inhalte prüfen.
Root- und Browser-Paketmanifeste/Lockfiles sind legitime enge JSON-Ausnahmen;
eine pauschale Forderung nach null getrackten JSON-Dateien ist falsch.
Vor einem erlaubten Commit Dateiliste und Staging-Inhalte prüfen, insbesondere
ungewollte `resources/data-*`, Feature-/Kreaturdateien, Charaktere, PDFs und Secrets.
Keine Ignore-Regel mit `git add -f` umgehen. Packaging-, Hook-, Dropbox- und
Public-Sync-Hilfen nicht automatisch starten.
