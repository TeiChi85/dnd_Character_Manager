# Project Definition

## 1. Project Overview

The D&D Character Manager is a free, lightweight, self-hosted web application
for private Dungeons & Dragons 2024 (5.5e) groups. It supports fast, rules-correct
character creation, convenient management during play, and extensive automation
of character values, resources and supported rule mechanics. It is not intended
to become a D&D Beyond clone with a maximum feature set.

Repository: **TeiChi85/dnd_Character_Manager**, based on
[TaylorMouse/dnd_character_creator](https://github.com/TaylorMouse/dnd_character_creator).

This is the central, long-term product reference for future development: vision,
scope, priorities and success criteria. Requirements below describe the target,
not a claim that every feature is implemented or accepted. Technical contracts
remain in their existing specialist documents; larger work uses `docs/tasks/`
under the [documentation workflow](WORKFLOW.md).

### Current implementation baseline

The checkout already contains an edition-aware seven-step builder, character
editing/level controls, a playable sheet with HP, temporary HP, resources, spells,
equipment, supported item/effect calculations and rest actions, local JSON
import/export, portraits in the character detail view, and rule reference pages.
Available options and reference content depend on locally generated data.

The library and sheet already have responsive layouts and global Dark/Light
support. The full mobile wizard design remains unfinished; see
[current mobile implementation](MOBILE_UI.md#umfang-und-abgrenzung) and the
[builder task](tasks/MOBILE_BUILDER.md). The shared server library currently uses
initials rather than portraits and is not a party overview. Group assignment,
the intended tablet/desktop group view, and independent future-level planning
are not established by these existing library/edit controls.

Flask already provides explicit loading/saving/deleting through a JSON-file
store with revisions, conflict detection, private backups and trash. Its
documented start binds to loopback; a verified LAN/domain deployment is still
planned. Existing rule calculations and rest actions are implementation, not
proof of complete D&D-2024 correctness or MVP acceptance. Known candidates for
review remain in [contract review](tasks/CONTRACT_REVIEW.md).

Existing D&D 2014 (`classic`) and offline functionality remain untouched as
legacy compatibility. D&D 2024 (`one`) is the sole future target ruleset; no
removal or migration of 2014 characters is authorized by this definition.
Existing random-roll helpers also remain current behavior, not a product promise
of integrated digital dice. Current HTML print/browser-PDF actions and the older
unwired template exporter do not establish completion of an optional PDF export
feature; see [setup and current export behavior](../README.md#run-locally).

## 2. Goals and Design Principles

- **Mobile first:** prioritize the interactive character sheet used during play.
- **Simple, intuitive use:** make frequent actions quick and understandable.
- **High rule accuracy:** implement supported D&D-2024 mechanics correctly.
- **Reliable automatic calculations:** derive supported values consistently
  across devices; retain manual adjustments and overrides.
- **Minimal technical complexity and low resource use:** fit a small private
  group and Raspberry Pi 3B rather than a public service.
- **Maintainability and testability:** keep clear contracts and automate tests
  for every implemented rule calculation.

Automation is bounded by explicitly supported mechanics. The MVP must implement
those correctly, but need not automate every possible rule interaction. Manual
condition management is in functional scope; the precise automation of conditions
and temporary effects requires a separate specification. This vision is not an
unlimited MVP effect-automation assignment.

## 3. Target Users and Devices

Typical use is **four simultaneously connected people**; the maximum target is
**seven users**. This is a private group application, not a multi-tenant service.

| Device | Primary use |
| --- | --- |
| Smartphone | Primary player device: interactive sheet, HP, resources, spells, equipment, abilities and play actions |
| Tablet (about 10 inches) | Group overview, quick character information and D&D rule lookup |
| Desktop | Compact group overview for the game master; comfortable character creation and editing |

All devices use the same character data and rule calculations, with layouts and
information density suited to the device. English is the primary application
language. Both Dark and Light themes are required.

## 4. Functional Scope

The following is the overall product scope. Delivery phases are defined in
[Delivery Priorities](#7-delivery-priorities); inclusion here alone does not make
a feature an MVP requirement.

| Area | Target behavior |
| --- | --- |
| Character creation | Guided wizard with automatic calculations and rule validation; manual adjustments/overrides; available official D&D-2024 options within usage rights; portraits in library and detail views |
| Interactive sheet | All relevant character values; direct editing of HP, temporary HP, resources and conditions; automatic supported bonuses/effects; no integrated digital dice |
| Progression | Guided level-up with recalculation; revision of earlier decisions; future-level planning without changing the active character; multiclassing after the MVP with high priority |
| Spells and equipment | Spell lists, prepared spells and spell slots; inventory, currency and carrying capacity; magic items and supported effects; rules-correct Short Rest/Long Rest resource recovery |
| Groups | Assign characters to groups; tablet/desktop group overview; shared reading and editing; detect concurrent edit conflicts; no user accounts, roles or internal permissions; live synchronization optional |
| Rule reference | Contextual rule hints, a searchable D&D-2024 compendium and updateable rule data |

### Rule data and usage rights

The goal is to support as many official D&D-2024 player options as legally
permitted. The existing processing pipeline uses locally supplied data in
5etools format. Technical support for a rule or format and rights to use or
redistribute its content are separate matters. Owning physical rulebooks or
having technical access to data does not automatically permit redistribution.

Do not commit copyrighted rule texts, private rule files, character data, private
portraits or PDF templates. Process only explicitly authorized local sources;
no automatic acquisition or publication follows from this product goal.
Generated resources remain outside version control. The repository's
[MIT license](../LICENSE) covers code, not rights to third-party content.
See [data setup](../DEVELOPMENT.md) and [data flow](ARCHITECTURE.md#datenfluss).

## 5. Out of Scope

- Virtual tabletop, digital dice, encounter builder or campaign management.
- Standalone game-master tools beyond character and group overviews.
- User accounts, roles or an internal permission system.
- Social networking or commercial features.
- Mandatory offline support as a future product requirement; preserve existing
  offline behavior as legacy compatibility.

No native app is required. UI references do not authorize unrelated new
features such as party inventory or extra note/container systems.

## 6. Technical Constraints

- Primary server: **Raspberry Pi 3B**. Local development and execution:
  **Windows 11**. Responsive browser application; low resource use for four
  typical and at most seven simultaneous users is the operating target.
- Keep the current Vanilla HTML/CSS/JavaScript approach without a production
  build; Python handles local generators and the existing Flask backend.
  Framework changes need a separate assignment. See [architecture](ARCHITECTURE.md).
- Central persistent character data and JSON import/export are required.
  The existing JSON-file store with revisions, conflict detection and backups is
  a suitable baseline. No migration to SQLite or another database is prescribed;
  a change needs a separate justification or assignment. Preserve existing
  character-format compatibility and [state contracts](CHARACTER_STATE.md).
- Target private access over LAN and later a domain with upstream access
  protection. There is no in-application user administration. The particular
  deployment/protection mechanism remains open; this definition does not change
  the current loopback start or authorize network exposure. See
  [private Pi operation](tasks/PRIVATE_PI_OPERATION.md).
- Backups on the same disk do not replace external backups or access protection;
  follow the [storage/recovery contract](STORAGE_RECOVERY.md).
- PDF export and live synchronization are optional later enhancements. Neither
  a new database nor live synchronization is a prerequisite for shared editing
  with conflict detection.

## 7. Delivery Priorities

These are priority phases, not fixed release dates. Existing features are a
baseline to verify and extend, not automatically missing work or accepted output.
**The highest priority for further development is the interactive mobile
character sheet**, ahead of the remaining mobile builder design work.

### V1 / MVP — mandatory minimum

1. Load, display, edit and manage existing characters.
2. Create new D&D-2024 single-class characters through a guided wizard.
3. Progress characters correctly from level 1 through level 10.
4. Provide an interactive mobile character sheet.
5. Automatically calculate basic values such as AC, HP, saving throws and skills.
6. Manage class features, resources and rest mechanics.
7. Manage spells, spell slots, equipment and supported magic items.
8. Provide a group overview for tablets and desktops.
9. Persist characters and support JSON import/export.
10. Automatically test every implemented rule calculation.

The bounded automation policy in [Goals and Design Principles](#2-goals-and-design-principles)
applies. Do not infer complete condition/temporary-effect automation from this
list. Specific supported mechanics and remaining work must be checked against
the code and scoped in the relevant task before implementation.

### V2 — functional expansion

- Multiclassing, with high priority after the MVP.
- Character levels 11–20.
- Extended rule and effect automation.
- Improved character planning and revision of past decisions.

### V3 — optional enhancements

- PDF export.
- Live synchronization.
- Additional convenience features and UI improvements.

## 8. Success Criteria

### Binding MVP acceptance criteria

- A real play session with **four simultaneously connected players** works
  stably.
- **Every implemented rule calculation is covered by automated tests.**

These two confirmed acceptance criteria apply alongside the mandatory V1 scope;
this documentation update does not claim either has been demonstrated. Existing
synthetic tests or responsive layouts alone do not prove real-session acceptance.
Test procedures and their limits remain in [TESTING.md](TESTING.md).

### Additional recommended quality goals

- Good mobile usability.
- Reliable persistent storage.
- Protection against silently overwriting concurrent edits.
- A functional group view for its intended tablet/desktop use.
- Operation on Raspberry Pi 3B.
- Support for the maximum target of seven users.

These are additional quality/verification goals, not extra confirmed MVP
acceptance scenarios. This distinction does not remove the corresponding
functional requirements or technical constraints. No numerical performance
budget or seven-user acceptance test has yet been agreed.

## 9. Open Decisions

- Exact supported rule/condition/temporary-effect automation, including manual
  controls and the bounded MVP subset; resolve known rule/contract candidates
  through [contract review](tasks/CONTRACT_REVIEW.md).
- Detailed group-view information, group assignment and interaction design;
  portrait delivery for the shared library without unnecessary resource use.
- Detailed future-level planning and revision workflows; do not silently change
  the active character when planning.
- Legal availability and authorized local sources for individual official
  D&D-2024 options; format support is not a content license.
- Specific Pi deployment, upstream access protection, domain/access route,
  external backup destination and operating responsibility. Internal accounts
  and roles are excluded, not an open alternative.
- Concrete real-session acceptance procedure, available physical devices and
  measurable resource/performance budgets, including verification toward seven
  users. See [UI targets](UI_DESIGN_SPEC.md#10-ui-abnahmekriterien).
- Details of optional PDF export and live synchronization if separately assigned.

No database migration, 2014 migration/removal or network deployment is decided
by these open questions. A neighboring Obsidian web wiki on the same Pi remains
a separate service; no integration follows from this project definition.
