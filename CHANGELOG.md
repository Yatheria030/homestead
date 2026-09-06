# Änderungen

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung an [Semantic Versioning](https://semver.org/lang/de/).

## [0.2.0] – 2026-09-06

### Geändert

* Der Vorrat denkt in **Kaufrhythmen** statt in Beständen: Haltbarkeit einer Packung mal
  Kaufmenge ergibt das Intervall und daraus den nächsten Kauftermin.
* Reste aus dem letzten Einkauf verschieben den nächsten Termin automatisch.
* Zeilen zeigen Rhythmus und Countdown; der Balken zeigt die Position im Kaufzyklus.
* Die Einkaufsliste schlägt die übliche Kaufmenge vor.

### Neu

* Haltbarkeit in Tagen, Wochen oder Monaten eingebbar.
* Vorlauf je Artikel: so viele Tage vor dem Leerstand wird gekauft.
* Bezugsquelle als Link und Preis pro Einheit direkt in der Zeile.
* Begründung des Projekts in der README.

## [0.1.0] – 2026-09-06

### Neu

* Ausgaben mit Gesamtbetrag, eigenem Anteil und Ziel-Pocket, inline editierbar,
  gruppierbar nach Pocket oder Kategorie.
* Pocket-Ansicht mit Aufschlüsselung je Topf und „Plan kopieren“.
* Vorrat mit Listen, Reichweite und Nachbestellpunkt.
* Einkaufsliste nach Anbieter gebündelt.
* Abos aus Ausgaben und Vorrat an einer Stelle.
* Snapshot-System über die Online-Backup-API von SQLite.
* Automatische Schema-Migration bestehender Datenbanken.

[0.2.0]: https://github.com/Yatheria030/haushalt/releases/tag/v0.2.0
[0.1.0]: https://github.com/Yatheria030/haushalt/releases/tag/v0.1.0
