# Globale Darstellung

Der Schalter oben rechts gilt fuer Startseite, Bibliothek, jeden Creator-Schritt,
Charakterbogen und alle sechs Referenzseiten. Er wechselt ausdruecklich zwischen
Light und Dark Mode. Die persoenliche Wahl wird unter `cc-theme` im localStorage
der aktuellen Herkunft gespeichert. Ohne gueltige gespeicherte Wahl gilt
`prefers-color-scheme`; Aenderungen der Systemeinstellung werden solange verfolgt.
Ein Tab uebernimmt auch Theme-Aenderungen anderer Tabs derselben Herkunft.

`js/theme.js` setzt das Root-Theme bereits im HTML-Head vor Styles und Regeldaten,
um falsche helle/dunkle Zwischenbilder moeglichst zu vermeiden. Die bestehenden
Farben werden ueber gemeinsame CSS-Variablen und die bisherige `body.dark`-Klasse
angewendet. Ein neues Framework ist nicht erforderlich.

Der Charakterwert `sheet.dark` wird unveraendert gelesen und exportiert, hat aber
keinen Einfluss auf die persoenliche Darstellung. Das Umschalten veraendert kein
Charakter-JSON und macht den Charakter nicht ungespeichert. Ein neuer Charakter,
ein Import und die Rueckkehr zur Startseite veraendern das Theme ebenfalls nicht.

Manueller Test: Theme auf der Startseite umschalten, alle Creator-Schritte und
den Bogen oeffnen, dann die Referenzseiten besuchen. Einen alten Charakter mit
dem entgegengesetzten `sheet.dark` laden. Die Darstellung muss gleich bleiben.
Seite neu laden bzw. Browser neu starten: dieselbe Wahl muss wiederhergestellt
werden. Ohne gespeicherte Wahl zunaechst das System-Theme verwenden. Testlauf:

```powershell
node tools\validate_theme.mjs
```

Wenn der Browser localStorage sperrt oder im privaten Modus beim Schliessen
loescht, funktioniert der Schalter weiterhin fuer die geoeffnete Seite; eine
dauerhafte Speicherung ist dann technisch nicht moeglich. Verschiedene Ports,
`localhost`, `127.0.0.1` und `file://` haben getrennte Browserspeicher.
