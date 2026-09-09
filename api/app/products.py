"""Produktdaten zu einer EAN aus den offenen Facts-Datenbanken.

Vier Schwesterprojekte mit identischer API decken zusammen Lebensmittel,
Haushalt, Drogerie und Tiernahrung ab. Gefragt wird der Reihe nach, der erste
Treffer gewinnt. Kein Key, kein Konto - aber die EAN verlaesst das Haus, deshalb
laesst sich der Schritt per PRODUCT_LOOKUP=false ganz abschalten.

Die Antworten sind von Freiwilligen gepflegt und entsprechend uneinheitlich:
`quantity` ist Freitext ("500 g", "2 x 2,5kg"), Namen mal mit, mal ohne Marke.
Hier wird nichts geradegebogen - das ist Aufgabe des KI-Schritts in ai.py.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

# Reihenfolge = Trefferwahrscheinlichkeit fuer einen Haushalt
DATABASES = [
    ("world.openfoodfacts.org", "Lebensmittel"),
    ("world.openproductsfacts.org", "Haushalt"),
    ("world.openbeautyfacts.org", "Drogerie"),
    ("world.openpetfoodfacts.org", "Tiernahrung"),
]

FIELDS = "product_name,product_name_de,brands,quantity,product_quantity,product_quantity_unit,categories"
TIMEOUT = 6.0
# Open Food Facts bittet ausdruecklich um einen sprechenden User-Agent
USER_AGENT = "Homestead/1.0 (self-hosted household inventory)"


def enabled() -> bool:
    return os.getenv("PRODUCT_LOOKUP", "true").lower() in {"1", "true", "yes"}


def _fetch(url: str) -> dict | None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, ValueError, TimeoutError):
        return None


def lookup(ean: str) -> dict | None:
    """Erster Treffer aus den vier Datenbanken, oder None."""
    if not enabled():
        return None

    for host, label in DATABASES:
        data = _fetch(f"https://{host}/api/v2/product/{ean}.json?fields={FIELDS}")
        if not data or data.get("status") != 1:
            continue
        product = data.get("product") or {}
        name = product.get("product_name_de") or product.get("product_name") or ""
        if not name.strip():
            continue  # Eintrag existiert, ist aber leer - naechste Datenbank versuchen
        return {
            "name": name.strip(),
            "brand": (product.get("brands") or "").split(",")[0].strip() or None,
            "quantity": (product.get("quantity") or "").strip() or None,
            "categories": (product.get("categories") or "").strip() or None,
            "database": label,
            "url": f"https://{host}/product/{ean}",
        }
    return None
