# Homestead

*English · [Deutsch](README.de.md)*

A self-hosted tool for the two things that get murky in every shared household:
**who pays what, and why** — and **what needs restocking, and when**. One Docker
container, one SQLite file, no account anywhere.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Stack](https://img.shields.io/badge/stack-FastAPI%20%C2%B7%20SQLite%20%C2%B7%20React-6366f1)

## Why this exists

**The joint-account problem.** Two people, one household: rent, utilities, electricity,
insurance, groceries, holiday savings. At some point there's a standing order for
€407.92 into the joint account — and three months later nobody remembers why that exact
number. Is electricity in there? Who covers the contents insurance, and who the
liability one? Who last paid for what out of pocket?

The friction is rarely about fairness. It's about **traceability** — and that is exactly
what a spreadsheet loses first, once formulas span three sheets and changing one number
means hoping nothing breaks.

Homestead keeps the chain visible in both directions:

```
line item → full amount → who covers which share → which pocket it goes to
```

Every pocket can be opened up to show which line items make up its amount. When
electricity gets more expensive, you change one number and immediately see which standing
order needs adjusting — not at year-end while reconciling. Items that deliberately bypass
the shared pots stay visible but are excluded from the total, so the total always matches
what actually gets transferred.

**Pockets as an income router.** If your bank does sub-accounts (N26 Spaces, Bunq,
Revolut Vaults, Monzo Pots, Starling Spaces …), this becomes an automation: set up one
standing order per pocket, and your salary distributes itself at the start of the month —
rent, energy, car, holiday, joint account. Whatever's left is genuinely free to spend, no
mental math required.

Homestead holds the **plan**; the bank merely executes it. When something changes, "copy
plan" hands you the current target amount per pocket — adjust the standing orders, done.

**The same idea for things instead of money.** Cat litter, food, filters, toothpaste:
stuff you need on a fixed rhythm, and which gets cheaper if you buy in bulk or by
subscription. Homestead derives the buying rhythm from how long a pack lasts and how many
you buy at a time, tells you when the next run is due, and bundles everything due into one
shopping list per vendor. For subscriptions it also shows whether the delivery rate
actually covers your consumption — and what it saves against the regular price.

## What's in it

**Expenses** — every line item has a full amount, your share (50 % by default) and a
target pocket. Homestead works out what goes to which pot each month; yearly and quarterly
bills are spread across months automatically. Pockets can be marked as *not counting
toward the total*, for items that run directly between the two of you.

**Pockets** — a breakdown per pot: how much, what it consists of, what share of the total
it is. "Copy plan" puts the transfer list on your clipboard.

**Supplies** — consumables by rhythm rather than by memory, and the rhythm is
**measured, not guessed**: log when you bought something (including past purchases,
backfilled) and how much, and Homestead works out how long a pack actually lasts you from
the span between purchases. The "bought it" button does this automatically; a small form
in the item lets you backfill history or correct today's quantity. Only for a brand-new
item, before any purchases are logged, does a rough manual estimate fill the gap. Combined
with the amount you currently have on hand, that tells you the buying rhythm ("3 packs
every ~5 weeks") and the next buying date. Buying in bulk simply means logging bigger
purchases and watching the rhythm stretch. Lists (Cat, Bathroom, Kitchen …) organise it
like a task app. Delete an item and it goes to a trash instead of vanishing — 30 days to
bring it back, purchase history included, before it's gone for good. The list itself is a
spreadsheet-style grid, same as Expenses — click any cell to edit it, stock included.

**Shopping list** — everything that has reached its buying date, grouped by vendor, with
quantity and total. Ticking an item books the purchase and restarts its rhythm.

**Subscriptions** — recurring costs from both expenses and supplies in one place, per
month and per year, including whether a subscription covers real consumption and what it
saves.

## Quick start

```bash
git clone https://github.com/Yatheria030/homestead.git
cd homestead
cp .env.example .env
docker compose up -d --build
```

Then open **http://localhost:8080** (change the port via `WEB_PORT` in `.env`). On first
start it seeds an example household so the UI isn't empty — replace those numbers with
your own, or set `SEED_ON_START=false` to start blank.

Stop with `docker compose down`; your data stays.

## Security

Homestead ships **without authentication** — it's built as a tool for your own network.
Anyone who can reach the address can see and change everything, and the data is financial
data. So: keep it on your LAN, reach it through a VPN (WireGuard, Tailscale), or put it
behind a reverse proxy that handles auth (Caddy with basic auth, Authelia, oauth2-proxy).
See [SECURITY.md](SECURITY.md).

## Data and backups

Everything lives in one SQLite file, `./data/homestead.db`, with snapshots next to it in
`./data/backups/`. **Settings → Backups** gives you a full snapshot system:

* **Automatic** every 24 hours (`BACKUP_INTERVAL_HOURS`), keeping the last 14
  (`BACKUP_KEEP`). Manual snapshots are never pruned.
* **Manual** at any time, with a note.
* **Download** as a `.db` file — for your NAS or cloud.
* **Upload** a downloaded file back in (validated as a real SQLite database).
* **Restore** with a safety net: the current state is snapshotted before anything is
  overwritten.

Snapshots go through SQLite's online backup API, so they stay consistent even while the
app is being written to — unlike copying the file.

## How it works

```
Dockerfile            builds the frontend (Node), then the API image (Python)
docker-compose.yml
api/app/
  models.py           categories, pockets, expenses, lists, supplies, purchases
  schemas.py          input/output plus derived values (share, rhythm, coverage)
  routers/            /expenses, /supplies, /supply-lists, /shopping-list,
                      /pockets, /categories, /summary, /backups
  backup.py           snapshots via SQLite's online backup API
  migrate.py          adds missing columns to existing databases
  seed.py             example household and supplies
web/src/
  pages/              overview, expenses, pockets, supplies, shopping list,
                      subscriptions, settings
  components/         inline-editable grid, supply detail panel, cards, chips
```

The API documents itself at `/api/docs`. The interface is currently German only.

### The maths

**Money**

* **Your share** = full amount × your percentage (50 % by default).
* **Interval** (monthly / quarterly / yearly) is normalised to one month for every total.
* Sums are added up unrounded and rounded only at the end, half-up to the cent.
* Pockets without *counts toward total* are reported separately, not in the total.

**Supplies**

* **Measured rate**: with two or more purchases logged, how long a pack lasts is
  computed as (days between the oldest and newest of the last 8 purchases) / (packs
  bought in that span, excluding the newest — that one's still sitting in stock, at
  least in part). Buying in bulk, buying early, buying late: all of it is real data,
  averaged automatically. Only when fewer than two purchases exist does a manual
  estimate fill the gap.
* **Rhythm** = that rate × the average quantity per purchase. A bag of litter lasts
  3 weeks, you buy two: every 6 weeks.
* **Next buying date** = last purchase + rhythm − lead time, where lead time is how many
  days ahead of running out you want to buy.
* **Current stock** decays from whatever you last entered, using the measured rate — so
  "how much is left" stays realistic between purchases too.
* **Cost per month** = pack price / measured days per pack × 30.44.
* **Subscription coverage** = delivered per day ÷ measured consumption per day. 100 %
  means the subscription matches actual consumption exactly.
* **Yearly saving** = (regular price − subscription price) × 365 / measured days per pack.

## Development

Without Docker:

```bash
cd api && pip install -r requirements.txt && uvicorn app.main:app --reload
cd web && npm install && npm run dev
```

The frontend then runs on port 5173 and proxies to the API on 8000.

If SQLite ever stops being enough, a different `DATABASE_URL` (Postgres, say) is all it
takes — the data model is plain SQLAlchemy.

## License

[MIT](LICENSE) — use it, change it, do what you like with it.
