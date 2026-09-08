# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning
follows [Semantic Versioning](https://semver.org/).

Optional: a `> tagline: ...` line right under the version heading becomes the GitHub
release title ("0.7.8 – <tagline>"), matching the long-running "0.7.x – Kurztitel"
scheme. Without one, the release is titled with the bare version number.

## [0.7.12] – 2026-09-08
> tagline: Shelf life at a glance

### Added

* The supplies table has a new **Haltbarkeit** column between *Bestand* and
  *Rhythmus*: click to edit how long one pack lasts, entered in days / weeks /
  months and stored in days — the same value as the drawer's rough estimate, so
  it still gives way to the history-derived rate once enough purchases exist.

### Changed

* Renaming a supply list now goes through a patch schema instead of requiring
  every field, and the emoji can be set straight from the article drawer.

### Removed

* The "Kaufmenge" (packs per purchase) field is gone from the drawer's rough
  estimate box — it was redundant with the pack size and the history-derived
  rhythm. Existing values keep working; the field just isn't editable anymore.

## [0.7.11] – 2026-09-07
> tagline: Ask before you assume

### Added

* A "recount" checkpoint: set a target stock (Soll-Bestand) and a recheck interval
  per supply via the drawer. When the date comes, the supply shows up in a new
  "Nachzählen" status with an inline answer field in the table.
* `POST /supplies/{id}/recount`: records the count, refines the usage rate from
  the gap between two counts, and either pushes the date back or puts the item on
  the shopping list up to the target stock.
* Restocking and manual stock edits now clear an open "jetzt kaufen" from a
  previous count.

## [0.7.10] – 2026-09-07
> tagline: Give lists a face

### Added

* The inline "new list" form in the supplies table now takes an emoji alongside the
  name, so a freshly created list can already have a face — no more bare bullet
  in the dropdown.

### Changed

* The release image build now ships `linux/arm64` only, which cuts the build time
  roughly in half. Runners can still pull a working image on Apple Silicon and
  Linux ARM directly.

## [0.7.9] – 2026-09-07
> tagline: Edit the list right in the table

### Added

* The list chip in the supplies table is now inline-editable: click it to open a
  dropdown of all lists (plus "Keine Liste" to detach). Saves immediately on
  selection, same click-to-edit feel as the other cells.

## [0.7.8] – 2026-09-07
> tagline: Separators scoped to the supplies table

### Fixed

* The column separators from 0.7.7 were drawn on **every** table (supplies,
  expenses, subscriptions, pockets). They were meant for the supplies table only —
  the separators are now opt-in and enabled exactly there, the other tables are
  back to how they were.

## [0.7.7] – 2026-09-07
> tagline: Column separators

### Added

* Subtle vertical separators between the columns of the supplies table, so the
  header reads like one grid instead of floating words.

### Fixed

* Sorting by the "Liste" header used to un-capitalise the word — the label flipped
  between "L I S T E" and "Liste". It stays in the same shape, now; active sort is
  only signalled by the color and the arrow.

## [0.7.6] – 2026-09-07
> tagline: Column resizing

### Added

* Excel-style **column resizing** in the supplies table: drag the vertical grip on
  the right edge of a header to widen or narrow that column. The width is your own
  memory — it's saved between visits (and survives the page being re-opened), and
  any column you never touched keeps its default size.

## [0.7.5] – 2026-09-07
> tagline: List column, sortable

### Added

* Which list each article belongs to is back in the table — as a small colored chip in
  its own column, so "that's the cat stuff" is visible without opening anything.
  Clicking the **Liste** header sorts the rows by list (A → Z, then Z → A, then off),
  with status and due date as the tie-breaker inside a list. The card view shows the
  same chip next to the name.

## [0.7.4] – 2026-09-07

### Fixed

* The supplies grid scrolled sideways again after the purchase-link button was added
  to the action column: the declared column widths only ever acted as a minimum, so
  the table grew past them. The grid now uses a fixed table layout, which makes the
  widths binding, and the columns were re-cut to the widths actually measured —
  930 px of table in 930 px of space. The Expenses grid keeps its old behaviour.

### Changed

* Release workflow builds images one at a time. Two tags pushed minutes apart both
  wrote to the same Actions cache and deadlocked; one run hung in the build step
  until it was cancelled.

## [0.7.3] – 2026-09-07

### Added

* The per-article purchase link is now a small button in every row's action area,
  next to the "gekauft" button — in both the grid and the card view. The link no
  longer hides in the provider column, and that column shows the editable name only.

## [0.7.2] – 2026-09-07

### Changed

* The supplies grid fits on screen without scrolling sideways. List and location are
  gone from the table (both still editable in the detail panel), and so are contents
  and price per unit — those two live in the card view, which is one click away.
* The status chip became a colored dot, and the per-row trash icon moved into the
  detail panel, to buy back the width. Everything else stayed.

## [0.7.1] – 2026-09-07

### Added

* The card view is back — as a **switchable view** next to the grid, the way NocoDB
  lets a table be looked at more than one way. Cards keep what the grid can't show:
  the cycle progress bar with its buy-date marker, pack size and price per unit at a
  glance. The choice is remembered.
* The grid gained **contents** and **price per unit** columns, so switching views is
  about how you want to read the data, not about which facts you get.

## [0.7.0] – 2026-09-07

### Changed

* Supplies is now a proper data grid, matching the Expenses page's look and feel:
  a sticky-header table with click-to-edit cells for name, list, location, price and
  subscription — instead of a card list.
* **Stock is now its own editable column** — click it, type the count, done. No more
  detour through the detail panel just to correct how much is left.
* A status column (colored chip) and a rhythm/next-purchase column give the same
  at-a-glance read the card list did, just denser.
* Row actions (buy, open details, move to trash) live in one column on the right,
  visible on hover — same pattern as the Expenses grid.

The trash view is unchanged; it's a short, occasional list and didn't need the grid
treatment.

## [0.6.3] – 2026-09-07

### Fixed

* A purchase logged via the quick "bought it" button (row list, dashboard, or the
  drawer's own button) could be missing from the purchase history if you'd viewed
  that item's history in the last few seconds — the mutation updated stock and
  history on the server correctly, but never told the cached history view it was
  stale. It does now.

## [0.6.2] – 2026-09-07

### Changed

* Reordered the supply detail panel: rhythm, lead time, current stock, contents/price/
  vendor and subscription now come first — the things you'd actually glance at.
  Purchase history and the rough fallback estimate moved to the bottom, next to the
  note field — things you go there to correct, not to read.

## [0.6.1] – 2026-09-07

### Removed

* "Custom label" and "regular price" as separate form fields — two rarely-needed
  inputs cluttering the common case. Existing data isn't touched; a custom label or
  regular price already saved on an item still shows wherever it did before, there's
  just no input for setting new ones anymore.

## [0.6.0] – 2026-09-07

### Added

* The "bought it" button now lets you type a different quantity right where you click
  it — on the dashboard and in the supply list — instead of always logging the usual
  amount. Click the number, type, confirm; no detour through the detail panel.
* The rough estimate's "purchase quantity" field now shows a live cross-reference to
  contents, e.g. "2 packs → 6 pieces at once", so it's clear the two numbers answer
  different questions (what's in a pack vs. how many packs you buy) instead of looking
  like the same thing asked twice.

## [0.5.1] – 2026-09-07

### Added

* Rename a supply item right in the list — click the name, type, done. No detour
  through the detail panel just to fix a typo.

## [0.5.0] – 2026-09-07

### Added

* Deleting a supply item now moves it to a **trash** instead of removing it outright.
  Restorable for 30 days (purchase history included), then automatically purged in the
  background; a permanent-delete option is available immediately if you're sure.

### Changed

* "Pack size" and "contents" no longer ask for the same thing twice: contents (amount +
  unit) drives the maths, and the pack label is now optional, auto-filled from contents
  unless you give it its own wording (useful for multi-packs like "2x 250 ml").
* The dashboard's subscription savings and monthly supply cost now use the measured
  purchase-history rate too, instead of only the manual fallback — they were silently
  bypassing it before.

## [0.4.0] – 2026-09-07

### Changed

* The buying rhythm is now **measured from purchase history, not estimated**: with two
  or more logged purchases, "how long does one pack last" is computed from the span
  between purchases rather than typed in by hand. A rough manual estimate now only fills
  the gap before enough history exists.
* Current stock decay uses this measured rate.
* Subscription coverage compares against measured consumption instead of a guess.

### Added

* A purchase-history list on every supply item: log a purchase for any past date,
  including backfilling, without touching current stock.
* The "bought it" button still does both at once — logs the purchase and adds to stock —
  now with an explicit toggle if you don't want that for a given entry.
* A small history indicator in the supply list shows which items have a measured rhythm.

## [0.3.0] – 2026-09-06

### Changed

* Renamed the project to **Homestead**; the database file is now `homestead.db`.

### Added

* MIT license, security policy, changelog.
* English README with a German translation alongside it.
* CI builds the frontend and the container and checks that the API comes up.
* Release workflow publishes a multi-arch image to GHCR on every tag.

### Removed

* The seed data no longer contains real household figures — it's an invented example
  household now.

## [0.2.0] – 2026-09-06

### Changed

* Supplies think in **buying rhythms** rather than stock levels: how long a pack lasts
  times how many you buy gives the interval, and from that the next buying date.
* Leftovers from the last purchase shift the next date automatically.
* Rows show rhythm and countdown; the bar shows where you are in the cycle.
* The shopping list suggests your usual purchase quantity.

### Added

* Pack duration can be entered in days, weeks or months.
* Lead time per item: how many days before running out you want to buy.
* Vendor link and price per unit right in the row.

## [0.1.0] – 2026-09-06

### Added

* Expenses with full amount, personal share and target pocket, inline editable and
  groupable by pocket or category.
* Pocket view with a per-pot breakdown and "copy plan".
* Supplies with lists, coverage and reorder point.
* Shopping list grouped by vendor.
* Subscriptions from both expenses and supplies in one place.
* Snapshot system via SQLite's online backup API.
* Automatic schema migration for existing databases.

[0.7.8]: https://github.com/Yatheria030/homestead/releases/tag/v0.7.8
[0.7.7]: https://github.com/Yatheria030/homestead/releases/tag/v0.7.7
[0.7.6]: https://github.com/Yatheria030/homestead/releases/tag/v0.7.6
[0.7.5]: https://github.com/Yatheria030/homestead/releases/tag/v0.7.5
[0.7.4]: https://github.com/Yatheria030/homestead/releases/tag/v0.7.4
[0.7.3]: https://github.com/Yatheria030/homestead/releases/tag/v0.7.3
[0.7.2]: https://github.com/Yatheria030/homestead/releases/tag/v0.7.2
[0.7.1]: https://github.com/Yatheria030/homestead/releases/tag/v0.7.1
[0.7.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.7.0
[0.6.3]: https://github.com/Yatheria030/homestead/releases/tag/v0.6.3
[0.6.2]: https://github.com/Yatheria030/homestead/releases/tag/v0.6.2
[0.6.1]: https://github.com/Yatheria030/homestead/releases/tag/v0.6.1
[0.6.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.6.0
[0.5.1]: https://github.com/Yatheria030/homestead/releases/tag/v0.5.1
[0.5.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.5.0
[0.4.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.4.0
[0.3.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.3.0
[0.2.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.2.0
[0.1.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.1.0
