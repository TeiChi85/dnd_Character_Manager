# PR07: Mobile Library und Character Sheet

Verbindliche Gestaltung: [UI_DESIGN_SPEC.md](UI_DESIGN_SPEC.md) v1.0.
PR07 setzt Library, Character Sheet und deren Navigation um. Der bestehende
siebenstufige Builder bleibt unveraendert; sein mobiles Redesign folgt in PR08.
Secure Deployment ist separat fuer PR09 vorgesehen.

## AppShell und Navigation

`css/mobile.css` ergaenzt die bisherigen Styles. `navigation.syncShell()` setzt
`body.cm-view` ausschliesslich auf der Library und dem Sheet. Die Titelzeile,
semantischen Farben und Bottom Navigation sind an diesen Kontext gebunden.
Der Builder behaelt die bisherigen CSS-Werte und das vorhandene Menue.

Auf Phone und Tablet zeigt die Bottom Navigation Library, Character und Build;
die letzten beiden benoetigen einen geladenen Charakter. Library-Navigation
behaelt den aktuellen Charakter und ungespeicherte Eingaben im Speicher.
Das Oeffnen eines anderen Charakters und der Beginn einer neuen Erstellung
verwenden weiterhin den vorhandenen Dirty-/Busy-Schutz. Ein laufender Save
blockiert den Wechsel zur Library. Das bisherige Start-Page-Menue im Builder
behaelt seine ausdrueckliche Reset-/Bestaetigungssemantik.

Browser-History verwendet nur nicht persistente Ansichten (`library`,
`character`, `build`). Beim SectionSelector entsteht ein History-Eintrag;
Browser Back schliesst einen offenen Dialog, bevor Ansichten gewechselt
werden. Ein History-Ziel rekonstruiert keinen Charakter aus einer URL.
Nach einem vollstaendigen Reload wird deshalb zuerst die Library angezeigt.

Die mobile Actions-Auswahl bietet die vorhandenen Funktionen Edit/Level,
lokales JSON-Speichern und Print/PDF. Server-Save, Save as New, Status und
Konfliktaktionen bleiben in der bestehenden Serverleiste erreichbar.
Es gibt keine neue Speicherimplementierung oder automatische Retries.

## Library

`ui/library.js` rendert Karten aus der bestehenden Listen-Metadatenantwort:
Name, Klasse, Level, Edition und Aenderungsdatum. Da die Listen-API kein Portraet
liefert, ist der Anfangsbuchstabe ein ehrlicher Fallback; es werden keine
vollstaendigen Charaktere nur fuer Vorschaubilder nachgeladen.

Suche filtert ausschliesslich die bereits geladenen Namen/Klassen im Browser.
Oeffnen und Loeschen sind getrennte Buttons. Der bestehende native Loeschdialog
benennt den Charakter und den privaten Server-Papierkorb. Abbrechen stellt
den Fokus wieder her; nach erfolgreichem Loeschen bleibt Refresh erreichbar.
Requests, Revisionen, Backup/Recovery und Serveridentitaet bleiben unveraendert.

Leere Liste, Suche ohne Treffer, Laden, Offline-/Serverfehler, Save-Erfolg,
ungespeicherte Eingaben und Konflikte besitzen sichtbare Textmeldungen.
Neue Charaktere beginnen ueber Create New Character mit der bisherigen
Editionswahl und dem bestehenden Builder. Lokales JSON-Laden bleibt erreichbar.

## Sheet und SectionSelector

`character-sheet.renderSheet()` waehlt die Komposition anhand von `matchMedia`.
Unter 1024 px werden zwei **disjunkte** Hosts aufgebaut:

- `mobileSheetHeader`: `renderSection("header", host)` mit Name, Klasse/Level,
  Portraet und den vorhandenen AC-/Initiative-/HP-Werten.
- `activeSheetSection`: `renderSection(selected, host)` fuer genau einen Bereich.

Die drei primaeren Spielwerte bleiben im kompakten Kopf. Weitere vorhandene
Werte (Profizienz, Speed, Save DC, Inspiration, temporaere HP, XP) liegen in
einem nativen Details-Element. Dessen Controls werden verschoben, nicht kopiert;
insbesondere existiert `hpCur` nur einmal.

Der SectionSelector ist ein nativer modaler Dialog mit eigenem Titel,
scrollbaren Auswahlbuttons, markierter aktueller Auswahl, Close/Escape,
Hintergrund-Klick und Fokus-Rueckgabe. Er bietet nur vorhandene Bereiche:

| Bereich | Bestehende Inhalte und Interaktionen |
| --- | --- |
| Overview & Training | sechs Attribute, Saves, Senses, Proficiencies, Languages |
| Skills | 18 Skills, Boni, Proficiency/Expertise, passive Werte |
| Combat & Actions | Angriffe, Reichweite, Hit/DC, Schaden, vorhandene Action-Economy-Gruppen |
| Class Resources | Pips und vorhandene Class Options/aktive Effekte |
| Spells | Suchfeld, Gradfilter, Spellcasting-Modifier/Attack/DC, bekannte/angeborene/Feat-Zauber, Slots, Konzentration |
| Inventory | Currency, Menge, Items, Varianten, Equip, Attunement, Suche und Custom Items |
| Features & Traits | Namenssuche, vorhandene Herkunftsfilter, Beschreibungen, Aktivierungen |
| Speed & Defences | Bewegung, Resistances/Immunities/Vulnerabilities und bestehende Ergaenzungen |
| Background & Details | vorhandener Hintergrund und Charakterdetails |
| Rest & Death Saves | Hit Dice, Short/Long Rest und Death Saves |

Spielwert-Aenderungen verwenden weiterhin die vorhandenen Handler/Adapter.
Der zentrale Controller-Redraw rendert Header und den aktuell gewaehlten Host
erneut. Abschnitt, Suchtexte und Filter liegen nur in `uiState.sheet`; sie
werden weder serialisiert noch fuer Dirty-State herangezogen. Filter aktualisieren
ihren Abschnitt direkt und geben Suchfeld-Fokus/Caret zurueck.

Pips, Death Saves, Effekte und bestehende aufklappbare Zeilen erhalten Labels,
Tastaturbedienung und passende Button-/Expanded-/Pressed-Semantik. Das Oeffnen
einer Beschreibung ist weiterhin getrennt von Ressourcenaenderungen.

## Designsystem, Themes und Breakpoints

Die neuen `--cm-*`-Tokens gelten fuer Library/Sheet/Dialoge. Sie ersetzen keine
globalen Builder-Tokens. Dark-Basis ist `#11161A`, Surface `#212B34`, Raised
`#293742`, Text `#F3F5F6`, Accent `#2D94D9`, Border `#344450`.
Muted-Text ist fuer ausreichenden Kontrast auf `#A8B5BD` aufgehellt;
Danger-Text verwendet `#FF6770`. Light verwendet helle Flaechen, dunklen Text
und `#076BAB` als Accent. `--cm-on-accent` ist auf Dark dunkel und auf Light
weiss: Weisser normal grosser Text auf dem helleren Dark-Accent waere zu schwach.
Die automatisierten Farbpruefungen verlangen mindestens 4,5:1 fuer Haupttext,
Muted-Text und die verwendete Accent-Buttonkombination. Dies ist keine komplette
WCAG-Zertifizierung.

Systemschrift, tabellarische Zahlen, 8–12-px-Radien, 12–16-px-Kartenpadding und
mindestens 44-px-Controls bilden die Grundlage. Lange Namen und Texte umbrechen;
Regeltabellen koennen innerhalb einer Karte scrollen. Es gibt keinen globalen
`overflow-x:hidden`-Workaround und keine fremden Markenassets.

| Breite | Darstellung |
| --- | --- |
| 320–767 px | einspaltige Section, 16 px Aussenrand (320 px: 12), Bottom Navigation |
| 768–1023 px | zweispaltig nutzbare Section-Karten, gleicher Zustand/Renderer |
| ab 1024 px | bisherige mehrspaltige Sheet-Komposition und Desktop-Navigation |

Attribute stehen auf typischen Phones 3x2, bei 320 px 2x3. Angriffe werden
unterhalb 1024 px als gestapelte, beschriftete Werte dargestellt. Safe-Area-
Abstaende und Inhaltsreserve halten die untere Navigation erreichbar. Bei
fokussierten Eingaben wechselt sie in den Dokumentfluss. Reduced Motion wird
beruecksichtigt. Das globale Theme bleibt die vorhandene, vom Charakter
unabhaengige `theme.js`-Praeferenz.

## Reproduzierbare Tests

Schnell, ohne npm oder Regeldaten:

```powershell
node tools/validate_mobile_ui.mjs
node tools/validate_ui_components.mjs
```

Browserpruefung mit Node **20+** (CI: 22), ausschliesslich Entwicklungsabhaengigkeiten:

```powershell
npm.cmd ci --prefix tools/browser
npx.cmd --prefix tools/browser playwright install chromium webkit
node tools/browser/mobile.mjs
```

Unter Linux `npm`/`npx` ohne `.cmd`; fuer Browser-Systembibliotheken:
`npx --prefix tools/browser playwright install --with-deps chromium webkit`.
Playwright ist auf 1.64.1 gepinnt. Die beiden gezielten JSON-Ignore-Ausnahmen
enthalten ausschliesslich dessen oeffentliches Paketmanifest und Lockfile.
Es entstehen keine produktiven npm-Abhaengigkeiten und kein Build-Schritt.

Der Runner startet einen eigenen HTTP-/API-Testserver auf einem freien
Loopback-Port. Alle Charaktere, Kataloge und Requests sind synthetisch.
Generierte Ressourcen-Skripte werden durch leere Antworten ersetzt;
der Nutzerserver und seine Charakterdateien werden nicht angesprochen.
Getestet werden Chromium und WebKit, beide Themes, jeweils 320x700, 375x812,
390x844, 430x932, 768x1024, 1024x768 und 1440x900.

Die Matrix prueft Ueberlauf, Controls, Navigation/Dialogfokus, alle Bereiche,
Filter, Theme und Persistenz von HP/Slots/Equip/Attunement nach Reload.
Weitere Szenarien pruefen leere Library, Delete/Cancel, Konflikt, Offline,
lokalen JSON-Import/-Export und beide Builder-Editionen. Eine Style-Probe
vergleicht wesentliche Builder-Controls mit aktivem/deaktiviertem Mobile-CSS.
Desktop-Reflow wird zusaetzlich bei halber CSS-Viewportbreite geprueft.
Screenshots der zentralen Ansichten liegen ausschliesslich im ignorierten
`tools/browser/artifacts/`; sie werden nicht automatisch committed oder hochgeladen.

Windows-/Ubuntu-Schnelltests bleiben erhalten. Der separate Linux-CI-Job
`Synthetic mobile browsers` installiert Chromium/WebKit und fuehrt diese Matrix aus.
Die vollstaendige lokale Regelbaseline bleibt 1.533 Checks und 242 Unterklassen.

## Grenzen und PR08

Headless WebKit ist kein echter iPhone-Safari-Test. Echte Android-/iOS-Geraete,
virtuelle Tastatur, physische Safe Areas, Screenreader und native Dateipicker/
PDF-Dialoge benoetigen weiterhin eine manuelle Geraeteabnahme. Die Reflow-Probe
ersetzt keinen echten Browser-/Textzoom-Test. Browser/API-Persistenztests nutzen
einen synthetischen Server; vorhandene Python-Tests decken das echte Backend ab.

Keine neue D&D-Logik, Condition-/Notes-/Container-Funktion oder Schemaaenderung.
Der mobile Builder folgt erst in PR08: dafuer bestehende Schritte/Choices,
Rules-/State-Tests und den nun dokumentierten Scope-Vertrag beibehalten.
Einen neuen Branch erst auf dem nach Review gemergten PR07 aufsetzen.
