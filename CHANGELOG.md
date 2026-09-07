# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning
follows [Semantic Versioning](https://semver.org/).

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

[0.6.2]: https://github.com/Yatheria030/homestead/releases/tag/v0.6.2
[0.6.1]: https://github.com/Yatheria030/homestead/releases/tag/v0.6.1
[0.6.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.6.0
[0.5.1]: https://github.com/Yatheria030/homestead/releases/tag/v0.5.1
[0.5.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.5.0
[0.4.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.4.0
[0.3.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.3.0
[0.2.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.2.0
[0.1.0]: https://github.com/Yatheria030/homestead/releases/tag/v0.1.0
