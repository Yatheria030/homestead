# Sicherheit

## Die App bringt keine Anmeldung mit

Das ist Absicht: Sie ist als Werkzeug für den eigenen Haushalt im eigenen Netz gedacht.
Wer die Adresse erreicht, sieht und ändert alle Daten – und die Daten sind Finanzdaten.

**Nicht ungeschützt ins Internet stellen.** Sinnvolle Betriebsarten:

* nur im Heimnetz erreichbar (Standard, wenn der Port nicht weitergeleitet wird),
* über einen VPN-Zugang ins Heimnetz (WireGuard, Tailscale),
* hinter einem Reverse Proxy mit Authentifizierung (Caddy mit Basic Auth,
  Authelia, oauth2-proxy).

Ebenfalls bedenken: Die Backup-Endpunkte können die gesamte Datenbank herunterladen und
überschreiben. Sie unterliegen denselben Überlegungen wie der Rest der Anwendung.

## Lücken melden

Wer ein Sicherheitsproblem findet: bitte per privatem Security Advisory über GitHub
melden statt über ein öffentliches Issue.
