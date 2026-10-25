# Charakterzustand und v1-Datenvertrag

Maßgeblich für persistente Frontenddaten ist
[js/core/character-state.js](../js/core/character-state.js), mit struktureller
Validierung aus [character-validation.js](../js/character-validation.js).
Der Controller hält stabile Referenzen auf `state`, `uiState` und `derivedState`;
Reset/Import ersetzen ihre Inhalte in-place. Die API speichert Charakter-JSON
und berechnet keine Regeln; ihr Vertrag steht im [Backend-Handbuch](../server/README.md).

## Feldklassifikation

| Pfad / Gruppe | Kategorie und Lade-Default | Bedeutung |
| --- | --- | --- |
| `edition` | persistent, `null` | `classic` (2014), `one` (2024) oder ungewählt |
| `name` | persistent, leer | Charaktername |
| `className`, `source`, `slug`, `subclassName` | persistent, `null` | Klassen-/Unterklassenreferenzen |
| `hdFaces`, `manualHp`, `level` | persistent, `null`, `null`, `1` | Hit Die, HP-Override, Stufe |
| `choices`, `bgChoices`, `raceChoices` | persistent, `{}` | Feature-/Herkunftsauswahlen |
| `background`, `race`, `raceLineage` | persistent, `null` | Hintergrund, Species/Lineage |
| `bgIsCustom`, `bgCustomName`, `bgCustomDesc` | persistent, `false`, leer, leer | Eigener Hintergrund |
| `details.alignment/faith/lifestyle` | persistent, leer | Charakterdetails |
| `abilities.method/base/assign/other/override/rolled` | persistent, `pointbuy`, sechs Werte 8, `{}`, `{}`, `{}`, `null` | Methode, Basis, Zuweisungen und Overrides |
| `equipment.mode/starting/startingAdded` | persistent, `equipment`, `{}`, `false` | Startausrüstung und Übernahmeschutz |
| `equipment.inventory/currency` | persistent, `[]`, fünf Münzwerte 0 | Items einschließlich Menge/Equip/Attunement/Varianten; Währung |
| `spells.cantrips/spells` | persistent, `[]` | Gewählte Zauber |
| `customLanguages`, `customDefences` | persistent, `[]` | Eigene Ergänzungen; offene Defences-Typabweichung siehe unten |
| `customProficiencies.armor/weapons/tools` | persistent, `[]` | Eigene Proficiencies |
| `portrait` | persistent, `null` | PNG-Data-URL |
| `sheet.hpCurrent/hpEdited` | Gameplay, `null`/`false` | Automatische oder manuell erhaltene HP |
| `sheet.hpTemp/xp/acOther/acOverride/conc` | Gameplay, leer | Temporäre HP, XP, AC-Eingaben, Konzentration |
| `sheet.res/active` | Gameplay, `{}` | Verwendete Hit Dice/Slots/Ressourcen; aktive Effekte |
| `sheet.inspiration/deathSucc/deathFail` | Gameplay, `false`/`0`/`0` | Inspiration und Death Saves |
| `uiState` | nicht persistent | Screen/Schritt, Panels, Suchtexte, Filter, Entwürfe, Editor-/Abschnittszustand |
| `derivedState.fdata`, berechnete Werte | nicht persistent | Geladene Klassenreferenzen, Mods, Proficiency, AC, Angriffe und SGs |
| Dateihandle, Identität, Revision, Requests | Runtime, nicht persistent | Lokale Dateien und Library-Client |

Neue Felder zuerst klassifizieren und mit passenden Roundtrip-/Dirty-State-
Prüfungen absichern. Die exakten vollständigen Defaults stehen im Modul,
keine zweite unabhängig gepflegte Default-Implementierung in der Dokumentation.

## Normalisierung und Serialisierung

Browser-Export: `window.CCCharacterState`; Node: CommonJS derselben Datei.
`createDefault()`, `createEquipment()` und `createGameplay()` erzeugen voneinander
unabhängige persistente Objekte. `normalize(saved)` kopiert JSON-Werte, entfernt
bekannte transiente Pfade, validiert, entfernt `_app`/`_v` aus dem internen State
und ergänzt rekursiv Defaults. Arrays werden vollständig übernommen, nicht
indexweise mit Defaults vermischt. Eingaben werden nicht mutiert.

`serialize(state)` liefert einen abgetrennten validierten Snapshot mit
`_app: "dnd-cc", _v: 1`. `SAVE_KEYS` im State-Modul bestimmt die Reihenfolge
bekannter Root-Felder; `persistentKeys` exportiert eine Kopie dieser Liste für
Vertragstests. **Das ist keine vollständige Whitelist.** Sichere unbekannte
Root- und verschachtelte Zusatzfelder bleiben am bisherigen Pfad erhalten.
Weitere Objektkeys sind sortiert; Arrays behalten ihre Reihenfolge.

Entfernte transiente Pfade:

- Root: `fdata`, `openPanels`, `screen`, `currentStep`, `uiState`, `derivedState`,
  `id`, `revision`, `updated_at`, `identity`, `charFileHandle`.
- `equipment`: `filterType`, `filterQ`.
- `spells`: `levelFilter`, `q`, `preview`.
- `sheet`: `invQ`, `invAdd`, `acEditOpen`, **`dark`**.

Gleichnamige Felder innerhalb eines Items sind keine Root-Servermetadaten und
bleiben erhalten. Nicht-JSON-Werte, Funktionen, Accessors, Zyklen, nicht endliche
Zahlen und unsichere Keys (`__proto__`, `constructor`, `prototype`) gelangen nicht
in übernommene JSON-Bäume. Undefinierte Objektwerte werden ausgelassen; undefinierte
Arrayplätze werden `null`. Die Kopie ruft keine Getter oder `toJSON`-Methoden auf.

### Legacy-Theme und Gameplay

`sheet.dark` ist ein verworfener Legacy-UI-Wert: Die Normalisierung entfernt ihn,
der Serializer exportiert ihn nicht. Das globale Theme wird dadurch nicht gesetzt
oder geändert; [Theme-Vertrag](UI_ARCHITECTURE.md#theme).
Die regulären Loader validieren Rohdaten **vor** der Normalisierung. Ein vorhandenes
Legacy-`dark` muss dort noch vom zulässigen booleschen Typ sein; Normalisierung ist
keine generelle Erlaubnis für ungültige Eingaben. Das Backend kann einen gültigen
Legacy-Wert unverändert aufbewahren; es normalisiert keine Frontenddaten.

`state.sheet` ist Gameplay, keine neue Root-Hülle. `hpEdited` bleibt persistent:
bei `false` folgt die Anzeige dem errechneten Maximum; bei `true` bleiben auch
0 oder negative manuelle HP erhalten. Hit Dice, Slots und Feature-Verbrauch liegen
in `sheet.res`. Gameplay-Synchronisierung erfolgt am Zustandsübergang, nicht im Render.

<a id="import-rollback-und-kompatibilitaet"></a>

## Import, Rollback und Kompatibilität

`loadCharFile()` prüft das 2-MiB-Limit, liest und parst JSON einschließlich
Duplicate-Key-/Struktur-/Portraitprüfung. `loadCharObj()` validiert, normalisiert
auf einen frischen Charakter und lädt benötigte Klassenreferenzen **vor** der
Übernahme. Auswahl-, Import- und FileReader-Generationen verhindern veraltete
Antworten nach Reset, Navigation oder neuerem Charakterwechsel. Während eines
asynchronen Imports entstandene fachliche Änderungen benötigen erneut eine
Verwerfbestätigung. Ein normaler Wizard-Schrittwechsel ist kein Reset.

Erst mit gültigen Referenzen wird der State in-place ersetzt, UI zurückgesetzt
und Gameplay synchronisiert. Bei Dateifehlern oder fehlenden Klassenreferenzen
bleibt der alte Charakter erhalten. Ein Darstellungsfehler stellt persistenten
Snapshot, UI, Referenzen und Dateihandle wieder her. Eine lokale Übernahme trennt
die Serveridentität erst nach Erfolg; Server-Load verwaltet Identität/Revision
im Library-Client. Kein fehlgeschlagener Import darf diese Zuordnung verwerfen.

Sichere v1-Dateien mit fehlenden optionalen Feldern, leeren Objekten oder alten
UI-Feldern benötigen keine separate Konvertierung. Normalisierung ist strukturell,
keine fachliche D&D-Korrektur oder Garantie für beliebige Fremddaten.

## Dirty-State und offene Abweichung

`server-library.js` vergleicht serialisierte Snapshots. Suche, Filter, Panels,
Navigation, Theme und Derived-Daten zählen nicht als Charakteränderung.
Name, Level, Inventar, HP, Ressourcen und Effekte zählen dazu. Der Save behält
seinen abgetrennten Snapshot; spätere Änderungen bleiben dirty. Ein lokaler Save
setzt die Server-Baseline nicht automatisch neu. [Bedienung](SERVER_LIBRARY.md#datenverlustschutz).

**Ungeklärt:** Die UI erzeugt bei eigenen Defences `{kind,value}`-Einträge;
Frontend- und Python-Validator verlangen dort aktuell Strings. Das ist eine
belegte Typabweichung, keine neue Formatvorgabe. Folgen und gewünschte
Kompatibilitätslösung sind in der [Klärungsaufgabe](tasks/CONTRACT_REVIEW.md)
festgehalten; hier wurde keine dynamische Reproduktion oder Korrektur vorgenommen.
Prüfauswahl und Grenzen: [TESTING.md](TESTING.md#pruefauswahl).
