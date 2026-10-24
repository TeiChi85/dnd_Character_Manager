# PR06: UI-Architektur

## Referenz und Extraktionsplan vor der Implementierung

Referenz ist die lokal vom Nutzer bereitgestellte `docs/UI_DESIGN_SPEC.md`,
Version 1.0. Die Datei ist die einzige UI-Designspezifikation im Checkout;
auf main lag beim Start keine weitere Spezifikation. PR05 ist in main gemergt.
Die Nutzerdatei wird als Referenz dieses PRs aufgenommen; nur zwei Markdown-
Hardbreaks wurden ohne Inhaltsaenderung whitespace-frei geschrieben.

Vorher: `app.js` erzeugt Creator-, Sheet-, Library- und Regeltext-HTML, registriert
lokale/globalen Events und koordiniert State, Rules, Dateizugriff und Navigation.
Legacy-Tests rufen die Renderfunktionen ueber textuelle Testinstrumentierung auf.

| Bereich | Abhaengigkeiten / Seiteneffekte | Geplante Grenze |
| --- | --- | --- |
| Escaping, Karten, Werte, aufklappbare Panels | Text bzw. bereits gerendertes HTML; keine Fachregeln | `ui/components.js` |
| Regeltextdarstellung | Referenzen, Tags, Spell-Metadaten; HTML, keine State-Aenderung | `ui/rule-text.js` mit expliziten Adaptern |
| Wizard | State/UI/Referenzen, Choices-/Rules-Adapter; lokale Formular-Events | `ui/creator.js`, getrennte Exporte je Schritt |
| Bogen | State/UI, Rules-/Listenadapter; lokale Gameplay-Events | `ui/character-sheet.js`, getrennte Abschnittsrenderer |
| Navigation | View-State, DOM, Render-/Reset-/Save-Callbacks; Scrollen und Menue-Events | `ui/navigation.js`, einmalige Bindung |
| Bibliothek | Listen-/Statusdaten, Delete-Dialog, Open-/Remove-Callbacks | UI-Adapter; Requests/Identity bleiben im Library-Client |
| Berechnungen, Dateninterpretation, Import/Export | State/Rules/Async-Generationen/Dateihandles | Controller-Adapter bleiben erhalten |

Vorgehen: gemeinsame Komponenten zuerst, dann Regeltext und klar benannte
Creator-Funktionen, danach Bogenabschnitte und Navigation. Abhaengigkeiten jeder
Funktion werden vor der Extraktion aufgelistet und ueber einen expliziten
Kontext uebergeben. Kleine Controller-Wrapper erhalten bisherige Test-/Export-
Schnittstellen; es gibt keine Kopie von State, Rules oder Serialisierung.

Bekannte Seiteneffekte im alten Sheet-Rendering: automatische HP-Nachfuehrung,
Entfernen unmoeglicher Attunements und zusaetzlicher getragener Ruestung sowie
Defaults fuer Custom-Proficiencies/Defences. Diese gehoeren an die vorhandenen
State-Uebergaenge, nicht in reine Renderer. Die Anzeige automatischer HP muss
weiterhin dem Maximum folgen; `hpEdited` behaelt seine Semantik.

## Zuordnung zur Designspezifikation

| Vorgabe der Designspezifikation | Zustaendiges UI-Modul | In PR06 vorbereitet? | In PR07 umzusetzen? |
| --- | --- | --- | --- |
| 3.2: Global / Bogenabschnitte / Listen | navigation + benannte Abschnittsrenderer | Schnittstellen und View-State | Bottom-Navigation, SectionSelector |
| 3.3/4: CharacterSummary, AC/Initiative/HP | character-sheet: Header | Gemeinsame Fachwerte | Kompakter mobiler Header |
| 4: StatCell, DataRow, CollapsibleSection | components + character-sheet | Wiederverwendbare Bausteine | Touchflaechen und responsive Anordnung |
| 5: Bibliothek, Offline/Error/Conflict, Delete | Library-UI + vorhandener API-Client | Vorhandene Events/Status erhalten | Mobile Karten/Optionsmenue |
| 6.1: Attribute, Saves und Senses | character-sheet: Overview/Training | Getrennte Abschnitte | 3x2-/2x3-Kacheln |
| 6.2: 18 Skills, Proficiency/Expertise | character-sheet: Skills | Berechnete Werte aus Adaptern | Touchfreundliche SkillRow |
| 6.3: Actions/Combat und explizite Ressourcen | character-sheet: Combat/Resources | Information getrennt von Verbrauch | Gestapelte ActionRow |
| 6.4: Spells, Slots, Konzentration | creator: Spells + character-sheet: Spells | Vorhandene Filter/Controls | Mobile SpellRow |
| 6.5: Inventory/Currency/Attunement | creator: Equipment + character-sheet: Inventory | Getrennte lokale Events | Mobile ItemRow |
| 6.6: Speed/Defenses | character-sheet: Header/Skills/Defenses | Benannte Bereiche | Vertikale Gruppen |
| 6.7/6.8/6.9: Features, Training, Background | character-sheet: Features/Training/Background | Eigenstaendige Renderer | Mobile Abschnittsauswahl |
| 7: verbindlicher 7-Schritte-Wizard | creator + navigation | Reihenfolge/Choices bleiben erhalten | Fortschritt und mobile Wizard-Navigation |
| 2/8/10: Farben, Fonts, Touch, Safe Areas, Zoom | Bestehende CSS-/Theme-Schicht | Keine Designaenderung | Gesamte visuelle/Geraete-Abnahme |

Keine neuen Funktionen, Farben, Icons oder Layouts in PR06. Schema, Flask-API,
Rules Core/Engine und Character-State-Vertrag bleiben unveraendert.

## Implementierte Modulstruktur

```text
js/
  app.js                       Controller, Daten-/Rules-Adapter, Import/Export
  core/character-state.js      einziger persistenter v1-Datenvertrag
  core/rules-core.js           reine Grundberechnungen
  core/rules-engine.js         reine komplexe Berechnungen
  ui/components.js             Escaping, Card, Value, Panel, idempotente Bindung
  ui/rule-text.js              Entry-/Tag-/Inline-Darstellung und Tooltips
  ui/creator.js                Header und unabhaengige Wizard-Schritte
  ui/character-sheet.js        Bogenkomposition, Abschnittsrenderer, lokale Events
  ui/navigation.js             Screens, Schritte, Menue, Save/Load/Print-Callbacks
  ui/library.js                Listen, Status, Busy-Zustaende und Loeschdialog
  server-library.js            unveraenderter HTTP-/Revision-/Dirty-State-Client
  theme.js                     unveraenderte globale Theme-Verwaltung
```

Alle UI-Dateien sind klassische Browser-Skripte und zugleich ohne Bundler per
CommonJS ladbar. `index.html` laedt sie nach den Core-Modulen und vor `app.js`.
Die UI-Factories exportieren `create(context)`. Das Modul importiert `app.js`
nicht. Der Controller stellt eine stabile Referenz auf `state`, `uiState` und
`derivedState` bereit; Reset/Import ersetzen deren Inhalt weiterhin in-place.
Es gibt weder einen zweiten State noch eine zweite Serialisierung.

## Kontext und Verantwortlichkeiten

`uiContext(pure)` liefert `{character, ui, derived, document, window, actions,
adapters, constants}`. `character` ist der persistente State, `ui` enthaelt
Ansicht, offene Panels, Suchtexte und Entwuerfe; `derived.fdata` ist geladene
Referenzinformation. Die vom Modul tatsaechlich benoetigten Adapter und
Konstanten sind am Anfang seiner Factory einzeln benannt. `window` ist explizit
uebergeben fuer bestehende Referenzkataloge und Browseraktionen.

Adapter rufen vorhandene App-Funktionen dynamisch auf. So bleiben der aktuelle
State, die Generationen und auch instrumentierte Testfunktionen aktuell.
Die breite Adapterliste ist eine bewusste Uebergangsgrenze, keine neue Domain-
API. UI-Module rufen weder Core noch Engine direkt auf. Auch Spell-Summary,
Ressourcen-Maxima und Short-Rest-Hinweise kommen aus Controller-Adaptern;
`spellPresentation(info, withItems)` bewahrt ausdruecklich den bestehenden
Unterschied zwischen Creator- und Sheet-Zauberboni.

`components` kennt keine D&D-Regeln. `card(title, bodyHTML)` und `value(valueHTML,
label, why)` erhalten bereits sicheres Renderer-HTML; Titel/Label/Tooltip werden
escaped. `panel` escaped Namen und Keys; `subtitleHTML`, `badgeHTML`, `bodyHTML`
sind ausschliesslich vertrauenswuerdige Ausgabe anderer Renderer. Insbesondere
Source-Tags bleiben HTML statt versehentlich als Text dargestellt zu werden.
Freie Namen, Entwuerfe und Suchtexte werden an der Ausgabestelle escaped.
Bibliotheksmetadaten werden weiterhin per `textContent` gesetzt.

## Creator und Bogen getrennt weiterentwickeln

Creator: `renderHeader()` sowie `renderStep(step)` fuer `class`, `background`
(einschliesslich Details), `species`, `abilities`, `equipment`, `spells`.
Die bisherigen benannten Renderer bleiben exportiert und durch kleine
App-Wrapper erreichbar. Features/Unterklasse/ASI, Formularfelder, Inventory-
und Spell-Filter haben ihre bisherigen lokalen Events und DOM-Vertraege.
Ein einzelner Schritt laesst sich aktualisieren, ohne den Bogen anzufassen.

Sheet: `renderSheet()` beherrscht fehlende Klassen-/Referenzdaten und den
bisherigen sichtbaren Fehlerzustand. `renderSheetInner(host)` komponiert die
bestehende fuenfspaltige Ansicht in gleicher Reihenfolge. `sheetView()` bereitet
Profizienz, AC, Initiative, maximale HP und Spell-Information einmal je Aufruf vor.
`renderSection(name, host)` ersetzt ausschliesslich einen Abschnitt im Ziel und
bindet dessen lokale Controls. Die Namen in `sections` sind:

| Abschnitt | Ausgabe / explizite Fachabhaengigkeiten ueber Kontextadapter |
| --- | --- |
| `header` | Identitaet, Speed, Initiative, AC, Save DC, HP, Inspiration, Effektleiste |
| `training` | Abilities, Saves, Senses, Proficiencies und Languages |
| `skills` | 18 Skills, Expertise-/Advantage-Marker und Passive Senses |
| `defences` | berechnete und manuell ergaenzte Defences |
| `combat` | Angriffe, Schaden, Action Economy und Beschreibungen |
| `resources` | Ressourcen-Maxima, Pips und Class Options |
| `spells` | Slots, bekannte/angeborene/Feat-Spells und Konzentration |
| `inventory` | Currency, Items, Varianten, Equip, Attunement und Suche |
| `features` | Feature Cards, Traits und explizite Effekt-Checkboxen |
| `background` | Background und Details |
| `rest` | Hit Dice, Short/Long Rest und Death Saves |

Die zusammengesetzten Bereiche (z.B. Training) koennen in PR07 weiter visuell
aufgeteilt werden. Ihre fachlichen Listen stammen weiterhin aus den bestehenden
Adaptern. Reine Beschreibungs-Klicks verbrauchen keine Slots/Ressourcen.

## Lifecycle, Events und Navigation

`initializeUI()` erzeugt die Instanzen einmal nach Definition der Kataloge und
Adapter. `render()` delegiert Header/Creator-Schritte/Sheet in der bisherigen
Reihenfolge. Es gibt keinen neuen Scheduler oder virtuellen DOM. Bewusst bleibt
der bisherige komplette Redraw nach vielen Gameplay-Aktionen erhalten.
Suchfelder und mehrere lokale Eingaben aktualisieren weiterhin nur ihre Listen
oder den betroffenen Creator-Schritt.

Reines Rendern und `setStep()` veraendern keine persistenten Daten. Die frueher
im Sheet versteckte HP-/Inventory-Bereinigung liegt in `synchronizeGameplay()`:
beim erfolgreichen Import innerhalb des Rollback-Schutzes und bei den
Gameplay-Redraw-Aktionen (`renderAfterChange`). Automatische HP werden zur
Anzeige aus dem Maximum gelesen, solange `hpEdited` false ist; manuell gesetzte
HP bleiben erhalten. Bei unvollstaendigen Referenzen wird kein bestehender
HP-Wert durch ein nicht berechenbares Maximum ersetzt. Defaults fuer Custom-
Defences/Proficiencies liefert bereits das State-Modul.

Navigation erhaelt einen reinen Render-Callback (`uiContext(true)`). `mount()`
registriert Menue-/Dokument- und Back/Next-Events nur einmal. Escape und ein
Klick ausserhalb schliessen das Menue; Scrollen, aktive Schritte und breite
Sheet-Ansicht bleiben erhalten. Edition/Home, Save, Load und Print werden an
Controller-Aktionen delegiert. Home/Edition duerfen nach bestaetigtem
`serverLibrary.canLeave()` gezielt resetten. Ein gewoehnlicher Schrittwechsel
resettet nichts. Dirty-/Busy-Schutz, Beforeunload und Serveridentitaet bleiben
im vorhandenen Client/Controller.

Lokale Renderer ersetzen ihre eigenen Knoten und registrieren Events auf den
neuen Knoten. Es gibt keine Dokument-Listener je Render. `components.on()` und
`collapse()` ersetzen eine bereits vorhandene Bindung am selben Knoten.
`bindSheetEvents(host)` sucht Controls nur im eigenen Ziel; Inventory-Suche
verwendet ebenfalls dieses Ziel. Bei Gameplay-Events wird anschliessend der
zentrale Controller-Redraw aufgerufen. PR07 muss seine aktiven Hosts dort
einbinden, wenn Abschnitte in andere Container verlegt werden.

## Asynchrones Laden

Klassen-/Feature-Lader, Cache, Import- und FileReader-Generationen bleiben im
Controller. Antworten duerfen nur die aktuell gueltige Auswahl bedienen.
Home invalidiert ausstehende Auswahlvorgaenge ueber eine explizite Aktion.
Import bereitet Referenzen vor, uebernimmt State atomar und rollt bei einem
Darstellungsfehler State, View und Dateihandle zurueck. Die UI haelt keine
eigenen Requests, dauerhaften Klassenreferenzen oder unabhaengigen Caches.

## Tests und Grenzen

`validate_ui_components.mjs` prueft generische Komponenten und die echte App
mit `ui_test_harness.mjs`: synthetische Kataloge, reales `index.html`, echte
Factories, Renderer und Event-Handler. Factory-Aufrufzaehler belegen die
produktive Verwendung. Geprueft werden Schrittwahl/Formulare, Isolation,
Gameplay-Controls, Escaping, mehrfache Bindung, Reset und Rendering mit tief
eingefrorenem State, einschliesslich ungewoehnlicher Inventareingaben.

Die bestehenden Frontend-/Klassenlade-/Adapter-Harnesses laden alle Module und
behalten ihre Assertions. Die Legacy-Suite ruft dieselben produktiven Renderer
ueber bestehende Wrapper auf; nur statische DOM-/Icon-Vertragssuchen lesen nun
auch deren neue Quelldateien. Keine fachliche Assertion wurde entfernt.
Neue UI-Tests laufen in der Windows-/Ubuntu-CI ohne private Regeldaten.

Grenzen: Der kleine DOM-Harness ist kein Browser und simuliert weder Layout
noch vollstaendige Event-Bubbling-/Dateipicker-/PDF-APIs. Die lokalen
HTML-Paritaetsvergleiche mit main ersetzen keine visuelle Geraeteabnahme.
Der bestehende Library-Live-Test wird nur gegen isolierten Testspeicher
ausgefuehrt; der laufende Benutzerserver wird hierfuer nicht verwendet.

Im Controller verbleiben eng gekoppelte Daten-/Rules-Adapter und deren kleine
Choice-/Proficiency-/Defence-HTML-Fragmente, lokale Dateipicker/IndexedDB-
Recents, Portrait-Verarbeitung und Print-/PDF-Exporte. Eine erneute fachliche
Parser-/Export-Zerlegung wuerde diesen PR unnoetig vergroessern. Die exportierten
UI-Wrapper bleiben fuer Legacy-Tests und Exportfunktionen erhalten.
Die neuen Module beseitigen diese Uebergangskopplung nicht vollstaendig.

## Voraussetzungen fuer PR07

Auf Basis dieses gemergten PRs den bestehenden Context-Vertrag und die
Abschnittsnamen verwenden. Pro Ansicht nur eine Instanz vorhandener DOM-IDs
mounten; bei neuen Tab-/Panel-Hosts den Controller-Redraw darauf ausrichten.
Mobile Reihenfolge, Navigation, Touchziele, Safe Areas, Fonts, Farben und Icons
nach `UI_DESIGN_SPEC.md` umsetzen. Danach echte Browser-/Touch-/Tastaturtests
in beiden Themes und fuer Creator, Library und alle Sheet-Abschnitte ergaenzen.
Rules-/State-Vertrag und die vollstaendige lokale Baseline bleiben die
Regressionsgrenze fuer das visuelle Redesign.
