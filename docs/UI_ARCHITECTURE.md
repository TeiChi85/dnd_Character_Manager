# PR06: UI-Architektur

## Referenz und Extraktionsplan vor der Implementierung

Referenz ist die lokal vom Nutzer bereitgestellte `docs/UI_DESIGN_SPEC.md`,
Version 1.0. Die Datei ist die einzige UI-Designspezifikation im Checkout;
auf main lag beim Start keine weitere Spezifikation. PR05 ist in main gemergt.
Die unveraenderte Nutzerdatei wird als Referenz dieses PRs aufgenommen.

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
