"""Schema-Nachzug fuer bestehende Datenbanken.

SQLAlchemys create_all legt nur fehlende Tabellen an, keine neuen Spalten.
Hier werden fehlende Spalten ergaenzt und Altdaten uebernommen - so bleibt eine
bereits gepflegte haushalt.db erhalten.
"""
from __future__ import annotations

from sqlalchemy import Engine, text

# Tabelle -> Spalte -> SQL-Typ inkl. Default
NEW_COLUMNS: dict[str, dict[str, str]] = {
    "supplies": {
        "list_id": "INTEGER",
        "units_per_pack": "NUMERIC",
        "unit": "VARCHAR(24)",
        "days_per_pack": "INTEGER",
        "stock_packs": "NUMERIC DEFAULT 0",
        "stock_as_of": "DATE",
        "buffer_days": "INTEGER DEFAULT 14",
        "target_cover_days": "INTEGER DEFAULT 60",
        "regular_price": "NUMERIC",
        "subscription_packs": "NUMERIC DEFAULT 1",
        "next_delivery": "DATE",
    },
    "purchases": {
        "packs": "NUMERIC DEFAULT 1",
        "price": "NUMERIC",
    },
}


def _columns(connection, table: str) -> set[str]:
    rows = connection.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def migrate(engine: Engine) -> list[str]:
    """Ergaenzt fehlende Spalten und uebernimmt Altdaten. Gibt die Schritte zurueck."""
    done: list[str] = []
    with engine.begin() as connection:
        existing_tables = {
            row[0]
            for row in connection.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            )
        }

        for table, columns in NEW_COLUMNS.items():
            if table not in existing_tables:
                continue
            present = _columns(connection, table)
            for column, ddl in columns.items():
                if column not in present:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                    done.append(f"{table}.{column}")

        if "supplies" not in existing_tables:
            return done

        columns = _columns(connection, "supplies")

        # "alle X Tage nachkaufen" war die Haltbarkeit einer Packung
        if "interval_days" in columns:
            connection.execute(
                text(
                    "UPDATE supplies SET days_per_pack = interval_days "
                    "WHERE days_per_pack IS NULL AND interval_days IS NOT NULL"
                )
            )

        # Freitext-Kategorien werden zu Listen
        if "category" in columns:
            names = [
                row[0]
                for row in connection.execute(
                    text(
                        "SELECT DISTINCT category FROM supplies "
                        "WHERE category IS NOT NULL AND category <> '' AND list_id IS NULL"
                    )
                )
            ]
            palette = ["indigo", "violet", "emerald", "amber", "sky", "rose", "teal", "cyan"]
            for index, name in enumerate(names):
                existing = connection.execute(
                    text("SELECT id FROM supply_lists WHERE name = :name"), {"name": name}
                ).scalar()
                if existing is None:
                    existing = connection.execute(
                        text(
                            "INSERT INTO supply_lists (name, color, sort_order) "
                            "VALUES (:name, :color, :sort) RETURNING id"
                        ),
                        {
                            "name": name,
                            "color": palette[index % len(palette)],
                            "sort": (index + 1) * 10,
                        },
                    ).scalar()
                connection.execute(
                    text("UPDATE supplies SET list_id = :list WHERE category = :name"),
                    {"list": existing, "name": name},
                )
                done.append(f"Liste '{name}'")

        # Bestand schaetzen: ein Kauf = eine Packung, ab Kaufdatum
        connection.execute(
            text(
                "UPDATE supplies SET stock_packs = 1, stock_as_of = last_purchased "
                "WHERE stock_as_of IS NULL AND last_purchased IS NOT NULL"
            )
        )
    return done
