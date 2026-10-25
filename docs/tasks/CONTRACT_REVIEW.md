# Offene Vertrags- und Regelklärung

Status: **offen, nicht implementiert**. Die Regelkandidaten stammen aus der
vorhandenen Rules-Dokumentation; die State-Abweichung wurde am 25.10.2026 bei
statischer Prüfung des Checkouts festgestellt. Diese Akte erteilt keinen Auftrag
für Codeänderungen und ist keine Roadmap oder fachliche Freigabe des Ist-Verhaltens.

## Ziel und Abgrenzung

Ungeklärte Verhaltensunterschiede reproduzieren, fachlich entscheiden und später
gezielt beheben. Keine pauschale Regelkorrektur im Architektur-/Dokumentationsumbau.
Grundlagen: [State-Vertrag](../CHARACTER_STATE.md), [Rules-Vertrag](../RULES_ARCHITECTURE.md),
[Prüfauswahl](../TESTING.md#pruefauswahl).

## Belegte Beobachtungen

| Kandidat | Beleg im Code | Noch offen |
| --- | --- | --- |
| `customDefences` | `js/ui/character-sheet.js` pusht `{kind,value}`; `js/character-validation.js` und `server/validation.py` verlangen String-Einträge | Gewünschtes kompatibles Format, Folgen für Save/Import und mögliche Altdateien; hier nicht dynamisch reproduziert |
| Zauberboni | `abilitySaveDc()` und `spellPresentation(info,true)` in `js/app.js` geben Item-SG-Boni weiter; `attackRows()` und `spellPresentation(info,false)` lassen spezielle Spell-Boni weg | Welche Zeilen/Summaries müssen die Boni nach den jeweiligen Regeln enthalten? |
| Monk-Unarmed | `unarmedAttack()` in `js/core/rules-engine.js` addiert aktive Strength-Melee-Effekte auch bei höherer Dexterity | Editionsabhängige fachliche Bewertung |
| Dueling | `weaponAttack()` prüft Style, Nahkampf und Two-Handed, aber nicht die Zahl anderer gehaltener Waffen | Welche Daten liefern die Adapter, welche Waffen schließen den Bonus aus? |
| Natural Armor | `calculateAC()` lässt flache Natural-Armor-Kandidaten mit Rüstung konkurrieren; danach kommen Schild und ggf. Defense hinzu | Voraussetzungen je Feature/Edition fachlich überprüfen |

## Technische Schuld

`app.js` enthält weiterhin umfangreiche Regeldaten-/Prosa-Parser, Auswahl- und
Listenlogik sowie Core-Fallbacks. Der Engine-Vertrag deckt nur normalisierte
Mechaniken ab. Breite UI-Adapter, App-Wrapper und textuelle Testinstrumentierung
koppeln Controller und Harnesses. Eine weitere Extraktion ist ein Vorschlag,
kein bestätigter nächster PR. Auch die bekannte doppelte Frontend-Testausführung
ist noch vorhanden; Details stehen in [TESTING.md](../TESTING.md#datenfreie-tests).

## Akzeptanzkriterien für eine spätere Bearbeitung

- Jeden gewählten Kandidaten zuerst synthetisch am produktiven Pfad reproduzieren.
- Gewünschtes Verhalten und Herkunft der fachlichen Vorgabe klären; 2014/2024
  getrennt prüfen und keine Altdatei-Kompatibilität unbeabsichtigt verlieren.
- Ein kleiner Fix erhält Import-/Dirty-/Rollback-Verträge und seine Testdiagnose
  belegt, dass tatsächlich der produktive Pfad erreicht wird.
- Betroffene Fachdatei anpassen; keine Änderung der Erwartungswerte allein für Grün.

## Prüfstand und Übergabe

Nur Quelltext und Dokumentation statisch verglichen, keine neue dynamische
Reproduktion oder Regelabnahme. Nächster konkreter Schritt bei Beauftragung:
den `customDefences`-Roundtrip mit einem synthetischen UI-Eintrag reproduzieren
und das gewünschte Legacy-/Zielformat festlegen. Für Regelkorrekturen ist ein
eigener fachlicher Auftrag mit autorisierter lokaler Grundlage erforderlich.
