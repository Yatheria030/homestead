"""Startdaten: die Positionen aus der bisherigen Excel + Beispiel-Vorrat.

Laeuft nur, wenn die Tabellen noch leer sind - vorhandene Daten bleiben unangetastet.
"""
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Category, Expense, Pocket, Supply, SupplyList

CATEGORIES = [
    ("Wohnen", "violet", 10),
    ("Versicherungen", "sky", 20),
    ("KFZ", "cyan", 30),
    ("Einkauf", "fuchsia", 40),
    ("Täglicher Bedarf", "emerald", 50),
    ("Sparen", "teal", 60),
]

POCKETS = [
    ("Mietkosten", "indigo", 10, True, None),
    ("Strom + Gas", "amber", 20, True, None),
    ("KFZ-Versicherung", "sky", 30, True, None),
    ("Wohnen", "violet", 40, True, None),
    ("Urlaub", "teal", 50, True, None),
    ("Gemeinschaft", "emerald", 60, True, "Gemeinschaftskonto"),
    ("Direkt untereinander", "rose", 70, False,
     "Läuft nicht über die Pockets und zählt nicht in die Gesamtsumme."),
]

# Beispielhafte Startdaten - runde Fantasiezahlen, bitte durch die eigenen ersetzen.
# (Kategorie, Position, Gesamtbetrag, Pocket, Abo?, Anbieter)
EXPENSES = [
    ("Wohnen", "Kaltmiete", 950.00, "Mietkosten", False, None),
    ("Wohnen", "Nebenkosten", 180.00, "Mietkosten", False, None),
    ("Wohnen", "Gas", 60.00, "Strom + Gas", False, None),
    ("Wohnen", "Strom", 120.00, "Strom + Gas", False, None),
    ("Wohnen", "Internet", 49.99, "Gemeinschaft", True, None),
    ("Wohnen", "Rundfunkbeitrag", 18.36, "Wohnen", False, None),
    ("Versicherungen", "Privathaftpflicht", 6.50, "Direkt untereinander", False, None),
    ("Versicherungen", "Hausrat", 8.00, "Gemeinschaft", False, None),
    ("KFZ", "Kfz-Versicherung", 95.00, "KFZ-Versicherung", False, None),
    ("KFZ", "Konnektivität", 9.99, "Wohnen", True, None),
    ("Einkauf", "Prime-Mitgliedschaft", 8.99, "Wohnen", True, "Amazon"),
    ("Täglicher Bedarf", "Lebensmittel & Drogerie", 500.00, "Gemeinschaft", False, None),
    ("Täglicher Bedarf", "Haushalt & Wohnen", 60.00, "Wohnen", False, None),
    ("Täglicher Bedarf", "Restaurant & Lifestyle", 150.00, "Gemeinschaft", False, None),
    ("Täglicher Bedarf", "Lieferdienst", 8.99, "Gemeinschaft", True, None),
    ("Sparen", "Urlaubsrücklage", 300.00, "Urlaub", False, None),
]

# Listen im Vorrat - wie Listen in der Erinnerungen-App
SUPPLY_LISTS = [
    ("Katze", "amber", "🐾", 10),
    ("Bad", "sky", "🧼", 20),
    ("Küche", "emerald", "🍳", 30),
    ("Reinigung", "violet", "🧽", 40),
    ("Technik", "cyan", "🔌", 50),
]

# Startvorrat als Beispiel - Preise und Rhythmen bitte an die Realität anpassen.
# (Name, Liste, Ort, Packung, Einheiten, Einheit, Tage pro Packung, Kaufmenge, Bestand,
#  Vorlauf, Abo-Preis, Normalpreis, Abo?, Anbieter, Liefer-Intervall, Menge je Lieferung)
SUPPLIES = [
    ("Katzenstreu", "Katze", "Abstellraum", "2x 10 l", 20, "l", 21, 2, 2.0, 10,
     17.99, 19.99, True, "Amazon Spar-Abo", 30, 1),
    ("Trockenfutter", "Katze", "Küche", "3 kg", 3, "kg", 30, 1, 1.5, 10,
     24.99, 28.99, True, "Amazon Spar-Abo", 30, 1),
    ("Nassfutter", "Katze", "Vorratsschrank", "24x 85 g", 24, "Dosen", 12, 3, 2.0, 7,
     18.49, 21.99, True, "Amazon Spar-Abo", 14, 2),
    ("Petkit Filter", "Katze", "Technikschublade", "4er-Pack", 4, "Stück", 60, 1, 1.0, 14,
     14.99, 16.99, True, "Amazon Spar-Abo", 60, 1),
    ("Wasserbrunnen Filter", "Katze", "Technikschublade", "6er-Pack", 6, "Stück", 90, 1, 0.5, 14,
     12.99, None, False, "Amazon", None, 1),
    ("Katzenstreu-Beutel", "Katze", "Abstellraum", "50 Stück", 50, "Stück", 50, 1, 1.0, 14,
     6.99, None, False, "dm", None, 1),
    ("Zahnpasta", "Bad", "Bad", "2x 75 ml", 150, "ml", 60, 1, 1.0, 14,
     5.49, 6.45, True, "Amazon Spar-Abo", 60, 1),
    ("Handseife Nachfüllung", "Bad", "Bad", "1 l", 1, "l", 90, 1, 1.0, 14,
     3.95, None, False, "dm", None, 1),
    ("Duschgel", "Bad", "Bad", "2x 250 ml", 500, "ml", 45, 2, 1.0, 14,
     4.20, None, False, "dm", None, 1),
    ("Toilettenpapier", "Bad", "Abstellraum", "16 Rollen", 16, "Rollen", 40, 2, 1.0, 10,
     14.99, 16.99, True, "Amazon Spar-Abo", 45, 1),
    ("Rasierklingen", "Bad", "Bad", "8 Stück", 8, "Stück", 120, 1, 0.5, 21,
     24.99, 29.99, True, "Amazon Spar-Abo", 120, 1),
    ("WC-Steine", "Reinigung", "Bad", "3er-Pack", 3, "Stück", 45, 2, 1.0, 14,
     8.99, 9.99, True, "Amazon Spar-Abo", 45, 1),
    ("Spülmaschinentabs", "Reinigung", "Küche", "60 Stück", 60, "Stück", 60, 1, 1.0, 14,
     12.99, 15.99, True, "Amazon Spar-Abo", 60, 1),
    ("Waschmittel", "Reinigung", "Hauswirtschaft", "2,5 l", 2.5, "l", 75, 1, 1.0, 14,
     9.95, None, False, "dm", None, 1),
    ("Spülschwämme", "Reinigung", "Küche", "10 Stück", 10, "Stück", 60, 1, 1.0, 14,
     5.49, None, False, "Amazon", None, 1),
    ("Küchenrolle", "Küche", "Küche", "8 Rollen", 8, "Rollen", 30, 2, 1.0, 7,
     6.49, None, False, "Rossmann", None, 1),
    ("Müllbeutel 60 l", "Küche", "Küche", "50 Stück", 50, "Stück", 90, 1, 1.0, 14,
     7.99, None, False, "Amazon", None, 1),
]


def seed(db: Session) -> bool:
    """Legt die Startdaten an. Gibt zurück, ob etwas geschrieben wurde."""
    if db.scalar(select(func.count()).select_from(Expense)):
        return False

    categories = {
        name: Category(name=name, color=color, sort_order=order)
        for name, color, order in CATEGORIES
    }
    pockets = {
        name: Pocket(name=name, color=color, sort_order=order,
                     counts_to_total=counts, note=note)
        for name, color, order, counts, note in POCKETS
    }
    lists = {
        name: SupplyList(name=name, color=color, icon=icon, sort_order=order)
        for name, color, icon, order in SUPPLY_LISTS
    }
    db.add_all([*categories.values(), *pockets.values(), *lists.values()])
    db.flush()

    for index, (category, name, total, pocket, is_sub, vendor) in enumerate(EXPENSES):
        db.add(
            Expense(
                name=name,
                category_id=categories[category].id,
                pocket_id=pockets[pocket].id,
                amount_total=total,
                share_percent=50,
                interval="monthly",
                is_subscription=is_sub,
                vendor=vendor,
                sort_order=(index + 1) * 10,
            )
        )

    today = date.today()
    for index, row in enumerate(SUPPLIES):
        (name, list_name, location, pack, units, unit, days, buy, stock, buffer_days,
         price, regular, is_sub, vendor, sub_days, sub_packs) = row
        db.add(
            Supply(
                name=name,
                list_id=lists[list_name].id,
                location=location,
                pack_size=pack,
                units_per_pack=units,
                unit=unit,
                days_per_pack=days,
                packs_per_purchase=buy,
                stock_packs=stock,
                # Bestand um ein paar Tage versetzen, damit die Reichweiten variieren
                stock_as_of=today - timedelta(days=(index * 7) % 25),
                buffer_days=buffer_days,
                target_cover_days=days * buy,
                price=price,
                regular_price=regular,
                is_subscription=is_sub,
                vendor=vendor,
                subscription_interval_days=sub_days,
                subscription_packs=sub_packs,
                next_delivery=(today + timedelta(days=sub_days % 30)) if is_sub else None,
                last_purchased=today - timedelta(days=(index * 7) % 25),
                sort_order=(index + 1) * 10,
            )
        )

    db.commit()
    return True
