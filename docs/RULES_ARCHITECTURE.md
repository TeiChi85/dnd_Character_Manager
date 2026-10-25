# Rules: Core, Engine und Controller-Adapter

## Verantwortlichkeiten

| Bereich | Verantwortung | Grenze |
| --- | --- | --- |
| [rules-core.js](../js/core/rules-core.js) | Attributsmodifikatoren, Proficiency, HP, Skills/Saves, passive Werte, maximale Zaubergrade | Reine Grundberechnung |
| [rules-engine.js](../js/core/rules-engine.js) | AC-Kandidaten, Angriffs-/Schadensmathematik, Zauberangriff/SG, Item-/Effektaggregation | Explizite normalisierte Mechaniken; nutzt Core |
| [app.js](../js/app.js) | Referenzwahl, State-/Item-/Attunement-Filter, Prosa-/Tabelleninterpretation, Regeladapter und Exportaufbereitung | Liefert Engine-Eingaben; keine Interpretation beliebiger Daten durch die Engine |
| [UI-Module](UI_ARCHITECTURE.md) | Darstellung strukturierter Werte und Beschreibungen über Context-Adapter | Kein direkter Core-/Engine-Aufruf |

Ladereihenfolge: Core vor Engine, beide vor Controller.
Browser-Namespace der Engine: `window.CCRulesEngine`; Node: CommonJS derselben
Datei. Core/Engine greifen weder auf DOM/API noch auf Character-State zu.
Ergebnisse werden je Aufruf neu aufgebaut; Eingaben dürfen nicht mutiert werden.
Regeleditionen `classic` (2014) und `one` (2024) explizit unterscheiden.

## Aufbereitung und Datenfluss

`resolveArmor`, `resolveWeapon`, `itemBonuses`, `fxAvailable`, `fxMods`,
`acFormulas`, `featureDcAbility`, `spellInfo` und `attackRows` bleiben im Controller.
Dort liegen ausgerüstete/attuned Auswahl, Basisvarianten, Klassen-/Rollenattribute,
aktive Effekte und Featureinterpretation. Die Engine erhält daraus aufgelöste
Records statt Inventar, Regelprosa oder den gesamten State.

`computeAC` und `acBreakdown` verwenden `acInfo`; Sheet und Export verwenden
entsprechende Adapter und Angriffszeilen. Itemboni versorgen Attribute,
Proficiency, Skills, Saves, AC, Tempo und Kritschwellen. `fxTotals` aggregiert
gewählte Effekte; `fxDmgFor` begrenzt die Anwendung und ergänzt bedingte Notizen.
UI-HTML wie `actionsCardHtml` wird über UI-Wrapper/Factories erzeugt;
kleine eng gekoppelte HTML-Fragmente und Beschreibungen verbleiben im Controller.

Slot-Tabellen, Zauberlisten/Preparation, Weapon Mastery und Extra Attack sind
Controller-Aufbereitung, keine neue allgemeine Stacking- oder Regel-Engine.
`fxMods` nutzt die Engine nur für den Vergleich von Würfel-Upgrades.

## Engine-Schnittstellen

| Funktion | Wesentliche Eingaben | Ergebnis / Vertrag |
| --- | --- | --- |
| `calculateAC` | Aufgelöste Rüstung/Schild `{name,ac,armorKind,bonus}`, Dex-Mod, alternative Formeln `{base,flat,noShield,modifiers:[{label,value}]}`, Defense, benannte Boni, Other/Override | `{total,label,parts}`, bei Override auch `computed/overridden` |
| `spellModifiers` | Bereits itembereinigte Proficiency, Attributsmodifikator, optionale `attackBonus/saveBonus` | `{attack,saveDC}`; Proficiency nicht doppelt addieren |
| `weaponAttack` | Aufgelöste Waffe, Edition, Martial-Arts-Die, Str/Dex, Proficiency, Effektbonus, Kritschwellen, Style-Flags | Zahlen, Würfel, Attributswahl und anwendbare Style-Flags; Notizen bleiben beim Adapter |
| `unarmedAttack`, `featureAttack` | Entsprechende explizite Kampfmechaniken | Deterministische Teilrechnungen |
| `martialArtsDie`, `isMonkWeapon`, `biggerDie`, `scaledDie` | Ausrüstung/Edition bzw. Würfel/Level | Separat prüfbare Helfer |
| `aggregateItems` | Bereits ausgewählte und nötigenfalls attuned Items als numerische Records; Rüstung/Schild mit generischem AC-Bonus 0 | Boni, Attributsfloors/-deltas, Tempooperationen und Quellen |
| `abilityWithItems` | Attributswert und aggregierter Bonus | Delta anwenden, danach maximalen Floor |
| `aggregateEffects` | Bereits ausgewählte aktive Effekte, `blocked`, explizite `abilityScores` | Aggregierte Werte und Quellen |
| `effectDamage` | Angriffsart und flacher Effektbonus | Aktueller Pfad begrenzt diesen Bonus auf Strength-Melee |

## Fachliche Besonderheiten und offene Fragen

Der aktuelle AC-Algorithmus lässt ganze Kandidaten konkurrieren statt alternative
Formeln zu summieren; bei Gleichstand gewinnt der erste Kandidat. Rüstung/Schild
sind vom generischen Item-AC-Summenpfad ausgeschlossen. Attributsboni addieren
Deltas und nehmen bei festen Werten das Maximum. Effekt-Resistenzen und
Vorteilsattribute werden dedupliziert; numerische Boni bereits ausgewählter
Effekte addiert. Auswahl/Deduplikation benannter Varianten bleibt in `fxAvailable`.
Dies beschreibt den Algorithmus, keine universelle fachliche Stacking-Freigabe.

Unterschiedliche Spell-Boni in Creator/Summary/Angriffszeilen sowie Monk-Unarmed,
Dueling und Natural Armor sind weiterhin **fachliche Fehlerkandidaten**.
Beobachtungen, Codebelege und nächster Klärungsschritt werden ausschließlich in
[CONTRACT_REVIEW.md](tasks/CONTRACT_REVIEW.md) gepflegt. Ein Erhaltungsrefactoring
ist kein Beleg ihrer Regelrichtigkeit; Korrekturen brauchen eigene Erwartungen
und getrennte Prüfung beider Editionen.

## Prüfgrenzen und technische Schuld

Direkte Core-/Engine-Suiten prüfen synthetische Werte und unveränderte Eingaben.
Adaptertests erreichen echte Berechnung, Sheet-HTML und Equip-/Level-Events;
eine manipulierte Engine-AC muss in der Anzeige zu einer fehlgeschlagenen
Assertion führen. Die vollständige lokale Suite nutzt autorisierte Regeldaten
und Aufrufzähler für produktive Module. Befehle und Einschränkungen stehen nur in
[TESTING.md](TESTING.md#pruefauswahl).

Große Controller-Parser, Core-Fallbacks, UI-Adapterkopplung und textuelle
Testinstrumentierung sind verbleibende technische Schuld, keine Empfehlung für
bereits erledigte PRs. Eine spätere Extraktion ist in der
[Klärungsaufgabe](tasks/CONTRACT_REVIEW.md#technische-schuld) eingeordnet.
