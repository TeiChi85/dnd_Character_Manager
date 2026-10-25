# CharacterManager – UI Design Specification

**Version:** 1.0 · **Basis:** CharacterManager UI-Spezifikation v0.3 (Word und Markdown, 23.10.2026)\
**Geltungsbereich:** Responsive Weboberfläche für Android Chrome, iPhone Safari und Desktop-Browser.\
**Designziel:** Eine eigenständige, an der Informationshierarchie und visuellen Dichte von D&D Beyond orientierte Charakterverwaltung für D&D 2014 und 2024.

**Soll und Ist:** Diese Datei bleibt die maßgebliche gewünschte Gestaltung.
Der bestätigte Implementierungsumfang und begründete Abweichungen stehen in
[MOBILE_UI.md](MOBILE_UI.md#umfang-und-abgrenzung); insbesondere ist das mobile
Wizard-Design noch nicht vollständig umgesetzt. Die folgenden Anforderungen
werden durch diese Einordnung nicht geändert oder abgeschwächt.

## 1. Gestaltungsprinzipien

- **Mobile first, Desktop weiterhin vollwertig:** Auf Smartphones sind Bibliothek, Charaktererstellung, Charakterbogen und vorhandene Spielaktionen vollständig erreichbar. Die Desktop-Oberfläche bleibt funktionsgleich und weitgehend in ihrer bisherigen Anordnung erhalten.
- **Funktion vor Ästhetik:** Keine sichtbare Aktion ohne bestehende Funktion; keine Änderung der D&D-Berechnungen, Charakterentscheidungen, Level-Logik oder des Speicherverhaltens durch das UI-Design.
- **Eigenständige Gestaltung:** Dunkle Flächen, kompakte Informationshierarchie, flache Karten und klare Zahlenwerte als Inspiration übernehmen. Keine D&D-Beyond-Logos, proprietären Icons, Illustrationen oder dekorativen Rahmen kopieren. Porträts nur bei rechtmäßiger Verfügbarkeit verwenden.
- **Klare Interaktion:** Unterscheide Anzeige, Auswahl, Bearbeiten und tatsächliches Verbrauchen einer Spielressource. Änderungen am Charakter erfolgen nur nach expliziter Benutzeraktion.
- **Einheitliche Darstellung:** Mobile und Desktop greifen auf denselben Charakterzustand und dieselben berechneten Werte zu. Reine Ansichtspräferenzen beeinflussen den gespeicherten Charakter nicht.

## 2. Designsystem

### 2.1 Farb-Tokens

Die Dark-Mode-Farben sind gestalterische Näherungswerte aus den Referenzen; Kontrast vor Freigabe prüfen. Semantische Tokens auch für den vorhandenen Light Mode einsetzen, statt Dark-Mode-Farben fest in Komponenten zu kodieren.

| Token | Dark Mode | Verwendung |
| --- | --- | --- |
| `--cm-bg` | `#11161A` | App-Hintergrund |
| `--cm-surface` | `#212B34` | Header, Karten, Panels |
| `--cm-surface-raised` | `#293742` | Suchfelder, Filter, erhöhte/ausgewählte Flächen |
| `--cm-text` | `#F3F5F6` | Haupttext und Spielwerte |
| `--cm-muted` | `#8D9AA3` | Sekundärtext, Metadaten, Quellen |
| `--cm-accent` | `#2D94D9` | Navigation, Auswahl, Links, Fokus |
| `--cm-danger` | `#E40611` | Löschen und destruktive Bestätigung |
| `--cm-border` | `#344450` | Kartenkonturen, Trenner |

**Farbsemantik:** Blau kennzeichnet Navigation, Auswahl und Informationsaktionen. Rot wird für Gefahren, Löschen und sparsame Akzente genutzt – nicht pauschal als Primärbuttonfarbe. Erfolg und Warnungen benötigen unterscheidbare, ausreichend kontrastreiche Zustände. Ausgewählte oder deaktivierte Elemente dürfen nicht ausschließlich über Farbe erkennbar sein.

### 2.2 Typografie und Abstände

| Element | Vorgabe |
| --- | --- |
| Schriftfamilie | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Grundtext | 16 px; Zeilenhöhe 1,45–1,55 |
| Sekundärtext | 12–14 px; ausreichender Kontrast |
| Abschnittstitel | 18–20 px; Gewicht 650–750 |
| Seiten-/Charaktertitel | 20–24 px; Gewicht 650–750 |
| Wizard-Schritttitel | ca. 22 px; Hilfetext 14–16 px |
| Kartenüberschriften | 16–18 px; Gewicht 600–750 |
| Große Spielwerte | 28–34 px; Gewicht 700–800; tabellarische Ziffern |
| Abstandsskala | 4 / 8 / 12 / 16 / 24 / 32 px |
| Karten | Radius 8–12 px; dezente Kontur, keine dominanten Schatten |
| Äußerer Smartphone-Rand | 16 px; bei 320 px ggf. 12 px |
| Innerer Kartenabstand | 12–16 px; Kartenabstand 8–12 px |
| Formulare | Schrift mindestens 16 px; Bedienhöhe ca. 44–48 px |
| Interaktive Touchfläche | mindestens 44 × 44 CSS-px, Ziel 48 × 48 |

### 2.3 Responsive Verhalten

| Viewport | Layout |
| --- | --- |
| **320–767 CSS-px: Phone** | Einspaltiger Inhalt, vertikale Karten statt breiter Tabellen, mobile Navigation bei Bedarf |
| **768–1023 CSS-px: Tablet** | Flexible ein- bis zweispaltige Abschnitte, angemessene Nutzung der Breite |
| **ab 1024 CSS-px: Desktop** | Bestehende mehrspaltige Anordnung und Navigation weitgehend erhalten |

- Keine horizontale Scrollbewegung der **gesamten Seite**. Lange Namen, Formeln und Regeltexte umbrechen; nur einzelne, ausdrücklich dafür vorgesehene Filter-/Datenbereiche dürfen intern horizontal scrollen.
- Inhalte bleiben bei 200 % Zoom, Hoch- und Querformat und eingeblendeter Bildschirmtastatur erreichbar.
- Keine globalen `overflow-x: hidden`-Workarounds, die Layoutfehler nur verdecken.
- Bewegung bei `prefers-reduced-motion` reduzieren.
- Die globale Dark-/Light-Mode-Umschaltung bleibt für sämtliche Ansichten konsistent und unabhängig vom Charakter.

## 3. App-Shell und Navigation

### 3.1 App-Shell

- Kompakter Header von ungefähr 56–64 px mit Titel beziehungsweise Charakteridentität und relevanten Aktionen. Bei längerem Scrollen platzsparend zusammenklappbar, ohne kritische Werte oder Aktionen unerreichbar zu machen.
- Scrollbarer Hauptinhalt mit klaren Abschnittstiteln und flachen Karten.
- Mobile Bottom-Navigation von ungefähr 56–64 px plus `env(safe-area-inset-bottom)` **nur für tatsächlich vorhandene Hauptansichten**. Eingabefelder und Aktionsbuttons dürfen durch Navigation oder Software-Tastatur nicht verdeckt werden; bei Bedarf Navigation im Dokumentfluss verwenden.
- Weder Android- noch iOS-Systemleisten imitieren.

### 3.2 Navigationsebenen

1. **Global:** Charakterbibliothek, Charakterbogen und Charaktererstellung/Bearbeitung, soweit im aktuellen Kontext verfügbar.
2. **Charakterbogen:** Auswahl real vorhandener Abschnitte, beispielsweise *Overview, Abilities, Skills, Actions, Inventory, Spells, Features, Training, Background*.
3. **Innerhalb langer Listen:** Suche, Filterchips und aufklappbare Details.

Die mobile Abschnittsauswahl erfolgt vorzugsweise über einen zugänglichen Dialog oder ein Bottom Sheet: aktueller Abschnitt markiert, Zeilen großzügig antippbar, Inhalt bei 320 px scrollbar. Keine Sortier-/Reorder-Funktion anzeigen, solange sie nicht tatsächlich unterstützt und gespeichert wird. Bei Rücknavigation bleiben Eingaben und ungespeicherte Änderungen erhalten; bestehende Bestätigungen bleiben wirksam.

### 3.3 Charakter-Kopfbereich

`CharacterSummary` zeigt Namen, Klasse, Stufe und die unmittelbar spielrelevanten Werte **AC, Initiative, HP** sowie optional ein Porträt. Bei schmaler Breite zweizeilig anordnen statt Werte zu quetschen. Beim Scrollen darf die Zusammenfassung schrumpfen; HP und AC müssen dennoch leicht erreichbar bleiben.

### 3.4 Kontextmenü

Auf Smartphones ein Dialog/Bottom Sheet mit maximal etwa 3–5 zentralen **tatsächlich vorhandenen** Aktionen, etwa Charakter bearbeiten/Level verwalten, Speichern, JSON-Export oder PDF-Export. Ausgeschlossene Scheinaktionen: *My Dice* ohne Würfelfunktion, nicht existierende Bearbeitung, nicht verfügbare Navigationsziele. Speichern, Export und Status ungespeicherter Änderungen müssen auffindbar bleiben.

## 4. Wiederverwendbare UI-Komponenten

| Komponente | Darstellungsvertrag |
| --- | --- |
| `AppShell` | Header, Content, optional Bottom-Navigation, Safe Areas |
| `CharacterSummary` | Name/Klasse/Stufe, AC/Initiative/HP, optional Porträt |
| `SectionSelector` | Aktuelle Abschnittsbezeichnung; Dialog/Bottom Sheet für vorhandene Bereiche |
| `SearchFilter` | Suchfeld oberhalb horizontal scrollbar angeordneter Filterchips; sichtbarer aktiver Zustand |
| `StatCell` | Attributkürzel/-name, Modifikator als Hauptwert, Attributwert sekundär |
| `DataRow` / `SkillRow` | Name links, Hauptkennzahl rechts; Typ, Attribut, Quelle und Status sekundär |
| `ActionRow` | Aktion/Angriff, Typ, Reichweite, Trefferbonus oder SG, Schadensformel; optionale Details |
| `SpellRow` | Zaubername/-grad, Quelle, Reichweite, Wirkzeit, Treffer/SG, Effekt; Details aufklappbar |
| `ItemRow` | Name, Kategorie, ggf. Menge/Gewicht, Equipped/Attuned mit separat erreichbaren Aktionen |
| `TrackedResource` | Klar erkennbare Ressourcenbelegung und große explizite Änderungscontrols |
| `CollapsibleSection` | Überschrift, aktueller Aufklappzustand, zugängliche Detailanzeige |
| `ConfirmDialog` | Deutlicher Gegenstand der Aktion, Folgen und getrennte Bestätigen-/Abbrechen-Buttons |

Komponenten dürfen lange Texte, leere Inhalte, schmale Bildschirme und große Schrift nicht beschädigen. Primäre Tabelleninformationen werden auf Phone als gestapelte Labels/Werte angezeigt.

## 5. Charakterbibliothek

- Charaktere als einzeln antippbare Karten mit Porträt oder Fallback, Name, Level, Klasse sowie Edition/Spezies, soweit verfügbar.
- Karte **öffnen** und separat zugängliches Options-/Löschmenü dürfen nicht dieselbe Touchaktion auslösen.
- Lange Charakternamen zweizeilig anzeigen oder visuell kürzen, aber den vollständigen Namen zugänglich halten.
- Falls eine Suche vorhanden ist: gut sichtbares Suchfeld oberhalb der Liste. Auch leere Liste, Ladezustand, Serverfehler, Offline-Modus und Revisionskonflikt sichtbar darstellen.
- Primäre Aktion **Create New Character** deutlich und oberhalb einer möglichen mobilen Navigationsleiste platzieren.
- Löschen ausschließlich nach ausdrücklicher Bestätigung; Dialog benennt den Charakter und die Wirkung. Bestehende Soft-Delete-/Wiederherstellungssemantik korrekt beschreiben.
- Keine künstliche Begrenzung der Charakteranzahl oder nicht existente Bibliotheksfunktionen aus der Referenz übernehmen.

## 6. Charakterbogen: Bildschirmbereiche

### 6.1 Overview, Attributes, Saves und Senses

- Kompakter Charakterkopf mit AC, Initiative und HP.
- Sechs Attribute **STR, DEX, CON, INT, WIS, CHA** als 3 × 2 Kachelgitter auf typischen Smartphones; bei 320 px gegebenenfalls 2 × 3, wenn andernfalls Inhalte überlaufen.
- Pro Kachel Modifikator deutlich größer als Attributwert; Kachel beschriftet.
- Saving Throws als lesbare Zeilen mit Attribut, Proficiency-Indikator und Bonus.
- Passive Perception, Investigation und Insight sowie weitere Sinne nur anzeigen, wenn bereits verfügbar.

### 6.2 Skills

- Alle 18 vorhandenen Skills erreichbar.
- Je Skill zweizeilige, touchfreundliche Zeile: Name und Bonus prominent; zugehöriges Attribut, Proficiency und Expertise als Sekundärangaben.
- Vorhandene Filter/Suche verwenden; Pin-Funktion nur anzeigen, falls tatsächlich implementiert.

### 6.3 Actions und Combat

- Standardaktionen, Bonusaktionen, Reaktionen und sonstige Aktionen in klar betitelte Gruppen unterteilen, **soweit die vorhandenen Daten die Zuordnung erlauben**.
- Angriffszeilen zeigen Name, Typ, Reichweite, Trefferbonus beziehungsweise Save DC und Schadensformel. Notizen/Regeltexte sind aufklappbar.
- Ressourcen-Tracker sind separat von der Aktion erkennbar und bedienbar. Tippen auf eine Informationszeile darf keine Ressource verbrauchen.
- Keine Würfel-Schaltfläche ohne tatsächlich vorhandene Würfelfunktion.
- Edition (2014/2024) und tatsächliche Charakterwerte bleiben nachvollziehbar.

### 6.4 Spells

- Oben Suchfeld und Filterchips für vorhandene Zaubergrade (All, Cantrips, Grade 1 usw.).
- Spellcasting Modifier, Spell Attack und Save DC als kompakte Kennwerte, soweit für den Charakter verfügbar.
- Zauber als vertikale `SpellRow` mit Name, Grad, Quelle/Art, Reichweite, Casting Time, Treffer/SG und Wirkung; längere Beschreibungen aufklappbar.
- Vorhandene Spell-Slot-, Konzentrations-, Known-/Prepared- und Ressourcenanzeigen zugänglich halten.
- Bearbeiten/Manage Spells nur als tatsächlich funktionierenden Einstieg anbieten. Suche/Filter sollen auch bei längeren Listen stabil bleiben.

### 6.5 Inventory, Equipment und Attunement

- Getrennte visuelle Bereiche für Inventar/Ausrüstung, verfügbare Währung sowie – soweit bereits berechnet – Gewicht und Traglast.
- Jede Gegenstandszeile zeigt Name, Kategorie, optional Menge/Gewicht und Equipped-/Attuned-Status.
- Ausrüsten, Ablegen, Menge und Attunement über klar getrennte Touch-Controls. Bestehende Grenzen erhalten; Attunement-Zähler (z. B. 0/3) ist gegenüber dekorativen Slots vorzuziehen.
- Lange Gegenstandsnamen umbrechen; auf Phone Karten beziehungsweise Zeilen statt breiter Tabellen.
- Keine zusätzliche Party-Inventory-, Container-, Traglast- oder Preisfunktion allein aus den Referenzbildern ableiten.

### 6.6 Speed & Defenses

- Bewegungsarten und Geschwindigkeiten sowie Resistances, Immunities und Vulnerabilities als eigene, beschriftete Gruppen.
- Nur tatsächlich vorhandene Werte/Berechnungen verwenden; verständliche Leerzustände.
- Auf schmalen Smartphones vertikal stapeln und Regelbezeichnungen umbrechen.

### 6.7 Features & Traits

- Sichtbare Such- und Filtermöglichkeiten für vorhandene Kategorien: Class Features, Species Traits und Feats.
- Eigenschaftsname und gegebenenfalls Quelle prominent; langer Regeltext als aufklappbare Beschreibung.
- Bereits vorhandene aktive Features/Ressourcen besser hervorheben als rein erläuternde Texte.
- Keine Merkmale oder Aktivierungsaktionen ergänzen, die nicht durch die vorhandene Anwendung unterstützt werden.

### 6.8 Proficiencies & Training

- Proficiency Bonus als hervorgehobener Zahlenwert.
- Armor, Weapons, Tools und Languages als klar getrennte Gruppen; Quellenangaben sekundär.
- Bearbeitungsaktion nur bei vorhandener Funktion.

### 6.9 Background & Character Details

- Biografische und Hintergrundinformationen als lesbare Absätze und klar beschriftete Werte.
- Lange Texte umbrechen und vollständig erreichbar machen; optional „Mehr anzeigen“.
- Vorhandene narrative Felder anzeigen, jedoch keine neuen persistenten Notes-Kategorien voraussetzen.

## 7. Charaktererstellung: verbindlicher 7-Schritte-Wizard

**Reihenfolge und bestehende Logik bleiben unverändert.** Das Designsystem des Charakterbogens gilt ebenso für den Wizard; die Originalreferenzen enthielten keinen gesonderten Wizard. Die Gestaltung hier ist eine bewusst übertragene Designentscheidung.

### 7.1 Gemeinsames Wizard-Layout

- Kopfbereich: zurück, **Create Character** beziehungsweise Bearbeitungsmodus und nur vorhandene Kontextaktionen.
- Gut lesbarer Fortschritt **Step N of 7** mit Fortschrittsleiste; darunter Schritttitel und kurzer Hilfetext.
- Optionen als flache, auswählbare Karten oder großzügige Form Controls. Gewählte Option durch Accent-Kontur **und** eindeutiges Symbol/Label markieren.
- Formulare mit mindestens 16 px Schrift, sichtbaren Labels, lokalen Fehlermeldungen und ausreichend großen Touchflächen.
- Unten klar benannte Aktionen **Back** und **Continue**; Safe Areas und Bildschirmtastatur berücksichtigen.
- Längere Optionsbeschreibungen aufklappbar, ohne Informationen zu verlieren.
- Auf Phone einspaltig, auf Tablet gegebenenfalls zweispaltig, auf Desktop bestehende Struktur weitgehend beibehalten.

### 7.2 Inhalte je Schritt

| Schritt | UI-Anforderungen |
| --- | --- |
| **1. Class & Features** | Klassen-, Unterklassen-, Stufen- und Feature-Auswahl als touchfreundliche Optionen und hierarchische Detailgruppen. |
| **2. Background & Details** | Hintergrund als Auswahlkarte; bestehende Charakter-/Detailfelder in klaren Formularabschnitten, narrative Langtexte nachgeordnet. |
| **3. Species** | Species-/Lineage-Auswahl über Karten oder großzügige Selects, Zusatzinformationen aufklappbar. |
| **4. Ability Scores** | Point Buy, Standard Array, Roll und Zuweisungen wie bisher; separate Attributkacheln/-zeilen mit nachvollziehbaren Basiswerten und Modifikatoren. |
| **5. Equipment** | Startausrüstung, Alternativen, Gegenstandssuche und Währung als gruppierte mobile Karten; Menge und Auswahl erreichbar. |
| **6. Spells** | Cantrips und Zauber mit Suche, Gradfiltern, gut bedienbaren Zeilen und eindeutigen Auswahlzuständen. |
| **7. Character Sheet** | Übergang in die mobile Charakterbogenansicht mit allen getroffenen Entscheidungen. |

Beim Vor- und Zurücknavigieren bleiben getroffene Entscheidungen erhalten. Vorhandene Regeln für unvollständige Eingaben, Auswahlgrenzen und abhängige Optionen gelten weiter. Level-up und Edit Character bleiben erreichbar. Der Wizard darf für bestehende Charaktere keine neuen Pflichtfelder einführen.

## 8. Dialoge, Status und Accessibility

- Buttons, Checkboxen, Selects und Dialoge sind mit Tastatur und Screenreader bedienbar; sichtbare Fokusindikatoren und sinnvolle Labels sind Pflicht.
- Dialoge und Abschnittsauswahl schließen über explizites Schließen/Abbrechen, Escape und – soweit ohne Datenverlust sinnvoll – außerhalb liegenden Klick. Fokus beim Schließen an den Auslöser zurückgeben.
- In Listen und Panels sind aktiver Filter, Auswahl, Disabled, Loading, Error und Success erkennbar; keine rein farbliche Statuskodierung.
- Server-Speichern, Laden, Löschen und Konflikte zeigen ihre bereits vorhandenen Zustände sichtbar an. Bei Backend-Fehler bleibt der bestehende lokale JSON-Export erreichbar.
- Ressourcen, HP, Ausrüstung und andere Spielwerte ändern sich nicht durch bloßes Rendering, Abschnittswechsel oder Theme-Wechsel.
- WCAG 2.2 AA als Ziel für Kontrast, Fokus und Bedienung. Keine wesentlichen Funktionen nur über Hover.
- Inhalte bleiben bei 200 % Zoom, langen Namen, Bildschirmtastatur und reduzierter Bewegung nutzbar.

## 9. Gestalterischer Funktionsumfang und bewusste Ausschlüsse

**Darzustellen und bedienbar zu halten:** Alle bestehenden UI-Funktionen für Bibliothek, Creator, Charakterbogen, HP/Rast/Ressourcen, Zauber, Inventar, aktiven Effekten, Export und globales Theme, sofern in der tatsächlichen Anwendung vorhanden.

**Nicht aus den Referenzen als neue Funktionen ableiten:** Würfel-FAB, neue Conditions-/Exhaustion-Verwaltung, persistente neue Notes-Felder, Party Inventory, Abschnittssortierung, zusätzliche Container-/Encumbrance-Regeln oder Dummy-Menüeinträge. Wenn solche Funktionen später eigenständig implementiert werden, können die entsprechenden Referenzmuster (Status-Checkboxen, Stufenauswahl, Notizgruppen) separat herangezogen werden; sie sind **nicht** Teil der UI-Designabnahme der bestehenden Anwendung.

## 10. UI-Abnahmekriterien

### 10.1 Bildschirmgrößen und Browser

| Profil | Prüfansicht |
| --- | --- |
| Kleines Android-Phone | 320 × 700, Chromium Touch |
| Typisches Android-Phone | 390 × 844, Chromium Touch |
| Kompaktes iPhone | 375 × 812, WebKit Touch |
| Großes iPhone | 430 × 932, WebKit Touch |
| Tablet | 768 × 1024 und 1024 × 768 |
| Desktop | 1440 × 900, Chromium |

Zusätzlich auf echten Android-Chrome- und iPhone-Safari-Geräten besonders Touchbedienung, Tastatur, Safe Areas und Dateiaktionen prüfen. WebKit-Simulation ersetzt keinen Gerätetest.

### 10.2 Verbindliche UI-Checks

1. **Keine horizontale Gesamtscrollbewegung** auf 320, 375, 390 und 430 px; keine verdeckten Hauptaktionen.
2. **Wizard vollständig:** Alle sieben Schritte mit 2014-/2024-Charakteren bedienbar; Back/Continue, Optionen, Fehlermeldungen und Fortschritt sichtbar; keine verlorenen Eingaben.
3. **Charakterbogen vollständig:** Sechs Attribute, Saving Throws, 18 Skills und sämtliche tatsächlich verfügbaren Actions, Spells, Inventory-, Features-, Speed- und Defense-Inhalte auffindbar.
4. **Spielaktionen:** HP, Rast, Ressourcen, Slots, Equipped/Attuned und weitere vorhandene Controls sind berührbar und verändern Werte ausschließlich nach bewusster Eingabe.
5. **Bibliothek:** Öffnen, Neu anlegen, Speichern und Löschen einschließlich Bestätigung, Fehler- und Konfliktzuständen erreichbar.
6. **Lesbarkeit:** Lange Texte, Gegenstandsnamen, Zauberformeln und Charakterbezeichnungen umbrechen oder sind vollständig zugänglich; Filter mit 30+ Zaubern nutzbar.
7. **Barrierefreiheit:** Touch-Ziele mindestens 44 × 44 px, erkennbare Tastaturfokussierung, beschriftete Controls, Dialog-Fokusführung, sinnvoller Kontrast in Dark und Light Mode.
8. **Responsive Stabilität:** Hoch-/Querformat, 200 % Zoom, virtuelle Tastatur, Safe Areas und `prefers-reduced-motion` unterstützen; Desktop nicht funktional oder wesentlich im Layout verschlechtern.
9. **Erhalt vorhandener Daten und Funktionen:** Nach lokalem JSON- oder Server-Speichern/Laden dieselben Charakter- und Gameplay-Werte; keine neuen UI-Pflichtfelder oder Änderungen an der bestehenden Bedienlogik.
10. **Keine Attrappen:** Sämtliche sichtbaren Navigationspunkte, Buttons und Menüaktionen besitzen eine tatsächlich verfügbare Funktion.

---

*Diese Spezifikation beschreibt ausschließlich das gewünschte User Interface. Implementierungsphasen, Git-Anweisungen, Entwicklungsprozess, Screenshot-Inventare und neue D&D-Funktionswünsche sind bewusst nicht enthalten.*
