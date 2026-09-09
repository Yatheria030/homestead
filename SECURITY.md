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

Two optional steps send data out of the house, and both can be turned off:
`PRODUCT_LOOKUP=false` stops unknown EANs from being looked up in the open Facts
databases, and leaving `ANTHROPIC_API_KEY` unset stops product names from being sent to
the Claude API. Neither step ever sees your expenses, pockets, or purchase history — only
the barcode and, for the matching step, the names of your supply items.

## Reporting a vulnerability

Please report security issues through a private GitHub security advisory rather than a
public issue.
