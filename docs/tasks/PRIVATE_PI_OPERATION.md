# Aufgabe: Sicherer privater Betrieb auf Raspberry Pi

Status: offen. Bestätigte Zielrichtung aus dem Nutzerauftrag vom 25.10.2026;
keine Implementierungs- oder Netzwerkfreigabe durch den Dokumentations-PR.

## Ziel und Abgrenzung

Gemeinsame Charakterbibliothek für den Nutzer und seine private D&D-Gruppe
perspektivisch auf einem Raspberry Pi, sicher im Heimnetz und später von außen.
Smartphone/Desktop, Offline-Nutzung und lokale JSON-Dateien erhalten.
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
Authentifizierung und ein mögliches Konten-/Rollenmodell sind nicht beschlossen.
Pi-Umgebung, Zugriffsbedarf, Nutzerkreis, Backupziel und Betriebsverantwortung
müssen vor einer konkreten Lösung geklärt werden. Keine Startbefehle aus alten
Phasenplänen übernehmen und keine LAN-/Internetfreigabe vorwegnehmen.

## Übergabe

Nächster konkreter Schritt: gewünschte Zugriffswege und berechtigten Personenkreis
sowie vorhandene Pi-/Netzumgebung erheben und daraus Schutzbedarf/Prüfplan ableiten.
Noch keine Betriebsimplementierung oder Netzwerkabnahme durchgeführt;
gewöhnliche spätere Testergebnisse gehören in PR/CI.
