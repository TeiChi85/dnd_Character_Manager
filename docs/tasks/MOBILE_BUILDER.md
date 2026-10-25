# Aufgabe: Mobiler Builder

Status: offen. Bestätigte Zielrichtung aus dem Nutzerauftrag vom 25.10.2026;
keine Implementierungsfreigabe durch den Dokumentations-PR.

## Ziel und Abgrenzung

Nach responsiver Bibliothek und Charakterbogen die bestehende Charaktererstellung
für Smartphone und Desktop vollwertig bedienbar ausbauen, für D&D 2014 und 2024.
Kein neues Regelwerk, Dateiformat, Framework oder beiläufiges Redesign.
Offline-Nutzung, lokale JSON-Dateien und Bibliotheksanbindung erhalten.

## Relevante Grundlagen

- [Design-Soll einschließlich Wizard](../UI_DESIGN_SPEC.md#7-charaktererstellung-verbindlicher-7-schritte-wizard)
- [Aktuelle mobile Umsetzung](../MOBILE_UI.md#umfang-und-abgrenzung)
- [UI-Verträge](../UI_ARCHITECTURE.md), [State-Vertrag](../CHARACTER_STATE.md)
- Bestehende Pfade: `js/ui/creator.js`, `js/ui/navigation.js`, `js/app.js`,
  `css/styles.css`, `css/mobile.css`; Prüfungen: [TESTING.md](../TESTING.md).

## Akzeptanzkriterien

- Bestehende sieben Schritte einschließlich Übergang zum Bogen sind in beiden
  Editionen auf den vorgesehenen Phone-/Tablet-/Desktop-Größen erreichbar.
  Zurück/Weiter erhält Eingaben, Auswahlgrenzen und abhängige Optionen.
- Keine horizontale Gesamtscrollbewegung; lange Optionen, Bildschirmtastatur,
  Fokus und Touchflächen erfüllen die [UI-Abnahme](../UI_DESIGN_SPEC.md#10-ui-abnahmekriterien).
- Bestehende Bearbeitung und Level-Verwaltung bleiben erreichbar; keine neuen
  Pflichtfelder für bestehende Charaktere. Navigation, Rendering und Theme
  verändern keine persistenten Spielwerte oder Dirty-Baselines.
- Speichern/Laden lokal und über die Bibliothek erhält Charakterentscheidungen;
  Fehler-/Busy-/Konfliktschutz bleibt erhalten. Dark und Light verwenden das
  vorhandene Designsystem ohne funktionale Desktop-Verschlechterung.

## Umsetzung

1. Wizard je Schritt mit Design-Soll und vorhandenen Komponenten abgleichen.
2. Konkrete Gestaltungslücken entscheiden, begrenzt umsetzen und Fachdateien pflegen.
3. Betroffene Tests/Browserprüfungen und Geräteabnahme gemäß Prüfanleitung auswählen.

## Erkenntnisse und offene Punkte

Die mobile Bibliothek und der Bogen sind bereits umgesetzt; der Builder ist
funktional erreichbar, aber noch nicht vollständig nach Wizard-Design gestaltet.
Vor Umsetzung klären, wie die bisher kontextbegrenzten semantischen Tokens und
Komponenten im Builder angewandt werden, ohne Desktop-/Referenzstyles zu verändern.
Konkrete Optionsgruppen, Fortschrittsanzeige und Back/Continue bei Tastatur/Safe
Areas anhand bestehender Schritte abstimmen; keine neue Palette/Maßskala erfinden.
Verfügbare echte Android-/iPhone-Geräte für die manuelle Abnahme sind noch zu klären.

## Übergabe

Nächster konkreter Schritt: `creator.js` und die Wizard-Hosts schrittweise mit
Abschnitt 7 der Designspezifikation abgleichen und offene Layoutentscheidungen
konkretisieren. Noch keine Implementierung oder Funktionsprüfung durchgeführt;
gewöhnliche spätere Testergebnisse gehören in PR/CI.
