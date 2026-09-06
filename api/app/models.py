from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Category(Base):
    """Kategorie einer Ausgabe (Wohnen, KFZ, Taeglicher Bedarf, ...)."""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    color: Mapped[str] = mapped_column(String(20), default="slate")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    expenses: Mapped[list["Expense"]] = relationship(back_populates="category")


class Pocket(Base):
    """Zieltopf, auf den ueberwiesen wird."""

    __tablename__ = "pockets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    color: Mapped[str] = mapped_column(String(20), default="indigo")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    # Manche Posten laufen direkt zwischen den Beteiligten, nicht ueber einen Topf
    counts_to_total: Mapped[bool] = mapped_column(Boolean, default=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    expenses: Mapped[list["Expense"]] = relationship(back_populates="pocket")


class Expense(Base):
    """Eine Kostenposition mit Gesamtbetrag und dem eigenen Anteil daran."""

    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    pocket_id: Mapped[int | None] = mapped_column(
        ForeignKey("pockets.id", ondelete="SET NULL"), nullable=True
    )
    amount_total: Mapped[float] = mapped_column(Numeric(12, 2, asdecimal=False), default=0)
    share_percent: Mapped[float] = mapped_column(Numeric(5, 2, asdecimal=False), default=50)
    # monthly | quarterly | yearly
    interval: Mapped[str] = mapped_column(String(20), default="monthly")
    is_subscription: Mapped[bool] = mapped_column(Boolean, default=False)
    vendor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    category: Mapped[Category | None] = relationship(back_populates="expenses")
    pocket: Mapped[Pocket | None] = relationship(back_populates="expenses")


class SupplyList(Base):
    """Liste im Vorrat - wie eine Liste in der Erinnerungen-App (Katze, Bad, Küche)."""

    __tablename__ = "supply_lists"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    color: Mapped[str] = mapped_column(String(20), default="indigo")
    icon: Mapped[str | None] = mapped_column(String(16), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    supplies: Mapped[list["Supply"]] = relationship(back_populates="supply_list")


class Supply(Base):
    """Verbrauchsartikel: wie lange eine Packung hält, wie viel noch da ist,
    wann nachbestellt werden muss und was im Abo läuft."""

    __tablename__ = "supplies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    list_id: Mapped[int | None] = mapped_column(
        ForeignKey("supply_lists.id", ondelete="SET NULL"), nullable=True
    )
    location: Mapped[str | None] = mapped_column(String(80), nullable=True)

    # Packung
    pack_size: Mapped[str | None] = mapped_column(String(80), nullable=True)
    units_per_pack: Mapped[float | None] = mapped_column(
        Numeric(12, 3, asdecimal=False), nullable=True
    )
    unit: Mapped[str | None] = mapped_column(String(24), nullable=True)

    # Verbrauch und Bestand
    days_per_pack: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stock_packs: Mapped[float] = mapped_column(Numeric(10, 2, asdecimal=False), default=0)
    # Stichtag des Bestands - ab hier rechnet die App den Verbrauch selbst runter
    stock_as_of: Mapped[date | None] = mapped_column(Date, nullable=True)
    buffer_days: Mapped[int] = mapped_column(Integer, default=14)
    target_cover_days: Mapped[int] = mapped_column(Integer, default=60)

    # Preise
    price: Mapped[float | None] = mapped_column(Numeric(12, 2, asdecimal=False), nullable=True)
    regular_price: Mapped[float | None] = mapped_column(
        Numeric(12, 2, asdecimal=False), nullable=True
    )

    # Abo
    is_subscription: Mapped[bool] = mapped_column(Boolean, default=False)
    vendor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    subscription_interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    subscription_packs: Mapped[float] = mapped_column(
        Numeric(10, 2, asdecimal=False), default=1
    )
    next_delivery: Mapped[date | None] = mapped_column(Date, nullable=True)

    last_purchased: Mapped[date | None] = mapped_column(Date, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    supply_list: Mapped[SupplyList | None] = relationship(back_populates="supplies")
    purchases: Mapped[list["Purchase"]] = relationship(
        back_populates="supply", cascade="all, delete-orphan"
    )


class Purchase(Base):
    """Kaufhistorie eines Artikels - fuellt sich ueber den 'Gekauft'-Button."""

    __tablename__ = "purchases"

    id: Mapped[int] = mapped_column(primary_key=True)
    supply_id: Mapped[int] = mapped_column(
        ForeignKey("supplies.id", ondelete="CASCADE")
    )
    purchased_on: Mapped[date] = mapped_column(Date)
    packs: Mapped[float] = mapped_column(Numeric(10, 2, asdecimal=False), default=1)
    price: Mapped[float | None] = mapped_column(Numeric(12, 2, asdecimal=False), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    supply: Mapped[Supply] = relationship(back_populates="purchases")
