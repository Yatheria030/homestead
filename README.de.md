# Homestead

*[English](README.md) · Deutsch*

Ein selbstgehostetes Werkzeug für zwei Dinge, die in jedem gemeinsamen Haushalt
irgendwann unübersichtlich werden: **wer zahlt wofür wie viel** und **was muss wann
nachgekauft werden**. Ein Docker-Container, eine SQLite-Datei, kein Konto bei irgendwem.

## Warum das Ganze

**Das Gemeinschaftskonto-Problem.** Zwei Leute, ein Haushalt: Miete, Nebenkosten, Strom,
Versicherungen, Einkauf, Urlaubsrücklage. Irgendwann steht ein Dauerauftrag über 407,92 €
aufs Gemeinschaftskonto – und drei Monate später weiß niemand mehr, warum ausgerechnet
diese Zahl. Ist der Strom da drin? Zahlt der andere die Hausratversicherung, oder war das
die Haftpflicht? Wer hat zuletzt was ausgelegt?

Der Streitpunkt ist dabei selten die Fairness. Es ist die **Nachvollziehbarkeit**. Genau
die geht in einer gewachsenen Excel als Erstes verloren: Formeln über drei Blätter, und
eine Zahl ändern heißt hoffen, dass nichts kippt.

Diese App macht die Kette sichtbar, in beide Richtungen:

```
Position → Gesamtbetrag → wer trägt welchen Anteil → auf welchen Topf geht das Geld
```

Jeder Pocket lässt sich aufklappen und zeigt, aus welchen Positionen sich sein Betrag
zusammensetzt. Wird der Strom teurer, änderst du eine Zahl und siehst sofort, welcher
Dauerauftrag um wie viel angepasst werden muss – nicht am Jahresende beim Nachrechnen.
Positionen, die bewusst an den gemeinsamen Töpfen vorbeilaufen, bleiben sichtbar, zählen
aber nicht in die Summe, damit der Gesamtbetrag exakt dem entspricht, was tatsächlich
überwiesen wird.

**Pockets als Einkommensverteiler.** Wenn die Bank Unterkonten kann (N26 Spaces, Bunq,
Revolut Vaults, DKB, Trade Republic …), wird daraus ein Automatismus: Für jeden Topf
einmal einen Dauerauftrag einrichten, und das Gehalt verteilt sich am Monatsanfang von
selbst – Miete, Strom, KFZ, Urlaub, Gemeinschaftskonto. Was übrig bleibt, ist frei
verfügbar, ohne Kopfrechnen.

Die App ist dabei der Ort, an dem der **Plan** steht; die Bank führt ihn nur aus. Ändert
sich etwas, gibt „Plan kopieren“ die aktuelle Soll-Liste je Topf aus – daran passt man die
Daueraufträge an, fertig. Kein Tabellenblatt, das keiner mehr anfassen will.

**Und der gleiche Gedanke für Dinge statt Geld.** Katzenstreu, Futter, Filter, Zahnpasta:
Sachen, die man in festem Rhythmus braucht und günstiger wird, wer auf Masse oder im Abo
kauft. Der Vorrat rechnet aus Haltbarkeit und Kaufmenge den Kaufrhythmus aus, sagt, wann
der nächste Einkauf ansteht, und bündelt alles Fällige zu einer Einkaufsliste je Anbieter.
Bei Spar-Abos zeigt er außerdem, ob das Abo den echten Verbrauch überhaupt deckt – und was
es gegenüber dem Normalpreis spart.

## Was drin ist

**Pockets** – jede Kostenposition hat einen Gesamtbetrag, deinen Anteil (Standard 50 %)
und ein Ziel-Pocket. Die App rechnet daraus, was pro Monat auf welchen Topf geht.
Jahres- und Quartalsbeiträge werden dabei automatisch auf den Monat umgelegt. Pockets
lassen sich auf „zählt nicht zur Summe“ stellen – für Posten, die direkt zwischen euch
laufen statt über einen gemeinsamen Topf.

**Vorrat** – Verbrauchsgüter im Rhythmus statt im Kopf, und der Rhythmus wird
**gemessen, nicht geschätzt**: du trägst ein, wann du was gekauft hast – auch rückwirkend
– und Homestead errechnet aus dem Abstand zwischen den Käufen, wie lange eine Packung bei
dir tatsächlich hält. Der „Gekauft“-Knopf macht das automatisch mit; ein kleines Formular
im Artikel lässt vergangene Käufe nachtragen oder die heutige Menge korrigieren. Nur bei
einem ganz neuen Artikel, bevor Käufe vorliegen, füllt eine grobe Schätzung die Lücke.
Zusammen mit dem Bestand, den du gerade hast, ergibt das den Kaufrhythmus („2 Packungen
alle 6 Wochen“) und den nächsten Kauftermin. Wer auf Masse kauft, trägt einfach größere
Käufe ein und sieht, wie weit der Rhythmus dadurch auseinanderrückt. Listen (Katze, Bad,
Küche …) sortieren das Ganze wie in einer Aufgaben-App. Löschen landet im Papierkorb statt
im Nichts – 30 Tage lang wiederherstellbar, samt Kaufhistorie, bevor es endgültig weg ist.
Die Liste gibt es in zwei umschaltbaren Ansichten: als Tabelle, in der jede Zelle
anklickbar ist – auch der Bestand –, und als Kartenansicht mit Fortschrittsbalken im
Kaufzyklus und Preis je Einheit.

**Einkaufsliste** – alles, was seinen Kauftermin erreicht hat, gebündelt nach Anbieter,
mit Menge und Summe. Abhaken bucht den Kauf und startet den Rhythmus neu.

**Abos** sammelt beides an einer Stelle: laufende Kosten aus den Ausgaben plus die
Vorratsartikel im Abo, hochgerechnet auf Monat und Jahr – inklusive der Frage, ob ein
Spar-Abo den tatsächlichen Verbrauch deckt und was es gegenüber dem Normalpreis spart.

## Starten

```bash
git clone https://github.com/Yatheria030/homestead.git
cd homestead
cp .env.example .env
docker compose up -d
```

Das zieht das veröffentlichte Image (`ghcr.io/yatheria030/homestead`, `linux/arm64`). Auf
amd64 oder für eigene Änderungen stattdessen lokal bauen: `docker compose up -d --build`.

Danach läuft die App auf **http://localhost:8099** (Port über `WEB_PORT` in der `.env`
änderbar). Beim ersten Start werden die Positionen aus der Excel als Startdaten angelegt,
dazu ein Beispiel-Vorrat – beides in der App frei änder- und löschbar.

Auf eine neue Version aktualisieren mit `docker compose pull && docker compose up -d`.
Stoppen mit `docker compose down`, die Daten bleiben erhalten.

## Sicherheit

Die App bringt **keine Anmeldung** mit – sie ist als Werkzeug im eigenen Netz gedacht. Wer
die Adresse erreicht, sieht alle Daten. Also entweder nur im Heimnetz betreiben, per VPN
(WireGuard, Tailscale) erreichbar machen oder hinter einen Reverse Proxy mit
Authentifizierung hängen. Details in [SECURITY.md](SECURITY.md) (englisch).

## Daten und Backup

Alles liegt in einer SQLite-Datei: `./data/homestead.db`, die Snapshots daneben in
`./data/backups/`. Neu anfangen heißt: Datei löschen und neu starten – dann wird wieder
geseedet (abschaltbar über `SEED_ON_START=false`).

Unter **Einstellungen → Backups** gibt es ein vollständiges Snapshot-System:

* **Automatisch** alle 24 Stunden (`BACKUP_INTERVAL_HOURS`), die letzten 14 bleiben
  erhalten (`BACKUP_KEEP`). Manuelle Snapshots werden nie automatisch gelöscht.
* **Von Hand** jederzeit, mit Notiz.
* **Herunterladen** als `.db` – etwa auf die NAS oder in die Cloud.
* **Einspielen** einer heruntergeladenen Datei per Upload (wird auf ein echtes
  SQLite-Format geprüft).
* **Zurückspielen** mit Sicherheitsnetz: bevor ein Snapshot eingespielt wird, sichert die
  App automatisch den aktuellen Stand.

Snapshots laufen über SQLites Online-Backup-API, sind also auch dann konsistent, wenn
gleichzeitig geschrieben wird – anders als ein bloßes Kopieren der Datei.

## Aufbau

Ein Container, ein Port. FastAPI serviert die API und das gebaute Frontend.

```
Dockerfile            Frontend bauen (Node) → API-Image (Python)
docker-compose.yml
api/app/
  models.py           Kategorien, Pockets, Ausgaben, Listen, Vorrat, Kaufhistorie
  schemas.py          Ein-/Ausgabe + berechnete Felder (Anteil, Reichweite, Abo-Deckung)
  routers/            /expenses, /supplies, /supply-lists, /shopping-list,
                      /pockets, /categories, /summary, /backups
  backup.py           Snapshots über die Online-Backup-API von SQLite
  migrate.py          ergänzt fehlende Spalten in bestehenden Datenbanken
  seed.py             Startdaten aus der Excel + Beispiel-Vorrat
web/src/
  pages/              Übersicht, Ausgaben, Pockets, Vorrat, Einkaufsliste, Abos,
                      Einstellungen
  components/         Grid mit Inline-Editing, Vorrats-Detailpanel, Karten, Chips
```

Die API ist unter http://localhost:8099/api/docs dokumentiert.

## Rechenregeln

* **Dein Anteil** = Gesamtbetrag × Anteil in % (Standard 50 %).
* **Intervall** (monatlich/quartalsweise/jährlich) wird für alle Summen auf einen Monat
  umgerechnet.
* Summiert wird ungerundet, gerundet wird erst am Ende – kaufmännisch auf Cent, damit
  dieselben Beträge herauskommen wie in der Excel (Gesamt 1.259,66 €).
* Pockets ohne „zählt zur Summe“ bleiben aus der Gesamtsumme raus, werden aber separat
  ausgewiesen.
### Vorrat

* **Gemessene Haltbarkeit**: ab zwei eingetragenen Käufen errechnet sich, wie lange eine
  Packung hält, aus (Tage zwischen dem ältesten und dem jüngsten der letzten 8 Käufe) /
  (in der Zeit gekaufte Packungen, ohne den jüngsten Kauf – der liegt ja noch ganz oder
  teilweise im Bestand). Auf Masse kaufen, früher kaufen, später kaufen – alles fließt als
  echte Daten automatisch mit ein. Erst bei weniger als zwei Käufen füllt eine grobe
  Schätzung die Lücke.
* **Kaufrhythmus** = diese Rate × die durchschnittliche Menge pro Kauf. Ein Sack
  Katzenstreu hält 3 Wochen, du kaufst zwei: alle 6 Wochen.
* **Nächster Kauftermin** = letzter Einkauf + Rhythmus − Vorlauf. Der Vorlauf sind die
  Tage, die du vor dem Leerstand kaufen willst (Lieferzeit, Puffer).
* **Aktueller Bestand** schreibt sich vom zuletzt eingetragenen Wert aus mit der
  gemessenen Rate herunter – so bleibt „wie viel ist noch da“ auch zwischen den Käufen
  realistisch.
* **Status**: überfällig · jetzt kaufen (Vorlauf erreicht) · bald dran · im Plan.
* **Kosten pro Monat** = Packungspreis / gemessene Tage pro Packung × 30,44.
* **Abo-Deckung** = gelieferte Menge pro Tag ÷ verbrauchte Menge pro Tag. 100 % heißt:
  das Abo trifft den Verbrauch genau, darunter kaufst du regelmäßig dazu.
* **Ersparnis pro Jahr** = (Normalpreis − Abopreis) × 365 / Tage pro Packung.

## Weiterentwicklung

Lokal ohne Docker:

```bash
cd api && pip install -r requirements.txt && uvicorn app.main:app --reload
cd web && npm install && npm run dev
```

Das Frontend läuft dann auf Port 5173 und spricht über einen Proxy mit der API auf 8000.

Wenn das Tool wächst und SQLite nicht mehr reicht, genügt eine andere `DATABASE_URL`
(z. B. Postgres) – das Datenmodell liegt in SQLAlchemy und ist portabel.

Die Startdaten in `api/app/seed.py` sind erfundene Beispielwerte. Beim ersten Start werden
sie angelegt, damit die Oberfläche nicht leer ist; danach ersetzt man sie einfach durch die
eigenen Zahlen (oder schaltet sie mit `SEED_ON_START=false` von vornherein ab).

## Lizenz

[MIT](LICENSE) – benutz es, ändere es, mach damit was du willst.
