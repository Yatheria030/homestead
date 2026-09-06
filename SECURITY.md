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

## Reporting a vulnerability

Please report security issues through a private GitHub security advisory rather than a
public issue.
