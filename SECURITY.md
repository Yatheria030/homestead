# Security

## There is no authentication

That's deliberate: Homestead is meant as a tool for your own household on your own
network. Anyone who can reach the address can read and change everything — and the data
is financial data.

**Do not expose it to the internet unprotected.** Sensible ways to run it:

* reachable only on your LAN (the default, as long as you don't forward the port),
* through a VPN into your network (WireGuard, Tailscale),
* behind a reverse proxy that handles authentication (Caddy with basic auth, Authelia,
  oauth2-proxy).

Also worth knowing: the backup endpoints can download and overwrite the entire database.
They deserve the same consideration as the rest of the app.

## The scanner endpoint

`POST /api/scan-events` is the one place where a device writes from outside the browser —
a scanner station by the pantry, say. Set `SCAN_TOKEN` and the station has to send it as
`Authorization: Bearer <token>`; leave it empty and the endpoint is as open as the rest of
the app. If anything reaches this endpoint from beyond your LAN, set the token.

Two optional steps send data out of the house, and both can be turned off — in
**Settings → Scanner & KI**, or via `PRODUCT_LOOKUP` and `ANTHROPIC_API_KEY`. Neither step
ever sees your expenses, pockets, or purchase history — only the barcode and, for the
matching step, the names of your supply items.

## The stored API key

The Anthropic API key and the scan token can be set in the settings page, which stores
them in the database. They are **write-only over the API**: a saved secret is never
returned, only whether one is set and its last four characters.

That protects the value in transit, not against someone who is already inside. Since there
is no authentication, anyone who can reach the app can replace the key and run requests at
your expense — and anyone with the database file or a backup snapshot can read it, because
it is stored in plain text (it has to be usable). Two consequences: keep the app off the
open internet as described above, and treat `./data/backups/*.db` as secret material once
a key is stored. Setting the values through the environment instead keeps them out of the
database entirely; environment values take precedence and are locked in the UI.

## Reporting a vulnerability

Please report security issues through a private GitHub security advisory rather than a
public issue.
