# Arbeitsablauf

## Verstehen

`AGENTS.md` lesen, Git-Status und Nutzerauftrag prüfen. Danach nur die für die
Aufgabe verlinkten aktuellen Dokumente ausdrücklich lesen und mit dem Code
abgleichen. Einstieg bei unklarem Umfang: [Produkt](PROJECT.md) und
[Landkarte](ARCHITECTURE.md). Das Archiv ist kein regulärer Einstiegskontext.
Bestehende Änderungen bewahren; nicht zurücksetzen oder ungefragt einbeziehen.

## Umsetzen

Kleine Aufgaben brauchen keine eigene Planakte. Für größere oder über mehrere
Sitzungen laufende Arbeiten eine Aufgabenakte nach [Vorlage](tasks/TEMPLATE.md)
nutzen: Ziel, beobachtbare Fertigkriterien, wenige Schritte, Erkenntnisse und
nächster konkreter Schritt. Keine zusätzliche Statusdatei je Sitzung anlegen.
Produktvorgaben, beobachtetes Verhalten und noch offene Entscheidungen trennen.

Nur den beauftragten Umfang ändern. Daten- und Modulverträge erhalten und die
betroffene aktuelle Dokumentation im selben Änderungspaket anpassen.
Jede Information hat einen maßgeblichen Ort:

| Information | Ort |
| --- | --- |
| Produktziel und Grenzen | [PROJECT.md](PROJECT.md) |
| Module und Datenfluss | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Technische Verträge | verlinkte Fachdatei |
| Einrichtung und Start | [DEVELOPMENT.md](../DEVELOPMENT.md) |
| Prüfungen und Grenzen | [TESTING.md](TESTING.md), [LINTING.md](LINTING.md) |
| Begründete dauerhafte Entscheidungen | [DECISIONS.md](DECISIONS.md) |
| Größere offene Arbeit / Übergabe | `docs/tasks/` |
| Abgeschlossene historische Nachweise | `docs/archive/` |

## Passend prüfen und abschließen

Prüfungen nach [Änderungsart](TESTING.md#pruefauswahl) auswählen. Reine
Dokumentationsänderungen benötigen ohne konkreten Anlass keine App-, Browser-
oder Regeldatentests. Lokale Links, Anker, Pfadschreibweise, Befehle und
Widersprüche prüfen; große Quellcodeänderungen benötigen entsprechende Regressionen.

Den gesamten Diff und `git diff --check` prüfen. Nur tatsächlich ausgeführte
Prüfungen mit Ergebnis/Exitcode als bestanden melden; statische Prüfung,
Skip, fehlende Voraussetzung und verbleibende Unsicherheit getrennt benennen.
Gewöhnliche Laufergebnisse gehören in PR/CI bzw. die Übergabe der Aufgabe,
dauerhafte Erkenntnisse in den jeweiligen Fachvertrag; kein wachsendes Testjournal.

Branch, Commit, Push, PR und Merge richten sich nach dem Nutzerauftrag.
Vor einem erlaubten Commit zusätzlich `git diff --cached --name-only` und
den vollständigen Staging-Diff prüfen. Keine zusätzlichen Freigabeschritte
für normale reversible Arbeiten erfinden.
