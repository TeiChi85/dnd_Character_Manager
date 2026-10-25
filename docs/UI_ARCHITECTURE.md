# UI-Verträge: Context, Rendering und Lifecycle

Diese Datei beschreibt den technischen Ist-Vertrag. Das gewünschte Design steht
allein in [UI_DESIGN_SPEC.md](UI_DESIGN_SPEC.md); responsive Umsetzung und
begründete Abweichungen in [MOBILE_UI.md](MOBILE_UI.md). Die kompakte Modulkarte
steht in [ARCHITECTURE.md](ARCHITECTURE.md).

Bei UI-Arbeit zuerst vorhandene semantische Tokens und Komponenten verwenden;
neue Varianten nur bei konkretem Bedarf. Ein Designauftrag ist Voraussetzung
für Designänderungen, kein beiläufiges Redesign bei technischen Änderungen.
Design-Soll, Ist-Vertrag und offene Abweichungen getrennt dokumentieren;
zentrale Farbziele: [Designsystem](UI_DESIGN_SPEC.md#21-farb-tokens).

## Module und Context

Alle `js/ui/`-Dateien sind klassische Browser-Skripte mit CommonJS-Export für
Node-Prüfungen, ohne Bundler. `index.html` lädt sie vor `app.js` nach den
Core-Modulen. `components.js` enthält generische Bausteine; die übrigen Module
exportieren Factories mit `create(context)` und importieren den Controller nicht.

| Modul | Verantwortung |
| --- | --- |
| `components.js` | Escaping, Card/Value/Panel, idempotente Bindung |
| `rule-text.js` | Entry-/Tag-/Inline-Darstellung und Tooltips |
| `creator.js` | Header und unabhängige Wizard-Schritte |
| `character-sheet.js` | Bogenkomposition, Abschnitte und lokale Events |
| `navigation.js` | Screens, Schritte, Menü, History und Controller-Aktionen |
| `library.js` | Liste, Suche, Status, Busy-Zustände und Löschdialog |

`uiContext(pure)` liefert `{character,ui,derived,document,window,actions,adapters,constants}`.
`character` ist der persistente State; `ui` hält Ansicht/Panels/Filter/Entwürfe,
`derived.fdata` geladene Referenzen. Stabile Objektreferenzen werden bei
Import/Reset in-place aktualisiert. Es gibt keinen zweiten Character-State und
keine UI-eigene Serialisierung. [State-Vertrag](CHARACTER_STATE.md).

Jede Factory benennt ihre benötigten Adapter/Konstanten. Adapter rufen aktuelle
App-Funktionen dynamisch auf, damit State, Generationen und Testinstrumentierung
aktuell bleiben. Die breite Adapterliste ist eine Übergangsgrenze, keine neue
Domain-API. UI ruft Core/Engine nicht direkt auf; auch Spell-Summary,
Ressourcenmaxima und Short-Rest-Hinweise kommen vom Controller.
Fachliche Bonusabweichungen sind [offene Fragen](tasks/CONTRACT_REVIEW.md).

## HTML- und Sicherheitsvertrag

`components` kennt keine D&D-Regeln. `card(title,bodyHTML)` und
`value(valueHTML,label,why)` erwarten sicheres Renderer-HTML für HTML-Argumente;
Titel, Label und Tooltip werden escaped. `panel` escaped Namen und Keys;
`subtitleHTML`, `badgeHTML` und `bodyHTML` dürfen nur vertrauenswürdige
Renderer-Ausgabe enthalten. Source-Tags bleiben kontrolliertes HTML.
Freie Namen, Suchtexte, Inventarmengen und Entwürfe an der Ausgabestelle escapen.
Bibliotheksmetadaten, Status und Dialognamen als `textContent` einsetzen.
Keine beliebigen Portrait-URLs; zulässig sind validierte PNG-Data-URLs.

## Creator und Sheet

Creator bietet `renderHeader()` und `renderStep(step)` für `class`, `background`
(inklusive Details), `species`, `abilities`, `equipment`, `spells`.
Benannte App-Wrapper erhalten Test-/Exportzugriffe. Ein Wizard-Schritt kann
aktualisiert werden, ohne den Bogen neu aufzubauen. Die gewünschte siebte Stufe
ist der Übergang in den Charakterbogen, kein zusätzlicher neuer Formularschritt.

`renderSheet()` behandelt fehlende Klassen-/Referenzdaten sichtbar und wählt
Desktop-/Mobile-Komposition. `sheetView()` bereitet Proficiency, AC, Initiative,
HP und Spell-Information je Aufruf vor. Desktop verwendet `renderSheetInner(host)`.
`renderSection(name,host)` ersetzt und bindet nur seinen eigenen Zielbereich.

| Abschnittsname | Inhalt über explizite Adapter |
| --- | --- |
| `header` | Identität, Speed, Initiative, AC, Save DC, HP, Inspiration, Effekte |
| `training` | Attribute, Saves, Senses, Proficiencies und Languages |
| `skills` | Skills, Expertise/Advantage und passive Werte |
| `defences` | Berechnete und eigene Defences |
| `combat` | Angriffe, Schaden, Action Economy und Beschreibungen |
| `resources` | Ressourcenmaxima, Pips und Class Options |
| `spells` | Slots, bekannte/angeborene/Feat-Spells und Konzentration |
| `inventory` | Währung, Items, Varianten, Equip, Attunement und Suche |
| `features` | Feature Cards, Traits und Effekt-Checkboxen |
| `background` | Hintergrund und Details |
| `rest` | Hit Dice, Short/Long Rest und Death Saves |

<a id="hosts"></a>

## Hosts, Lifecycle und Events

`initializeUI()` erzeugt Instanzen einmal. `render()` delegiert an Creator und
Sheet; kein virtueller DOM oder neuer Scheduler. Nach vielen Gameplay-Aktionen
bleibt ein kompletter Controller-Redraw bestehen. Such-/Filterhandler aktualisieren
möglichst nur ihre Liste/ihren Host und stellen Fokus/Caret wieder her.

**Reines Rendern und `setStep()` verändern keine persistenten Daten.**
`synchronizeGameplay()` im Controller korrigiert automatische HP und ungültiges
Attunement/mehrfach getragene Rüstung beim Import innerhalb des Rollback-Schutzes
sowie in `renderAfterChange()`. Ein nicht berechenbares HP-Maximum ersetzt keinen
bestehenden HP-Wert. Manuelle HP bleiben durch `hpEdited` erhalten.
Defaults für eigene Proficiencies/Defences liefert das State-Modul.

Navigation erhält den reinen Render-Callback über `uiContext(true)`; Gameplay-
Handler verwenden die explizite Änderungsroute. `mount()` registriert globale
Menü-/Dokument-, Schritt- und History-Listener nur einmal. Lokale Renderer ersetzen
eigene Knoten und binden deren Events. `components.on()`/`collapse()` ersetzen
vorhandene Bindungen am selben Knoten. Keine neuen Dokument-Listener pro Render.
`bindSheetEvents(host)` und Inventarsuche suchen nur im eigenen Ziel.

Mobile und Desktop dürfen nicht dieselbe DOM-ID gleichzeitig mounten. Unter
1024 px sind `mobileSheetHeader` (nur `header`) und `activeSheetSection` (genau
ein anderer Abschnitt) disjunkt. Controls werden verschoben, nicht dupliziert;
insbesondere `hpCur` ist eindeutig. Resize und Gameplay-Redraw müssen den aktiven
Host berücksichtigen und `uiState.sheet.section` erhalten. Details/History/Dialoge:
[MOBILE_UI.md](MOBILE_UI.md).

Beschreibungs-Klicks verbrauchen keine Slots/Ressourcen. Normale Navigation
resettet keinen Charakter. Bewusstes Home/Edition/Neuanlegen läuft über die
Controller-Aktion mit Dirty-/Busy-Schutz; Library-Ansichtswechsel erhält den
aktuellen Charakter. [Bedienvertrag](SERVER_LIBRARY.md#datenverlustschutz).

## Asynchrones Laden

Loader, Cache und Auswahl-/Import-/FileReader-Generationen gehören zum Controller.
Nur die aktuell gültige Auswahl darf Antworten anwenden; Slug-Gleichheit allein
reicht bei A→B→A nicht. Ein invalidiertes Script darf noch den Cache befüllen,
aber keine alte State-/UI-Antwort anwenden. Den rohen Vorlade-Loader nicht so
abbrechen, dass wartende Server-Prepare-Promises unbeabsichtigt offen bleiben.
UI hält keine eigenen Requests, dauerhaften Klassenreferenzen oder Parallelcaches.
Atomare Übernahme und Rollback: [CHARACTER_STATE.md](CHARACTER_STATE.md#import-rollback-und-kompatibilitaet).

<a id="theme"></a>

## Globales Theme

`js/theme.js` läuft im Head vor Styles und Regeldaten. `CCTheme` setzt
`html[data-theme]` und `body.dark`, bindet `darkToggle` und verwendet `cc-theme`
im localStorage der Herkunft. Gültige explizite Wahl: `light` oder `dark`;
sonst `prefers-color-scheme`. Systemänderungen wirken nur ohne explizite Wahl.
Storage-Events übernehmen Änderungen anderer Tabs derselben Herkunft.

Das Theme gilt für Startseite/Bibliothek, Creator, Bogen und alle Referenzseiten.
Theme-Umschalten verändert weder Charakterdaten noch Dirty-Baseline. Import,
Reset und Heimnavigation ändern ihrerseits die persönliche Theme-Wahl nicht.
Legacy-`sheet.dark` wird im State-Modell entfernt und nicht
exportiert, nicht als Theme-Vorgabe angewandt; [genauer Datenvertrag](CHARACTER_STATE.md#legacy-theme-und-gameplay).

Wenn localStorage gesperrt oder nach privatem Browsen gelöscht wird, bleibt die
Umschaltung für die offene Seite nutzbar, aber ohne dauerhafte Wiederherstellung.
Verschiedene Ports, `localhost`, `127.0.0.1` und `file://` teilen ihren Speicher
nicht automatisch. Kontrasttokens/Abweichungen: [MOBILE_UI.md](MOBILE_UI.md#kontrast-und-responsive-regeln).
Manuell Auswahl, Systemfallback, Neuladen und Tab-Wechsel prüfen; automatisierte
Prüfauswahl und Grenzen stehen in [TESTING.md](TESTING.md).

## Verbleibende Kopplung

Lokale Dateien/IndexedDB-Recents, Portraitverarbeitung, Print/PDF und eng gekoppelte
Rules-/Choice-/Proficiency-/Defence-Fragmente bleiben im Controller. Wrapper und
textuelle Testfreigabe sind nicht vollständig abgelöst. Das rechtfertigt keine
neue Zerlegung ohne Auftrag; siehe [technische Schuld](tasks/CONTRACT_REVIEW.md#technische-schuld).
