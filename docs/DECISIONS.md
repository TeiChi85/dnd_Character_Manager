# Dauerhafte Entscheidungen

Diese Datei hält dauerhafte Entscheidungen mit Grund und Folgen fest.
D1–D5 beschreiben belegte Architekturentscheidungen; D6 dokumentiert die
verbindliche Produktfestlegung vom 27.10.2026. Zeitangaben stammen aus Dokumenten
bzw. Git-Historie; wo kein ursprüngliches Beschlussdatum belegt ist, steht das dabei.
Offene Regel-/Vertragsfragen sind [Aufgaben](tasks/CONTRACT_REVIEW.md), keine
nachträglich legitimierten Entscheidungen.

## D1: Offline-Oberfläche ohne produktiven Build

- **Einordnung:** aus der Upstream-Basis übernommen; ursprüngliches Datum unbekannt.
- **Status:** umgesetzt; technischer Ansatz weiterhin gültig, Offline-Nutzung
  gemäß D6 als Legacy-Kompatibilität erhalten.
- **Entscheidung:** Vanilla HTML/CSS/JavaScript; Flask und Entwicklungswerkzeuge
  sind optional und getrennt von der Offline-Oberfläche.
- **Grund:** lokaler Betrieb und einfacher Start ohne Paketinstallation.
- **Folge:** kein Framework-/Build-Zwang; Datenbereitstellung bleibt separat.
  Siehe [Einrichtung](../DEVELOPMENT.md). Der künftige Produktbetrieb verwendet
  zentrale persistente Daten; Offline ist keine neue Produktanforderung.

## D2: v1-Dateiformat mit getrenntem View-State

- **Einordnung:** State-Extraktion vom 24.10.2026, dokumentiert im historischen
  [State-Nachweis](archive/regression-baseline-pr01-pr07.md#pr05-character-state--serialization).
- **Status:** umgesetzt. Die frühere Frontend-Whitelist-Beschreibung ist ersetzt.
- **Entscheidung:** `state.sheet` bleibt Gameplay im v1-Format; UI/Derived und
  Serveridentität bleiben außerhalb. Ein zentraler Serializer erhält sichere
  Zusatzfelder und entfernt bekannte transiente Pfade.
- **Grund:** bestehende Dateien und Regeladapter kompatibel halten.
- **Folge:** neue Felder klassifizieren; `SAVE_KEYS` legt die bekannte Reihenfolge
  fest, begrenzt nicht alle Erweiterungen. [Vertrag](CHARACTER_STATE.md).

## D3: Reine Berechnungen, Aufbereitung im Controller

- **Einordnung:** Core-/Engine-Extraktion, spätestens 24.10.2026;
  [Engine-Nachweis](archive/regression-baseline-pr01-pr07.md#pr-04-komplexe-rules-engine).
- **Status:** umgesetzt; Parser und Fallbacks bleiben technische Schuld.
- **Entscheidung:** Core/Engine haben keinen DOM-, API- oder Character-State-Zugriff;
  der Controller liefert explizite normalisierte Mechaniken.
- **Grund:** Mathematik isoliert prüfen, ohne Datenauswahl mit Berechnung zu vermischen.
- **Folge:** fachliche Verhaltensänderungen separat bewerten; [Schnittstellen](RULES_ARCHITECTURE.md).

## D4: Rendern verändert keine persistenten Spielwerte

- **Einordnung:** UI-Extraktion und mobile Umsetzung vom 24.10.2026;
  [UI-Nachweis](archive/regression-baseline-pr01-pr07.md#pr06-ui-komponenten-und-rendering).
- **Status:** umgesetzt; das gewünschte Wizard-Design ist noch nicht vollständig umgesetzt.
- **Entscheidung:** UI über expliziten Context; Gameplay-Synchronisierung am
  Zustandsübergang. Mobile Hosts teilen denselben State und dieselben Renderer.
- **Grund:** Ansichtswechsel dürfen keine Spielaktionen auslösen oder Daten verlieren.
- **Folge:** eindeutige DOM-IDs, idempotente Events und eingefrorene State-Proben.
  [UI-Verträge](UI_ARCHITECTURE.md), [Scope](MOBILE_UI.md).

## D5: Lokaler Dateispeicher mit Revision und privaten Archiven

- **Einordnung:** spätestens Phase 4, 23.10.2026;
  [historischer Nachweis](archive/server-test-results-phase-a-4.md#phase-4-hardening-23102026).
- **Status:** umgesetzt; keine Freigabe für einen Netzwerkbetrieb.
- **Entscheidung:** atomare UUID-Dateien unter Sperre, `If-Match` für PUT/DELETE,
  private Vorversionen/Papierkorb; keine automatische Schreibwiederholung.
- **Grund:** verlorene Updates und unbeabsichtigten Datenverlust begrenzen.
- **Folge:** Konflikte explizit lösen, Wiederherstellung administrativ; Archive
  auf demselben Datenträger ersetzen kein externes Backup. Der vorhandene
  JSON-Dateispeicher ist die geeignete Produktbasis; keine Festlegung auf SQLite
  oder eine andere Datenbank ohne gesonderte Begründung oder Beauftragung.
  [Speicher](STORAGE_RECOVERY.md).

## D6: Privates D&D-2024-Produkt mit begrenzter Automatisierung

- **Einordnung:** verbindlicher Produktauftrag vom 27.10.2026.
- **Status:** Produktziel bestätigt; keine pauschale Implementierungsabnahme.
- **Entscheidung:** [PROJECT.md](PROJECT.md) ist die zentrale Referenz für Vision,
  Scope, Geräte, V1–V3-Prioritäten und Erfolgskriterien. D&D 2024 ist das alleinige
  Zielregelwerk; 2014 und Offline bleiben technisch unangetastete Legacy-Kompatibilität.
  Privater Gruppenbetrieb nutzt vorgeschalteten Zugriffsschutz, keine internen
  Konten/Rollen. Der interaktive mobile Bogen hat höchste Entwicklungspriorität.
- **Grund:** regelgenaues Spielen in einer kleinen privaten Gruppe bei geringer
  technischer Komplexität und ressourcenarmem Betrieb auf Raspberry Pi 3B.
- **Folge:** Ist, Soll und offene Arbeiten getrennt behandeln. Manuelle Zustände
  gehören zum Produkt; genaue Zustands-/Effektautomatisierung separat eingrenzen.
  Keine Vollautomatisierung aus der Vision ableiten. Technische Datenunterstützung
  gewährt keine Nutzungs-/Weiterverbreitungsrechte. Bestehende UI-/Betriebsaufgaben
  folgen den Produktprioritäten; dieser Beschluss beauftragt keinen Codeumbau,
  keine Datenmigration und keine Netzwerkfreigabe.
