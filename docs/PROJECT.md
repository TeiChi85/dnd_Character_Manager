# Projektziel und Umfang

Repository: **TeiChi85/dnd_Character_Manager**, basierend auf
[TaylorMouse/dnd_character_creator](https://github.com/TaylorMouse/dnd_character_creator).

## Produktziel

Eine lokal nutzbare Charaktererstellung und Spieloberfläche für D&D 2014 und
2024. Zielgruppe sind Spielende, die Charaktere ohne externen Kontodienst
erstellen, als JSON mitnehmen und am Spieltisch bearbeiten möchten.
Das optionale Flask-Backend ergänzt eine gemeinsame lokale Charakterbibliothek.

## Bestätigter Funktionsumfang

Der aktuelle Checkout enthält Editionswahl, klassen- und datenabhängige
Erstellung, Charakterbogen mit Spielaktionen, lokale JSON-Dateien und
Referenzseiten. Flask bietet explizites Speichern, Laden, revisionsgeprüftes
Löschen, Backups und manuelle Wiederherstellung. Bibliothek und Bogen haben
responsive mobile Ansichten; das globale Theme gilt auch für Referenzseiten.
Die Nutzbarkeit der Regeln setzt eigene lokal generierte Ressourcen voraus.
Dies ist eine Beschreibung des Codes, keine pauschale Abnahme aller Funktionen.

## Dauerhafte Grenzen

- Vanilla HTML/CSS/JavaScript ohne produktiven npm-Build; Python für Generatoren
  und das optionale Backend. Frameworkwechsel benötigen einen eigenen Auftrag.
- Beide Regeleditionen getrennt behandeln; ein UI-Umbau darf keine Regel- oder
  Speicheränderung einschleusen. Datenkompatibilität: [State-Vertrag](CHARACTER_STATE.md).
- Keine mitgelieferten Regelbücher, Homebrew-Inhalte, Charaktere oder PDF-Vorlagen.
  MIT gilt für Code, nicht für Rechte an D&D-Inhalten oder fremden Bildern.
- Keine Konten, Rollen, Datenbank, Autosave oder geprüfte Netzwerkbereitstellung.
  Der dokumentierte Serverstart bleibt auf Loopback. Keine neue LAN-, Internet-
  oder Raspberry-Pi-Anleitung aus alten Phasenplänen ableiten.
- Keine neuen Conditions-, Notes-, Party-Inventory-, Container- oder Würfelfunktionen
  allein aus der UI-Referenz ableiten.

## Offene Punkte

Die [UI-Designspezifikation](UI_DESIGN_SPEC.md) beschreibt das gewünschte Design;
der [mobile Implementierungsumfang](MOBILE_UI.md#umfang-und-abgrenzung) ist enger,
insbesondere beim Wizard und bei der Geräteabnahme. Frühere PR-Nummern sind keine
neue Lieferzusage. Es gibt hier keine zusätzliche Release-Roadmap.
Belegte Vertragsabweichungen und technische Schulden sind in der
[Klärungsaufgabe](tasks/CONTRACT_REVIEW.md) gesammelt; eine fachliche Entscheidung
oder Implementierung steht dort ausdrücklich aus.

Technische Orientierung: [Architektur](ARCHITECTURE.md).
