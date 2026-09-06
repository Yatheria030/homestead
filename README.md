# Haushalt

Ablösung für die `hausgeld_dropdown_v7.xlsx`: eine kleine Web-App für den Haushalt,
die zwei Dinge kann und für mehr offen ist.

**Pockets** – jede Kostenposition hat einen Gesamtbetrag, deinen Anteil (Standard 50 %)
und ein Ziel-Pocket. Die App rechnet daraus, was pro Monat auf welchen Topf geht –
inklusive Pockets wie „Direkt untereinander“, die bewusst nicht in die Gesamtsumme zählen.

**Vorrat** – Verbrauchsgüter auf Vorrat und im Abo: Katzenstreu, Futter, Filter,
Zahnpasta, Handseife und so weiter. Pro Artikel steht drin, wie lange eine Packung hält
und wie viel gerade da ist; den Rest rechnet die App. Der Bestand schreibt sich täglich
selbst ab, daraus ergeben sich Restreichweite, Nachbestellzeitpunkt und Bestellmenge.
Listen (Katze, Bad, Küche …) sortieren das Ganze wie in einer Aufgaben-App.

**Einkaufsliste** – alles, was unter seinen Nachbestellpunkt gerutscht ist, gebündelt nach
Anbieter, mit Menge und Summe. Abhaken bucht den Kauf direkt in den Bestand.

**Abos** sammelt beides an einer Stelle: laufende Kosten aus den Ausgaben plus die
Vorratsartikel im Abo, hochgerechnet auf Monat und Jahr – inklusive der Frage, ob ein
Spar-Abo den tatsächlichen Verbrauch deckt und was es gegenüber dem Normalpreis spart.

## Starten

```bash
docker compose up -d --build
```

Danach läuft die App auf **http://localhost:8099** (Port über `WEB_PORT` in der `.env`
änderbar). Beim ersten Start werden die Positionen aus der Excel als Startdaten angelegt,
dazu ein Beispiel-Vorrat – beides in der App frei änder- und löschbar.

Stoppen mit `docker compose down`, die Daten bleiben erhalten.

## Daten und Backup

Alles liegt in einer SQLite-Datei: `./data/haushalt.db`, die Snapshots daneben in
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

* **Bestand**: Was zuletzt gezählt oder gekauft wurde, minus dem geschätzten Verbrauch
  seither. Deshalb muss nichts gepflegt werden, solange sich der Verbrauch nicht ändert.
* **Reichweite** = Bestand in Packungen × Tage, die eine Packung hält.
* **Status**: leer (0 Tage) · bestellen (unter dem Puffer) · wird knapp (unter dem
  doppelten Puffer) · genug da.
* **Bestellmenge** = so viele Packungen, dass die Zielreichweite wieder erreicht wird –
  damit lässt sich bewusst auf Masse kaufen (Zielreichweite z. B. 90 Tage).
* **Kosten pro Monat** = Packungspreis / Tage pro Packung × 30,44.
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
