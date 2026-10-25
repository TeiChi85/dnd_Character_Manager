# Arbeitsablauf

## Verstehen

`AGENTS.md` lesen, Git-Status und Nutzerauftrag prüfen. Danach nur die für die
Aufgabe verlinkten aktuellen Dokumente ausdrücklich lesen und mit dem Code
abgleichen. Einstieg bei unklarem Umfang: [Produkt](PROJECT.md) und
[Landkarte](ARCHITECTURE.md). Das Archiv ist kein regulärer Einstiegskontext.
Bestehende Änderungen bewahren; nicht zurücksetzen oder ungefragt einbeziehen.
Bestätigte fachliche Ziele und Akzeptanzkriterien stehen im Nutzerauftrag oder
in einer konkret referenzierten Aufgabenakte. Kenntnisse aus anderen
ChatGPT-Chats dürfen nicht vorausgesetzt werden.

## Umsetzen

Kleine Aufgaben brauchen keine eigene Planakte. Für größere oder über mehrere
Sitzungen laufende Arbeiten eine Aufgabenakte nach [Vorlage](tasks/TEMPLATE.md)
nutzen: Ziel, beobachtbare Fertigkriterien, wenige Schritte, Erkenntnisse und
nächster konkreter Schritt. Keine zusätzliche Statusdatei je Sitzung anlegen.
Produktvorgaben, beobachtetes Verhalten und noch offene Entscheidungen trennen.
Dieselbe Aufgabenakte bis zum Abschluss oder einer brauchbaren Übergabe
fortschreiben, nicht je Sitzung duplizieren.

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

Nur betroffene aktuelle Fachdateien pflegen, keine Vertragskopien oder
Routine-Testzahlen ergänzen. Neue dauerhafte Entscheidungen mit Grund und Folgen
in `DECISIONS.md` festhalten; Routineimplementierungen sind keine neuen
Architekturentscheidungen. `AGENTS.md` bleibt der kurze verbindliche Einstieg.
Bei Verhaltensänderungen Tests gemäß [TESTING.md](TESTING.md#pruefauswahl) pflegen.
Für UI-Arbeit vorhandene semantische Tokens und Komponenten zuerst wiederverwenden;
neue Varianten brauchen einen konkreten Bedarf, Designänderungen einen Auftrag.
Design-Soll, aktuelle Umsetzung und offene Abweichungen getrennt halten.

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

## Verbindlicher PR-Ablauf

Dieser Ablauf gilt für kleine und große Aufgaben. PR- und Server-Kurzformen
lassen sich unabhängig kombinieren.

### `PR: neu`

1. Repository und aktuelle vorgesehene Basis prüfen (Remote/aktuellen Basisstand
   abgleichen), eigenen Arbeitsbranch anlegen; bei Bedarf isolierten Arbeitsbereich
   verwenden, um bestehende Nutzeränderungen zu bewahren.
2. Auftrag umsetzen, passend prüfen und gesamten Diff kontrollieren.
3. Nur aufgabenbezogene Änderungen committen und pushen.
4. Einen Pull Request gegen die vorgesehene Basis erstellen.

### `PR: #<Nummer>` oder PR-URL

1. PR, Repository, Zielbranch und Umfang auf Übereinstimmung mit dem Auftrag prüfen.
2. Zugehörigen offenen PR-Branch verwenden und vorhandene Arbeit erhalten.
3. Umsetzen, prüfen, committen und pushen; bestehenden PR aktualisieren,
   keinen zweiten PR für dieselbe Aufgabe anlegen.
4. Bei geschlossenem/gemergtem PR oder unklarer Zuordnung den konkreten Konflikt
   klären, statt stillschweigend einen Ersatz zu wählen.

### Für beide Modi

- Die Kurzform autorisiert die jeweils genannten Git-/PR-Schritte ohne weitere
  Bestätigungsrunde. „Nur lokal“, „noch nicht pushen“ und andere konkrete
  Nutzervorgaben gehen vor. Ohne PR-Angabe eindeutige fortgeltende
  Sitzungsanweisungen beachten; aus fehlender Angabe folgt keine Push-Erlaubnis.
- Kein Force-Push, kein Zurücksetzen fremder Arbeit, keine Konfliktauflösung
  durch Verwerfen von Änderungen.
- Vor dem Commit `git diff --cached --name-only` und den vollständigen
  Staging-Diff prüfen; Nutzeränderungen nicht ungefragt committen.
- Titel und Beschreibung auf den endgültigen Umfang abstimmen: Problem,
  resultierendes Verhalten, tatsächlich ausgeführte Prüfungen und relevante Grenzen.
- CI für den letzten gepushten Commit nachverfolgen. Eigene Fehler beheben,
  passend erneut prüfen und pushen; nach jedem Push beginnt die CI-Kontrolle
  für den neuen Commit. Bei fachfremden Fehlern oder fehlenden Voraussetzungen
  konkrete Blocker melden, keine unbegrenzten Reparaturen oder blinden Wiederholungen.
- Lokale Auswahlprüfungen ersetzen die CI-Kontrolle nicht. Ohne überprüfbare
  CI den PR nicht als vollständig geprüft bezeichnen. Konfiguration und Grenzen:
  [TESTING.md](TESTING.md#fertigkriterien-und-ci).
- Abschluss mit PR-Link, kurzem Ergebnis, Prüfstatus und verbleibenden Grenzen.
- Niemals mergen oder Auto-Merge aktivieren; der Nutzer übernimmt den Merge.

## Optionaler Anwendungsserver für manuelle Tests

Konkrete Einrichtung und Startbefehle bleiben in
[DEVELOPMENT.md](../DEVELOPMENT.md#normaler-start). Diese Steuerung ersetzt
weder automatisierte Prüfungen noch CI oder eine fachliche Funktionsabnahme.

### `Server: starten`

- Nach Umsetzung und lokalen Prüfungen den Server des bearbeiteten Checkouts
  bereitstellen. Bei PR-Aufträgen nach dem letzten vorgesehenen Push und der
  CI-Auswertung. Bei blockierter CI ist der Start eines lokal startfähigen
  Stands zulässig; den CI-Blocker ausdrücklich benennen.
- Dokumentierten Start, vorhandene virtuelle Umgebung und Konfiguration nutzen;
  standardmäßig Flask mit Oberfläche und Bibliothek, sofern nichts anderes
  ausdrücklich gewünscht ist. Nur dokumentiertes Loopback verwenden; keine
  Firewall-, LAN-, Router- oder Deploymentkonfiguration ändern.
- Unter Windows als Hintergrundprozess ohne zusätzliches sichtbares Fenster
  starten (`Start-Process` mit `-WindowStyle Hidden`); Logs temporär außerhalb
  des Repositorys halten. Vorhandene Ignore-Regeln, andere Hintergrundprozesse
  und Nutzerdaten dafür nicht verändern.
- Bereitschaft durch HTTP-Aufruf der Oberfläche prüfen. Prozessstart allein
  belegt keine Erreichbarkeit; eine antwortende URL allein belegt weder den
  richtigen Checkout noch aktuellen Code.
- Nach Abschluss soweit technisch möglich weiterlaufen lassen. Abschluss nennt
  anklickbare lokale URL, Checkout/Branch, Erreichbarkeitsstatus und konkrete
  Beenden-Anweisung (z. B. den eigenen Prozess anhand seiner PID stoppen).
  HTTP-Erreichbarkeit ist keine manuelle/fachliche Funktionsabnahme.
- Die Kurzform autorisiert erforderliche reversible lokale Startschritte ohne
  zusätzliche Bestätigungsrunde.

### `Server: aus` oder ohne Server-Angabe

Keinen zusätzlichen Anwendungsserver für manuelle Tests starten; bestehende
Server weder beenden noch verändern. Ohne Angabe eine eindeutige fortgeltende
Sitzungsanweisung berücksichtigen. `Server: aus` untersagt keine isolierten
Testserver, die erforderliche automatisierte Prüfungen selbst starten und beenden.

### Bereits laufende Server und Voraussetzungen

- Vor einem angeforderten Start Portbelegung prüfen. Nachweislich passenden
  Server desselben Checkouts wiederverwenden, wenn er den aktuellen Code liefert.
  Einen von Codex in dieser Sitzung gestarteten Server bei Bedarf neu starten;
  andere Prozesse nicht ungefragt beenden oder ersetzen.
- Bei unklarer Zuordnung oder anderweitig belegtem Port nur dann einen freien
  Loopback-Port verwenden, wenn der dokumentierte Start dies unterstützt.
  Andernfalls den Startkonflikt melden. Der aktuelle normale Flask-Einstieg
  bindet fest an Port 8000; daraus keinen alternativen Portparameter erfinden.
- Normale vorhandene Anwendungskonfiguration verwenden, keine synthetische
  Testbibliothek unterschieben. Bei isolierten Arbeitsbereichen fehlende
  Konfiguration/Ressourcen benennen; keine privaten Daten ungefragt kopieren.
- Beim Start keine Charakterdaten ändern oder schreibende API-Proben ausführen.
  Fehlende Regeldaten/andere Voraussetzungen benennen; nichts automatisch
  herunterladen oder generieren.
- Ist ein dauerhaft laufender Prozess technisch nicht möglich, das offen melden
  und den exakten Startbefehl für den betreffenden Checkout angeben.
- Im Abschluss Serverstatus nennen: nicht angefordert, gestartet, wiederverwendet
  oder Start blockiert; Einschränkungen und fehlende Voraussetzungen offenhalten.

## Beispiele für spätere Aufträge

Die folgenden Beispiele sind keine Implementierungsaufträge dieses
Dokumentations-PRs. Kleine Aufgaben benötigen keine Aufgabenakte.

```text
PR: neu
Server: starten
Setze docs/tasks/MOBILE_BUILDER.md für den mobilen Builder um.
```

```text
PR: #12
Server: aus
Behebe den beschriebenen Speicherfehler einschließlich Regressionstest.
Akzeptanz: Bei einem Revisionskonflikt bleiben lokale Änderungen erhalten.
```

Die Beispielnummer ist kein Verweis auf einen hier geprüften passenden PR;
bei tatsächlicher Verwendung gilt die Zuordnungsprüfung oben.
