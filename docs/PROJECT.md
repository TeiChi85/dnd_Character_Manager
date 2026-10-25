# Projektziel und Umfang

Repository: **TeiChi85/dnd_Character_Manager**, basierend auf
[TaylorMouse/dnd_character_creator](https://github.com/TaylorMouse/dnd_character_creator).

## Produktziel

Private Charakterverwaltung für den Nutzer und seine D&D-Gruppe: Charaktere
für D&D 2014 und 2024 erstellen und am spielbaren Charakterbogen verwalten,
mit Smartphone und Desktop als vollwertigen Zugängen. Die gemeinsame Bibliothek
soll perspektivisch auf einem Raspberry Pi sicher im Heimnetz und später von
außen für die private Gruppe erreichbar sein. Offline-Nutzung und lokale
JSON-Dateien bleiben erhalten. Ein bestimmtes Konten-/Rollenmodell oder ein
externer Kontodienst ist damit nicht beschlossen.

## Bestätigter Funktionsumfang

Der aktuelle Checkout enthält Editionswahl, klassen- und datenabhängige
Erstellung, Charakterbogen mit Spielaktionen, lokale JSON-Dateien und
Referenzseiten. Flask bietet explizites Speichern, Laden, revisionsgeprüftes
Löschen, Backups und manuelle Wiederherstellung. Bibliothek und Bogen haben
responsive mobile Ansichten; das globale Theme gilt auch für Referenzseiten.
Die Nutzbarkeit der Regeln setzt eigene lokal generierte Ressourcen voraus.
Dies ist eine Beschreibung des Codes, keine pauschale Abnahme aller Funktionen.
Aktuell gibt es keine Authentifizierung und keine geprüfte Netzwerkbereitstellung;
der dokumentierte Serverstart ist Loopback. Das beschreibt den Stand, keinen
dauerhaften Ausschluss des privaten Netzwerkbetriebs.

## Noch auszuarbeitende Vorhaben

- [Mobiler Builder](tasks/MOBILE_BUILDER.md): nächster UI-Ausbau nach Bibliothek
  und Charakterbogen, innerhalb der bestehenden Design- und Datenverträge.
- [Sicherer privater Betrieb auf Raspberry Pi](tasks/PRIVATE_PI_OPERATION.md):
  Zugriffs- und Betriebskonzept vor einer gesondert beauftragten Implementierung.

Deployment, Domain, Tunnel, VPN und Authentifizierungslösung sind offen.
Ein Obsidian-Web-Wiki auf demselben Pi bleibt ein benachbarter Dienst;
daraus folgt keine Integration in den Character Manager.

## Dauerhafte Grenzen

- Vanilla HTML/CSS/JavaScript ohne produktiven npm-Build; Python für Generatoren
  und das optionale Backend. Frameworkwechsel benötigen einen eigenen Auftrag.
- Beide Regeleditionen getrennt behandeln; ein UI-Umbau darf keine Regel- oder
  Speicheränderung einschleusen. Datenkompatibilität: [State-Vertrag](CHARACTER_STATE.md).
- Keine mitgelieferten Regelbücher, Homebrew-Inhalte, Charaktere oder PDF-Vorlagen.
  MIT gilt für Code, nicht für Rechte an D&D-Inhalten oder fremden Bildern.
- Kein öffentliches Mehrmandantenprodukt aus dem privaten Gruppenziel ableiten.
  Neue Konten-, Rollen-, Datenbank- oder Autosave-Funktionen benötigen einen
  passenden Auftrag. Keine LAN-, Internet- oder Raspberry-Pi-Freigabe aus alten
  Phasenplänen ableiten; bis zu geprüfter neuer Anleitung bleibt der Start Loopback.
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
