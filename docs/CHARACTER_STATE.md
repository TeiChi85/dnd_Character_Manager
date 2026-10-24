# PR05: Charakterzustand und Serialisierung

## Feldklassifikation vor der Implementierung

`state` bleibt als schlanker App-Adapter fuer persistente Charakterdaten erhalten.
`state.sheet` ist die explizite Gameplay-Gruppe im bestehenden v1-Vertrag.
UI wird in `uiState`, geladene Referenzen in `derivedState` verschoben. Damit
muessen die Rules-Adapter und Dateivertraege nicht unnoetig umgestaltet werden.

| Pfad | Bedeutung / Kategorie | Bisher gespeichert | Kuenftig | Lade-Default | Abhaengigkeit |
| --- | --- | --- | --- | --- | --- |
| edition | Regelversion / Charakter | Ja | Ja | null | Regeln/Referenzen |
| name | Name / Charakter | Ja | Ja | leer | Anzeige/Dateiname |
| className, source, slug, subclassName | Klasse / Charakter | Ja | Ja | null | Featureloader/Regeln |
| hdFaces, manualHp | Hit Die/HP-Override / Charakter | Ja | Ja | null | HP/Levelwechsel |
| level | Stufe / Charakter | Ja | Ja | 1 | Regeln |
| choices | Featureentscheidungen / Charakter | Ja | Ja | {} | Featureauswahl |
| background, race, raceLineage | Hintergrund/Spezies / Charakter | Ja | Ja | null | Referenzen |
| bgIsCustom | Eigener Hintergrund / Charakter | Ja | Ja | false | Hintergrund UI |
| bgCustomName, bgCustomDesc | Hintergrundtext / Charakter | Ja | Ja | leer | Anzeige |
| bgChoices, raceChoices | Spielerentscheidungen / Charakter | Ja | Ja | {} | Regeln |
| details.alignment, faith, lifestyle | Beschreibung / Charakter | Ja | Ja | leer | Anzeige/Export |
| abilities.method | Attributsmethode / Charakter | Ja | Ja | pointbuy | Attributs-UI |
| abilities.base.* | Basisattribute / Charakter | Ja | Ja | sechs Werte 8 | Regeln |
| abilities.assign, other, override | Attributswerte / Charakter | Ja | Ja | {} | Regeln |
| abilities.rolled | Gewuerfelte Werte / Charakter | Ja | Ja | null | Attributs-UI |
| equipment.mode | Startausruestungsentscheidung / Charakter | Ja | Ja | equipment | Ausruestungswahl |
| equipment.starting, startingAdded | Startausruestungswahl/-uebernahme / Charakter | Ja | Ja | {}, false | Verhindert doppelte Uebernahme |
| equipment.inventory[] | Gegenstaende inkl. qty, equipped, attuned, Varianten / Charakter | Ja | Ja | [] | Item-/Rules-Adapter |
| equipment.currency.cp, sp, ep, gp, pp | Waehrungen / Charakter | Ja | Ja | 0 | Anzeige/Export |
| spells.cantrips, spells.spells | Zauberauswahl / Charakter | Ja | Ja | [] | Spell-/Rules-Adapter |
| customLanguages, customDefences | Sprachen/Resistenzen / Charakter | Ja | Ja | [] | Bogen/Export |
| customProficiencies.armor, weapons, tools | Proficiencies / Charakter | Ja | Ja | [] | Bogen/Regeln |
| portrait | PNG / Charakter | Ja | Ja | null | Validierung/Anzeige |
| sheet.hpCurrent | Aktuelle HP / Gameplay | Ja | Ja | null | HP-Anzeige |
| sheet.hpEdited | Manuelle HP erhalten / Gameplay | Ja | Ja | false | Sonst folgt hpCurrent dem Maximum |
| sheet.hpTemp, xp | Temporaere HP/XP / Gameplay | Ja | Ja | leer | Bogen/Export |
| sheet.res.* | Ressourcen, hd:*, slot:* / Gameplay | Ja | Ja | {} | Rest/Pips |
| sheet.inspiration | Inspiration / Gameplay | Ja | Ja | false | Bogen |
| sheet.deathSucc, deathFail | Death Saves / Gameplay | Ja | Ja | 0 | Bogen |
| sheet.active, conc | Effekte/Konzentration / Gameplay | Ja | Ja | {}, leer | Rules Engine |
| sheet.acOther, acOverride | Manuelle AC / Gameplay | Ja | Ja | leer | Rules Engine |
| openPanels | Featurepanels / UI | Nein | Nein | {} | Feature-UI |
| equipment.filterType, filterQ | Itemsuchfilter / UI | Ja | Nein | leer | Itembrowser |
| spells.levelFilter, q, preview | Filter/Suche/Preview / UI | Ja | Nein | leer | Zauber-UI |
| sheet.invQ, invAdd, acEditOpen | Suche/Entwurf/Editor / UI | Ja | Nein | leer/false | Bogen |
| sheet.dark | Historischer Theme-Schalter / UI | Ja | Nein | ignoriert | Globale Theme-Verwaltung |
| screen, currentStep | Navigation / UI | Nur DOM | Nein | edition, class | Wizard |
| fdata | Geladene Klassendaten / Derived | Nein | Nein | null | Async-Loader |
| Proficiency, AC, Angriffe, Mods, SGs | Berechnet / Derived | Nein | Nein | neu berechnen | Core/Engine |
| Dateihandle, Serveridentitaet, Revision, Requests | Laufzeit | Nein | Nein | separat verwaltet | Lokale Dateien/Library |

Unbekannte zulaessige Zusatzfelder bleiben als JSON-Daten an ihrem bisherigen
Pfad erhalten. Bekannte UI-/Runtime-Pfade werden entfernt. `__proto__`,
`constructor` und `prototype` werden auf jeder Ebene abgewiesen. Neue Felder
muessen vor Aufnahme in Defaults als Charakter, Gameplay, UI oder Derived
klassifiziert und durch Roundtrip-/Dirty-State-Tests abgesichert werden.

## Modell und Datenvertrag

`js/core/character-state.js` verwendet `character-validation.js` und bietet im
Browser `window.CCCharacterState`, in Node denselben CommonJS-Export:

- `createDefault()` erzeugt ausschliesslich persistente Defaults, inklusive
  `equipment` und `sheet`; alle verschachtelten Instanzen sind unabhaengig.
- `createEquipment()` und `createGameplay()` kapseln die entsprechenden Gruppen.
- `normalize(saved)` kopiert JSON-Daten, prueft den v1-Vertrag, entfernt bekannte
  UI-/Runtime-Pfade und ergaenzt rekursiv Defaults. Arrays werden vollstaendig
  uebernommen; weder Argument noch verschachtelte Objekte werden veraendert.
- `serialize(state)` erstellt einen abgetrennten, validierten Export mit
  `_app: "dnd-cc", _v: 1`. Bekannte Felder folgen einer festen Reihenfolge,
  weitere Objekt-Keys werden sortiert. Arrays behalten ihre Reihenfolge.
- `persistentKeys` ist eine Kopie der bekannten Root-Feldliste fuer Vertragstests.

`state.sheet` bleibt die Gameplay-Gruppe im bestehenden Dateiformat. Eine neue
Root-Huelle fuer Gameplay wuerde Migration und Rules-Adapter unnoetig vergroessern.
`hpEdited` bleibt absichtlich persistent: bei false folgt `hpCurrent` wie bisher
dem errechneten Maximum, bei true bleiben auch 0 HP oder negative Werte erhalten.
Used Hit Dice, Spell Slots und Feature-Ressourcen liegen weiterhin in `sheet.res`.

Unbekannte sichere Root-/Nested-Zusatzfelder werden beim Laden und erneuten
Speichern erhalten, statt wie bisher unbekannte Root-Felder zu verlieren.
Explizit reservierte Root-Pfade `id`, `revision`, `updated_at`, `identity`,
`charFileHandle`, `uiState`, `derivedState`, `fdata` und `openPanels` werden
ausgeschlossen. Gleichnamige Felder innerhalb eines Items sind keine Root-
Servermetadaten und bleiben erhalten. Alle bekannten UI-Pfade aus der Feldtabelle
werden auch aus alten Saves entfernt. Dateihandles, Funktionen, Accessors,
Nicht-JSON-Objekte, Zyklen und unsichere Keys gelangen nicht in Exporte.

Die Validierung bleibt strukturell, ohne D&D-Neuberechnung. Bestehende v1-Dateien
mit optionalen/leeren Objekten, Legacy-UI oder fehlenden Feldern funktionieren
ohne Konvertierungsaktion. Der Server akzeptiert diese optionalen Felder bereits;
API und Python-Validierung benoetigen keine Schemaaenderung.

## Laden, Zuruecksetzen und Fehler

Lokale Dateien werden zuerst mit Groessenlimit, JSON-/Duplicate-Key-/Portrait-
und Strukturpruefung gelesen. Der gemeinsame Loader normalisiert auf frische
Defaults und laedt erforderliche Klassendaten vor dem State-Wechsel. Generationen
schuetzen Dateileser, Importanforderungen und Klassenantworten vor veralteten
Antworten nach Reset, Navigation oder einem neueren Charakterwechsel.

Erst mit vorhandenen Referenzen wird der persistente State in-place ersetzt,
der UI-State zurueckgesetzt und die Anzeige aufgebaut. Waerend des Ladens
gemachte fachliche Aenderungen benoetigen eine erneute Verwerf-Bestaetigung.
Bei fehlerhaften Daten oder fehlenden Klassenreferenzen bleibt der bisherige
Charakter unveraendert. Ein Renderfehler stellt den persistenten Snapshot,
UI-State, Referenzen und Dateihandle wieder her. Server-Identitaet und Konflikt-
informationen werden erst nach erfolgreichem lokalen Import getrennt.

Server-Load verwendet dieselbe Pipeline nach der vorhandenen serverseitigen
Vorbereitung; Revision und Identitaet bleiben im Library-Client. Recent Files
nutzen weiterhin `loadCharFile`, Save-as-New weiterhin den Serializer. Reset
leert Charakter-, Gameplay-, UI- und Derived-State und invalidiert Ladeantworten.

## Dirty-State und Darstellung

`server-library.js` bleibt unveraendert. Sein Snapshot-Vergleich sieht nur den
neuen persistenten Export. Suchtexte, Filter, Preview, Panelzustand und Wizard-
Navigation erzeugen keinen Dirty-State. Namen, Level, Inventar, HP, Ressourcen,
Effekte und andere fachliche Aenderungen tun dies weiterhin. Ein laufender Save
behaelt seinen abgetrennten Snapshot; spaetere lokale Aenderungen bleiben dirty.
`If-Match`, Konflikterkennung, Request-Sperre und Wechselbestaetigungen bleiben
erhalten.

`uiState` wird bei normalen Renders nicht neu erzeugt. Auch der Custom-Item-
Entwurf bleibt sichtbar. Bei Import/Reset wird er auf die dokumentierten Defaults
gesetzt. Das historische `sheet.dark` wird ignoriert; das globale Theme wird
weiterhin ausschliesslich durch die vorhandene Theme-Verwaltung gesteuert.
Rules Core und Engine lesen unveraenderte persistente Fachwerte; Referenzen
werden ihnen durch Adapter aus `derivedState.fdata` zugaenglich gemacht.

## Tests, Grenzen und PR06

Der neue datenfreie Unit-Runner prueft Defaults, unabhaengige Referenzen, sichere
Normalisierung, Gameplay-Roundtrips, Unknown Fields, stabile Serialisierung und
Mutation-/Prototype-Schutz. Frontendtests ergaenzen UI-/Gameplay-Dirty-State,
Save-Snapshots, lokale/serverseitige Imports, invalide Dateien, Rollback,
Dateihandles und verspaetete Antworten. Die synthetische Rules-Adaptersuite
prueft Sheet-/Regelwerte nach Import, Reset, Level- und Charakterwechsel fuer
beide Editionen. Testbefehle und Grenzen: [TESTING.md](TESTING.md).

Keine echte Browser-/Dateipicker-/PDF-Abnahme; Harnesses simulieren DOM und
Browser-APIs. Die bestehende vollstaendige Regelsuite benoetigt weiterhin lokale
autorisierte Daten. Kleine App-Adapter und Textinterpretation bleiben in app.js;
eine allgemeine State-Management-Bibliothek wird nicht eingefuehrt.

PR06 kann UI-Komponenten gegen die nun getrennten `state`, `uiState` und
`derivedState` aufbauen. Voraussetzung sind gruen gebliebene Import-/Dirty-State-
und Rules-Regressionen; der v1-Vertrag und die hier dokumentierte Feldklassifikation
sollten beim Extrahieren der Renderkomponenten verbindlich bleiben.
