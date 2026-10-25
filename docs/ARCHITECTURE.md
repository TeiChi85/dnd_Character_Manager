# Technische Landkarte

Die Anwendung verwendet klassische Browser-Skripte ohne Bundler. `index.html`
lädt Ressourcen, Validierung/State, Core/Engine, UI-Module und den Controller;
`js/theme.js` läuft bereits im Head. Sechs weitere HTML-Seiten zeigen Referenzen.

| Bereich | Pfad | Verantwortung / wichtige Abhängigkeit |
| --- | --- | --- |
| Controller | `js/app.js` | State-Übergänge, asynchrone Lader, Daten-/Rules-Adapter, lokale Dateien und Export; verbindet Core, Engine und UI |
| Persistentes Modell | `js/core/character-state.js` | Defaults, Normalisierung, Serialisierung; nutzt `js/character-validation.js` |
| Grundberechnungen | `js/core/rules-core.js` | Numerische Bausteine ohne DOM/State |
| Komplexe Berechnungen | `js/core/rules-engine.js` | AC, Angriffe, Item-/Effektaggregation aus expliziten Eingaben; nutzt Core |
| Darstellung | `js/ui/` | Factories mit Context, Rendering, lokale Events und Navigation; Werte über Controller-Adapter |
| Styles und Theme | `css/styles.css`, `css/mobile.css`, `js/theme.js` | Grundlayout, kontextbegrenztes mobiles Layout und persönliche Theme-Wahl |
| Regeldatenaufbereitung | `tools/regen_all.py`, `tools/datasrc.py`, Generatoren | Autorisierte externe lokale Quellen → ignorierte Browser-Ressourcen |
| Server-Client | `js/server-library.js` | HTTP, Revision, Busy-/Dirty-State; UI über `js/ui/library.js` |
| API und Validierung | `server/app.py`, `server/validation.py` | Same-origin-API, strukturelle Grenzen, erlaubte statische Oberfläche |
| Dateispeicher | `server/storage.py`, `server/restore.py` | Sperre, atomare Dateien, Revisionen, private Archive und administrative Wiederherstellung |
| Prüfungen | `tools/validate*.mjs`, `tools/browser/`, `server/test_*.py` | Synthetische Tests, optional lokale Regelsuite und isolierter Live-Test |

## Datenfluss

1. Generatoren lesen ausdrücklich autorisierte lokale Quellen. Ihre ignorierten
   `resources/`-Ausgaben stellen Browser-Kataloge bereit; keine automatische
   Beschaffung oder Veröffentlichung von Regeldaten.
2. Der Controller hält `state`, `uiState` und `derivedState`. Er interpretiert
   Kataloge und übergibt normalisierte Mechaniken an Core/Engine.
3. UI-Factories erhalten Charakter, View-State, abgeleitete Daten, Aktionen und
   Adapter. Rendern liest Spielwerte; Benutzeraktionen ändern sie über die
   bestehenden Handler. Gameplay-Synchronisierung liegt am Zustandsübergang.
4. Lokales Laden validiert und normalisiert vor dem State-Wechsel. Der zentrale
   Serializer liefert lokale Exporte und Server-Snapshots. Der Server verwaltet
   seine ID/Revision außerhalb des Charakterobjekts und berechnet keine Regeln.

## Detailverträge

- [State, Import/Export und Kompatibilität](CHARACTER_STATE.md)
- [Core, Engine und Regeladapter](RULES_ARCHITECTURE.md)
- [UI-Context, Lifecycle, Hosts und Theme](UI_ARCHITECTURE.md)
- [Mobile Umsetzung](MOBILE_UI.md) und [gewünschtes UI-Design](UI_DESIGN_SPEC.md)
- [Bibliotheksbedienung](SERVER_LIBRARY.md), [API/Speicher](../server/README.md)
  und [Wiederherstellung](STORAGE_RECOVERY.md)
- [Einrichtung/Start](../DEVELOPMENT.md), [Prüfauswahl](TESTING.md),
  [Lint](LINTING.md), [Entscheidungen](DECISIONS.md)

Offene Kopplungen und Fehlerkandidaten: [Vertragsklärung](tasks/CONTRACT_REVIEW.md).
