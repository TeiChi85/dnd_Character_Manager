# Responsive Bibliothek und Charakterbogen

## Umfang und Abgrenzung

Diese Datei beschreibt die aktuelle Umsetzung. Verbindliches Design-Soll:
[UI_DESIGN_SPEC.md](UI_DESIGN_SPEC.md). Bibliothek, Bogen und deren Navigation
sind responsive umgesetzt. Der vorhandene siebenteilige Builder bleibt funktional
erreichbar, hat aber noch nicht das vollständige mobile Wizard-Design.
Historische Bezeichnungen „PR08“ (Builder) und „PR09“ (Deployment) sind keine
bereits umgesetzten Funktionen oder neuen Branch-/Merge-Vorgaben.

Keine neue D&D-Logik, Schemaänderung, Conditions-/Notes-/Containerfunktion,
Abschnittssortierung oder zusätzliche Würfelfunktion aus Referenzbildern ableiten.
Eine geprüfte Netzwerkbereitstellung gehört nicht zu dieser Umsetzung.
[PROJECT.md](PROJECT.md) definiert den weitergehenden Produkt-Scope und priorisiert
den interaktiven mobilen Bogen vor dem verbleibenden Builder-Design. Manuelle
Zustandsverwaltung ist Produkt-Soll; ihr konkreter Automatisierungsumfang bleibt
gesondert festzulegen. Die obige Grenze betrifft diese bestehende UI-Umsetzung,
nicht einen dauerhaften Ausschluss der Zustandsverwaltung. Tablet-/Desktop-
Gruppenansichten und Porträts in der Serverbibliothek sind hier noch nicht umgesetzt;
vorhandene responsive Bibliothekskarten ersetzen keine Gruppenübersicht.

## App-Shell und Navigation

`css/mobile.css` ergänzt die Grundstyles. `navigation.syncShell()` setzt
`body.cm-view` nur in Bibliothek/Bogen; `.cm-library`, `.cm-sheet` und Dialogklassen
begrenzen neue Layout-/Farbregeln. Builder-Styles und dessen Menü bleiben erhalten.
Bottom-Navigation auf Phone/Tablet bietet Library, Character und Build;
Character/Build benötigen einen geladenen Charakter.

Library-Navigation erhält Charakter und ungespeicherte Eingaben. Einen anderen
Charakter laden oder neu beginnen verwendet den bestehenden Dirty-/Busy-Schutz;
ein laufender Save blockiert den Library-Wechsel. Das Start-Page-Menü im Builder
führt weiterhin zur ausdrücklichen Reset-/Verwerfaktion. Diese zwei Navigationswege
nicht gleichsetzen. [Bedienvertrag](SERVER_LIBRARY.md#datenverlustschutz).

History speichert nur flüchtige Ansichten `library`, `character`, `build`.
Der SectionSelector erzeugt einen History-Eintrag; Back schließt zunächst einen
offenen Dialog. Ein History-Ziel lädt keinen Charakter aus einer URL. Nach Reload
erscheint zuerst die Bibliothek. Die mobile Actions-Auswahl bietet bestehendes
Edit/Level, lokales JSON-Speichern und Print/PDF. Server-Save, Save as New,
Status und Konfliktaktionen bleiben in der vorhandenen Serverleiste.

## Bibliothek

Karten zeigen vorhandene Listenmetadaten: Name, Klasse, Stufe, Edition und
Änderungsdatum. Die Listen-API liefert kein Porträt; ein Anfangsbuchstabe ist
Fallback, statt für Vorschauen komplette Charaktere nachzuladen. Die Suche
filtert die bereits geladenen Namen/Klassen lokal.
Öffnen und Löschen sind getrennte Controls. Der native HTML-Dialog benennt
Charakter und privaten Papierkorb, hat Abbrechen/Escape/Schließen und
Fokus-Rückgabe. Eine Löschaktion darf keinen Öffnen-Klick auslösen.
Leere Liste, kein Suchtreffer, Laden, Fehler/Offline, Dirty/Busy und Konflikte
haben Textmeldungen. Create New Character und lokales JSON-Laden bleiben erreichbar.

## Bogen und Abschnittsauswahl

`renderSheet()` wählt per Media Query Desktop- oder Mobile-Komposition. Der
[Host-Vertrag](UI_ARCHITECTURE.md#hosts) hält mobilen Header und genau einen
aktiven Abschnitt disjunkt; Controls/IDs und persistente Daten werden nicht kopiert.
AC, Initiative und HP bleiben im kompakten Kopf. Proficiency, Speed, Save DC,
Inspiration, temporäre HP und XP liegen dort zusätzlich in einem Details-Element.

Der SectionSelector ist ein modaler nativer Dialog mit Titel, scrollbaren
Auswahlzeilen, markierter aktueller Auswahl, Close/Escape, Hintergrund-Klick und
Fokus-Rückgabe. Er zeigt die vorhandenen Bereiche Overview & Training, Skills,
Combat & Actions, Class Resources, Spells, Inventory, Features & Traits,
Speed & Defences, Background & Details sowie Rest & Death Saves.
Die zugrunde liegenden Abschnitts-IDs/Inhalte stehen im [UI-Vertrag](UI_ARCHITECTURE.md#creator-und-sheet).

Abschnitt, Suche und Filter liegen nur in `uiState.sheet`. Gameplay-Redraw rendert
Header und aktiven Host neu; Filter aktualisieren lokal und erhalten Fokus/Caret.
Pips, Death Saves, Effekte und aufklappbare Zeilen haben Tastatur-/Label-/Zustands-
Semantik. Eine Beschreibung öffnen verbraucht keine Ressource.

## Kontrast und responsive Regeln

Die `--cm-*`-Tokens begrenzen das Library-/Sheet-Design, keine globale Ablösung
der Builder-Tokens. Die implementierten Dark-Kontrastkorrekturen, Accent-Textfarbe
und vorhandene Light-Palette stimmen mit den zentralen
[Farbvorgaben](UI_DESIGN_SPEC.md#21-farb-tokens) überein. `--cm-on-accent` ist
im Dark Theme dunkel, im Light Theme weiß. Die Browserchecks verlangen für ihre ausgewählten
Text-/Buttonpaare mindestens 4,5:1; das ist keine vollständige WCAG-Zertifizierung.
Verbindliche gestalterische Anforderungen werden dadurch nicht abgeschwächt.

| Breite | Umgesetztes Verhalten |
| --- | --- |
| 320–767 px | Einspaltige Abschnitte, 16 px Außenrand (320 px: 12), Bottom-Navigation |
| 768–1023 px | Flexible ein-/zweispaltige Karten, gleiche Renderer und State |
| ab 1024 px | Bestehende mehrspaltige Bogenkomposition und Desktop-Navigation |

Attribute sind auf typischen Phones 3×2, bei 320 px 2×3 angeordnet; Angriffszeilen
unter 1024 px gestapelt. Lange Namen umbrechen, Regeltabellen dürfen intern scrollen.
Kein globales `overflow-x:hidden`. Safe-Area-Abstände und Inhaltsreserve begrenzen
Überdeckung; bei fokussierter Eingabe wechselt die Navigation in den Dokumentfluss.
Reduced Motion wird berücksichtigt. Das globale Theme bleibt unabhängig vom
Charakter; [Theme-Vertrag](UI_ARCHITECTURE.md#theme).

## Prüfen und verbleibende Abnahme

Installation, Befehle, synthetische Server und Testgrenzen ausschließlich in
[TESTING.md](TESTING.md#browserpruefung) pflegen. Die vorhandene Browsermatrix
prüft Layout/Interaktion und JSON-Persistenz; eine Builder-Style-Probe schützt
dessen bisherige Darstellung. Das ist keine vollständige Wizard-Designabnahme.
Echte Android-/iPhone-Geräte, Screenreader, Bildschirmtastatur, physische Safe Areas,
native Dateidialoge und echter Browserzoom bleiben gesonderte Abnahmeziele aus
der Designspezifikation. Frühere grüne Testzahlen ersetzen diese Abnahme nicht.
