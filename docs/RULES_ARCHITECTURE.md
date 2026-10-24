# Rules-Architektur: Core, Engine und App-Adapter

Vor PR03 lagen Basis- und komplexe Berechnungen mit UI und globalem State in
`app.js`. PR03 hat die numerischen Grundbausteine nach `rules-core.js` verlegt.
PR04 ergaenzt die zustandsfreie `rules-engine.js`: Sie kombiniert diese
Grundbausteine mit explizit uebergebenen Ruestungs-, Angriffs-, Item- und
Effektmechaniken. `app.js` ermittelt die passenden Eingaben, interpretiert
Regeldaten und erzeugt die unveraenderte Darstellung und Exportstrukturen.

Der Core verantwortet Attributsmodifikatoren, Proficiency, HP, Skills, Saves,
passive Werte und maximale Zaubergrade. Die Engine verantwortet AC-Auswahl,
Angriffs-/Schadensmathematik, Zauberangriff/SG sowie die Aggregation bereits
ausgewaehlter Item- und Effektboni. Beide Module sind ohne App-State testbar.

## Abhaengigkeitsanalyse vor der Extraktion

| Kategorie | Funktionen und Verantwortung | Entscheidung |
| --- | --- | --- |
| Reine Berechnungen | `acInfo`: Kandidaten, Dex-Cap, Auswahl, Boni, Override; `abilitySaveDc` und `attackRows`: Angriffs-/SG-Mathematik; Waffenschaden, Attributswahl, Kampfstyles; `biggerDie`, `scaledDie`, Monk-Kriterien | In die Engine mit expliziten Eingaben |
| Charakterabhaengige Aufbereitung | `resolveArmor`, `itemBonuses`: getragen/attuned, Basisvarianten; `spellInfo`, `dcAbility`, `martialArtsDie`; `fxActive`, `attackRows`: ausgeruestete Waffen und aktive Effekte | Adapter in app.js; numerische Aggregation in Engine |
| Interpretation externer Regeldaten | `acFormulas`, `featureDcAbility`, `fxMods`, `fxAvailable`, `resolveWeapon`, `featureAttacks`, `attacksPerAction` | Textinterpretation, Auswahl, Slot-/Zauberlisten und Extra Attack bleiben in app.js |
| UI/HTML | `acBreakdown`, `actionsCardHtml`, `itemEffectsHtml` und Angriffsnotizen/-beschreibungen | Bestehende Darstellung bleibt in app.js; Engine liefert Werte und strukturierte Teile |
| Zustandsaenderungen | Equip-/Attunement-Handler, Effekt-Toggles, manuelle Sheet-Eingaben, Import/Export | Bleiben in app.js; Engine liest nur uebergebene Daten |

Aufrufer: `computeAC`/`acBreakdown` verwenden `acInfo`; Sheet/Export verwenden
diese Adapter und `attackRows`. `itemBonuses` versorgt Attribute, Proficiency,
Skills, Saves, AC, Tempo und Krit-Schwelle. `fxTotals` versorgt AC, Tempo,
Resistenzen und `fxDmgFor`; letzteres versorgt Angriffszeilen und bedingte Notizen.
`spellInfo` ermittelt weiterhin Klassen-/Rollenattribute und Zauberanzahlen.

## Bewusst erhaltene Unterschiede

`abilitySaveDc` addiert bisher `bonusSpellSaveDc`, waehrend Zauberzeilen in
`attackRows` weder diesen Bonus noch `bonusSpellAttack` addieren. Die Engine
verwendet dieselbe Mathematik mit explizit unterschiedlichen Eingaben. Eine
fachliche Korrektur der Zauberzeilen ist ein separater Auftrag.

Monk-Unarmed-Schaden verwendet bisher aktive Strength-Melee-Boni auch bei
hoeherer Dexterity. Dueling wird bedingt angezeigt, ohne die Zahl anderer
gehaltener Waffen zu pruefen. Flat Natural Armor konkurriert mit getragener
Ruestung; danach werden Schild und Defense addiert. Diese bestehenden
Verhaltensweisen werden hier nicht korrigiert.

Ruestung/Schild werden aus dem generischen Item-AC-Summenpfad ausgeschlossen.
Alternative AC-Formeln konkurrieren als ganze Kandidaten; bei Gleichstand
gewinnt der erste Kandidat. Item-Attributsboni addieren sich, feste Werte bilden
ein Maximum. Effekt-Resistenzen und Vorteilsattribute werden dedupliziert;
numerische Boni verschiedener bereits ausgewaehlter Effekte addieren sich wie
bisher. Auswahl/Deduplikation benannter Effektvarianten bleibt in `fxAvailable`.

## Schnittstellen

`rules-core.js` wird vor `rules-engine.js` und dieses vor `app.js` geladen.
Browser-Namespace: `window.CCRulesEngine`; Node: CommonJS-Export derselben Datei.
Die Engine verwendet klassisches JavaScript, keine DOM-/API-Zugriffe und keinen
Charakter-State. Alle Ergebnisse werden pro Aufruf neu aufgebaut.

- `calculateAC`: aufgeloeste Ruestung/Schild `{name, ac, armorKind, bonus}`,
  `dexModifier`, `alternativeFormulas` mit `base`, `flat`, `noShield` und
  `modifiers: [{label, value}]`, `defenseStyle`, `bonuses: [{label, value}]`,
  `other`, `manualOverride`. Rueckgabe behaelt `{total, label, parts}` sowie
  gegebenenfalls `computed`/`overridden` fuer die vorhandene Anzeige bei.
- `spellModifiers`: bereits itembereinigter `proficiencyBonus`,
  `abilityModifier`, optional `attackBonus` und `saveBonus`; Ergebnis
  `{attack, saveDC}`. Attributsauswahl und die bewusst unterschiedlichen
  Bonus-Eingaben der Summary und der Angriffszeilen bleiben im Adapter.
- `weaponAttack`: aufgeloeste Waffe, Edition, Martial-Arts-Die, Str-/Dex-Mod,
  Proficiency, aktiver Schadensbonus, Item-/Waffen-Kritschwelle und Style-Flags.
  Liefert Zahlen, Wuerfel, Attributswahl und anwendbare Style-Flags; der Adapter
  stellt bestehende Zeilen, Notizen und Beschreibungen her.
- `unarmedAttack`/`featureAttack`: entsprechende deterministische Teilrechnungen.
  `martialArtsDie`, `isMonkWeapon`, `biggerDie`, `scaledDie` sind separat testbar.
- `aggregateItems`: bereits ausgeruestete und erforderlichenfalls attuned Items
  als normalisierte numerische Records. Armor-/Shield-AC ist hier bereits 0.
  Liefert weiterhin Boni, Attributsfloors/-deltas, Tempooperationen und Quellen.
  `abilityWithItems` wendet Delta und danach den maximalen Floor an.
- `aggregateEffects`: bereits ausgewaehlte aktive Effekte inklusive `blocked`
  und expliziter `abilityScores`; `effectDamage` begrenzt den flachen Effektbonus
  wie bisher auf Strength-Melee-Angriffe.

`fxMods` bleibt wegen seiner Prosa-/Feature-/Stufentabellen-Interpretation im
Adapter. Lediglich sein Vergleich von Wuerfel-Upgrades nutzt die Engine.
Slot-Tabellen, Spell Preparation, Weapon Mastery und Extra Attack werden nicht
umgestaltet. Bestehende Item- und Effekt-Stackingregeln werden erhalten, keine
neue allgemeine Stacking-Regel oder Dateninterpretation eingefuehrt.

## Tests und produktive Pfade

- `tools/validate_rules_core.mjs`: direkte synthetische Core-Tests einschliesslich
  Stufengrenzen, HP-Overrides, Expertise, Items und Caster-Typen.
- `tools/validate_rules_engine.mjs`: direkte Engine-Tests fuer AC-Kombinationen,
  Zauber-/Kampfwerte, Item-Floors, Effekte und Quellen. Gefrorene Eingaben und
  wiederholte Aufrufe sichern gegen Veraenderungen uebergebener Daten ab.
- `tools/validate_rules_adapters.mjs`: echte App-Adapter und Sheet-Renderer mit
  synthetischen Daten. Der Test prueft dargestellte AC-/Angriffswerte, Quellen,
  echte Equip- und Level-Handler fuer 2014/2024 sowie Zauber-Summary-Unterschiede.
  Nur Featurelisten, Startnavigation und die Route fuer Redraws sind ersetzt;
  Berechnung und Sheet-HTML bleiben echt. Eine absichtlich falsche Engine-AC
  erreicht die Anzeige; ein isolierter Kindprozess muss daran mit Exitcode 1
  scheitern. Alte Fallbacks koennen eine Engine-Regression somit nicht verdecken.
- `tools/validate.js` und der Node-Adapter `validate_rules.mjs`: unveraenderte
  bestehende Regelassertions mit lokal generierten Daten, ergaenzt um den
  Aufrufnachweis der produktiven Module. WSH behaelt die Script-/Polyfill-
  Architektur; der Core benoetigt kein `Number.isNaN` mehr.

Die drei datenfreien Suiten laufen neben den vorhandenen Tests auf Windows und
Ubuntu in GitHub Actions. Die vollstaendige Regelsuite bleibt lokal, benoetigt
autorisierte Regeldaten und wird nicht durch einen datenfreien CI-Erfolg ersetzt.
Testbefehle und ausgefuehrte Ergebnisse: [TESTING.md](TESTING.md),
[TEST_BASELINE.md](TEST_BASELINE.md).

## Verbleibende technische Schuld und PR05

Die Datenaufbereitung und Textinterpretation in `app.js` sind weiterhin gross:
`acFormulas`, `featureDcAbility`, `fxMods`, `fxAvailable`, `resolveArmor`,
`resolveWeapon`, `spellInfo`, Spell Lists/Preparation und Slot-Tabellen.
Auch `attackRows` erstellt noch Notizen und Beschreibungen; `attacksPerAction`
und Weapon Mastery bleiben unangetastet. Die alten Core-Fallbacks sowie die
textuelle Testfreigabe interner App-Funktionen bleiben Uebergangsloesungen.

Die Engine erwartet normalisierte, vollstaendige Mechaniken aus den Adaptern;
sie ersetzt weder Importvalidierung noch die Interpretation beliebiger
5etools-Daten. Allgemeine Stacking-Regeln werden nicht neu erfunden. Die oben
dokumentierten bestehenden fachlichen Unterschiede sind separate Fehlerkandidaten.

Empfehlung fuer PR05: die Normalisierung von Items und aktiven Effekten als
separate Adapter mit expliziten Datenvertraegen extrahieren und die Regex-Parser
mit synthetischen Textfaellen absichern. Anschliessend die Core-Fallbacks und
die textuelle Testinstrumentierung schrittweise entfernen. Korrekturen der
Zauberbonus-Differenz separat mit klaren Vorher-/Nachher-Regeltests behandeln.
