# Aufgabe: Sicherer privater Betrieb auf Raspberry Pi

Status: offen. Zielrichtung vom 25.10.2026, durch die verbindliche
[Produktdefinition](../PROJECT.md#6-technical-constraints) vom 27.10.2026 konkretisiert;
keine Implementierungs- oder Netzwerkfreigabe durch den Dokumentations-PR.

## Ziel und Abgrenzung

Gemeinsame Charakterbibliothek für den Nutzer und seine private D&D-Gruppe
auf einem Raspberry Pi 3B, privat über LAN und später eine Domain mit
vorgeschaltetem Zugriffsschutz. Typisch vier gleichzeitig verbundene Personen,
maximale Zielgröße sieben Nutzer. Smartphone, Tablet und Desktop verwenden
dieselben persistenten Daten; lokale Entwicklung/Ausführung unter Windows 11.
JSON-Import/-Export erhalten; vorhandene Offline-Nutzung bleibt Legacy, keine
verpflichtende neue Offlineunterstützung.
Kein öffentliches Mehrmandantenprodukt; ein Obsidian-Web-Wiki auf demselben Pi
bleibt ein benachbarter Dienst ohne abgeleitete Integration.

## Relevante Grundlagen

- [Produktziel und aktueller Stand](../PROJECT.md)
- [Lokaler Start](../../DEVELOPMENT.md#normaler-start)
- [Backend/API](../../server/README.md), [Bedienung](../SERVER_LIBRARY.md)
- [Recovery und Grenzen](../STORAGE_RECOVERY.md)
- Bestehende Pfade: `server/app.py`, `server/storage.py`, `server/restore.py`.

## Akzeptanzkriterien

- Vor einer Freigabe sind berechtigte Nutzer/Zugriffswege, Schutzbedarf,
  Verantwortlichkeiten und Wiederherstellung nachvollziehbar festgelegt.
  Zugriffsschutz liegt vor der Anwendung; keine internen Konten, Rollen oder
  Berechtigungen einführen. Diese Betriebsprüfungen ersetzen nicht die zwei
  bestätigten [MVP-Abnahmekriterien](../PROJECT.md#8-success-criteria).
- Ein gesondert beauftragter Betrieb erlaubt der privaten Gruppe den vorgesehenen
  Zugriff aus dem Heimnetz, später von außen; unberechtigter Zugriff auf Charaktere,
  Archive, Konfiguration und Repository-Inhalte wird nachweisbar verhindert.
- Smartphone und Desktop können Charaktere öffnen und explizit speichern;
  konkurrierende Änderungen lösen weiterhin Revisionskonflikte statt Datenverlust aus.
- Privatdaten bleiben außerhalb des Repositorys. Backup, Wiederherstellung,
  Aktualisierung und Beenden des Dienstes sind praktisch geprüft und dokumentiert;
  Offline-/JSON-Nutzung funktioniert weiter.

## Umsetzung

1. Betriebsbedarf, Umgebung und Zugriffsschutz mit dem Nutzer konkretisieren.
2. Begrenztes Konzept mit offenen Alternativen und Prüfplan abstimmen; dauerhafte
   Entscheidungen mit Grund/Folgen in [DECISIONS.md](../DECISIONS.md) festhalten.
3. Erst mit gesondertem Auftrag implementieren und auf isolierten synthetischen
   Daten prüfen; passende aktuelle Start-/Betriebsdokumentation ergänzen.

## Erkenntnisse und offene Punkte

Der aktuelle Start bindet Loopback; Authentifizierung und geprüfte
Netzwerkbereitstellung fehlen. Bestehende Revisionen und Archive ersetzen keinen
Zugriffsschutz oder externes Backup. Deployment, Domain, Tunnel, VPN,
vorgeschalteter Zugriffsschutz sind in ihrer konkreten technischen Umsetzung
noch nicht beschlossen. Interne Benutzerverwaltung und Rollen sind ausgeschlossen.
Das Modell Raspberry Pi 3B und die Zielgröße vier bis sieben Nutzer sind festgelegt;
konkrete Pi-/Netzumgebung, Zugriffswege, Backupziel und Betriebsverantwortung
müssen vor einer Lösung geklärt werden. Der vorhandene JSON-Dateispeicher mit
Revisionen, Konflikterkennung und Backups ist die geeignete Ausgangsbasis;
keine Datenbankmigration ohne gesonderte Begründung oder Beauftragung vorsehen. Keine Startbefehle aus alten
Phasenplänen übernehmen und keine LAN-/Internetfreigabe vorwegnehmen.

## Übergabe

Nächster konkreter Schritt: gewünschte Zugriffswege und berechtigten Personenkreis
sowie vorhandene Pi-/Netzumgebung erheben und daraus Schutzbedarf/Prüfplan ableiten.
Noch keine Betriebsimplementierung oder Netzwerkabnahme durchgeführt;
gewöhnliche spätere Testergebnisse gehören in PR/CI.
