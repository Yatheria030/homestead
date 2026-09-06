from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

Interval = Literal["monthly", "quarterly", "yearly"]

# Faktor, um einen Intervallbetrag auf einen Monat umzurechnen
INTERVAL_MONTHS: dict[str, float] = {"monthly": 1.0, "quarterly": 3.0, "yearly": 12.0}


def money(value: float) -> float:
    """Kaufmaennisch auf Cent runden (0,5 rundet auf, wie in Excel)."""
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Kategorien ---------------------------------------------------------

class CategoryIn(BaseModel):
    name: str
    color: str = "slate"
    sort_order: int = 0


class CategoryOut(ORMModel):
    id: int
    name: str
    color: str
    sort_order: int


# --- Pockets ------------------------------------------------------------

class PocketIn(BaseModel):
    name: str
    color: str = "indigo"
    sort_order: int = 0
    counts_to_total: bool = True
    note: str | None = None


class PocketOut(ORMModel):
    id: int
    name: str
    color: str
    sort_order: int
    counts_to_total: bool
    note: str | None = None


# --- Ausgaben -----------------------------------------------------------

class ExpenseIn(BaseModel):
    name: str
    category_id: int | None = None
    pocket_id: int | None = None
    amount_total: float = 0
    share_percent: float = 50
    interval: Interval = "monthly"
    is_subscription: bool = False
    vendor: str | None = None
    url: str | None = None
    note: str | None = None
    active: bool = True
    sort_order: int = 0


class ExpensePatch(BaseModel):
    name: str | None = None
    category_id: int | None = None
    pocket_id: int | None = None
    amount_total: float | None = None
    share_percent: float | None = None
    interval: Interval | None = None
    is_subscription: bool | None = None
    vendor: str | None = None
    url: str | None = None
    note: str | None = None
    active: bool | None = None
    sort_order: int | None = None


class ExpenseOut(ORMModel):
    id: int
    name: str
    category_id: int | None
    pocket_id: int | None
    amount_total: float
    share_percent: float
    interval: Interval
    is_subscription: bool
    vendor: str | None
    url: str | None
    note: str | None
    active: bool
    sort_order: int
    category: CategoryOut | None = None
    pocket: PocketOut | None = None

    @computed_field
    @property
    def share_amount(self) -> float:
        """Eigener Anteil am Gesamtbetrag (Excel-Spalte 'Dein 50 %')."""
        return money(self.raw_share_amount)

    @computed_field
    @property
    def monthly_total(self) -> float:
        return money(self.raw_monthly_total)

    @computed_field
    @property
    def monthly_share(self) -> float:
        return money(self.raw_monthly_share)

    @property
    def raw_share_amount(self) -> float:
        """Ungerundet - fuer Summen, damit halbe Cent sich nicht aufaddieren."""
        return self.amount_total * self.share_percent / 100

    @property
    def raw_monthly_share(self) -> float:
        return self.raw_share_amount / INTERVAL_MONTHS[self.interval]

    @property
    def raw_monthly_total(self) -> float:
        return self.amount_total / INTERVAL_MONTHS[self.interval]


# --- Vorrat -------------------------------------------------------------

DAYS_PER_MONTH = 365 / 12


class SupplyListIn(BaseModel):
    name: str
    color: str = "indigo"
    icon: str | None = None
    sort_order: int = 0


class SupplyListOut(ORMModel):
    id: int
    name: str
    color: str
    icon: str | None
    sort_order: int


class SupplyIn(BaseModel):
    name: str
    list_id: int | None = None
    location: str | None = None
    pack_size: str | None = None
    units_per_pack: float | None = None
    unit: str | None = None
    days_per_pack: int | None = None
    stock_packs: float = 0
    stock_as_of: date | None = None
    buffer_days: int = 14
    target_cover_days: int = 60
    price: float | None = None
    regular_price: float | None = None
    is_subscription: bool = False
    vendor: str | None = None
    subscription_interval_days: int | None = None
    subscription_packs: float = 1
    next_delivery: date | None = None
    last_purchased: date | None = None
    url: str | None = None
    note: str | None = None
    active: bool = True
    sort_order: int = 0


class SupplyPatch(BaseModel):
    name: str | None = None
    list_id: int | None = None
    location: str | None = None
    pack_size: str | None = None
    units_per_pack: float | None = None
    unit: str | None = None
    days_per_pack: int | None = None
    stock_packs: float | None = None
    stock_as_of: date | None = None
    buffer_days: int | None = None
    target_cover_days: int | None = None
    price: float | None = None
    regular_price: float | None = None
    is_subscription: bool | None = None
    vendor: str | None = None
    subscription_interval_days: int | None = None
    subscription_packs: float | None = None
    next_delivery: date | None = None
    last_purchased: date | None = None
    url: str | None = None
    note: str | None = None
    active: bool | None = None
    sort_order: int | None = None


SupplyStatus = Literal["unknown", "empty", "order", "soon", "ok"]


class SupplyOut(ORMModel):
    id: int
    name: str
    list_id: int | None
    location: str | None
    pack_size: str | None
    units_per_pack: float | None
    unit: str | None
    days_per_pack: int | None
    stock_packs: float
    stock_as_of: date | None
    buffer_days: int
    target_cover_days: int
    price: float | None
    regular_price: float | None
    is_subscription: bool
    vendor: str | None
    subscription_interval_days: int | None
    subscription_packs: float
    next_delivery: date | None
    last_purchased: date | None
    url: str | None
    note: str | None
    active: bool
    sort_order: int
    supply_list: SupplyListOut | None = None

    # --- abgeleitete Werte ---

    @property
    def raw_stock(self) -> float:
        """Bestand von heute: Stichtagsbestand minus geschaetztem Verbrauch seither."""
        if self.stock_as_of is None or not self.days_per_pack:
            return self.stock_packs
        elapsed = (date.today() - self.stock_as_of).days
        return max(0.0, self.stock_packs - elapsed / self.days_per_pack)

    @computed_field
    @property
    def stock_now(self) -> float:
        return round(self.raw_stock, 2)

    @computed_field
    @property
    def days_left(self) -> int | None:
        """Reichweite in Tagen."""
        if not self.days_per_pack:
            return None
        return int(self.raw_stock * self.days_per_pack)

    @computed_field
    @property
    def runs_out_on(self) -> date | None:
        from datetime import timedelta

        days = self.days_left
        return None if days is None else date.today() + timedelta(days=days)

    @computed_field
    @property
    def reorder_on(self) -> date | None:
        """Ab wann bestellt werden sollte, damit der Puffer nicht angebrochen wird."""
        from datetime import timedelta

        out = self.runs_out_on
        return None if out is None else out - timedelta(days=self.buffer_days)

    @computed_field
    @property
    def status(self) -> SupplyStatus:
        days = self.days_left
        if days is None:
            return "unknown"
        if days <= 0:
            return "empty"
        if days <= self.buffer_days:
            return "order"
        if days <= self.buffer_days * 2:
            return "soon"
        return "ok"

    @computed_field
    @property
    def suggested_packs(self) -> int:
        """Packungen, die es braucht, um die Zielreichweite wieder zu erreichen."""
        import math

        if not self.days_per_pack:
            return 0
        missing_days = self.target_cover_days - (self.days_left or 0)
        if missing_days <= 0:
            return 0
        return max(1, math.ceil(missing_days / self.days_per_pack))

    @computed_field
    @property
    def price_per_unit(self) -> float | None:
        if self.price is None or not self.units_per_pack:
            return None
        return round(self.price / self.units_per_pack, 4)

    @computed_field
    @property
    def monthly_cost(self) -> float | None:
        """Was der Artikel im Schnitt pro Monat kostet - ueber den Verbrauch gerechnet."""
        if self.price is None or not self.days_per_pack:
            return None
        return money(self.price / self.days_per_pack * DAYS_PER_MONTH)

    @computed_field
    @property
    def yearly_cost(self) -> float | None:
        if self.price is None or not self.days_per_pack:
            return None
        return money(self.price / self.days_per_pack * 365)

    @computed_field
    @property
    def yearly_savings(self) -> float | None:
        """Ersparnis pro Jahr gegenueber dem Normalpreis (z. B. durch Spar-Abo)."""
        if (
            self.price is None
            or self.regular_price is None
            or not self.days_per_pack
            or self.regular_price <= self.price
        ):
            return None
        return money((self.regular_price - self.price) / self.days_per_pack * 365)

    @computed_field
    @property
    def subscription_monthly(self) -> float | None:
        """Was das Abo pro Monat abbucht."""
        if not self.is_subscription or self.price is None or not self.subscription_interval_days:
            return None
        return money(
            self.price * self.subscription_packs / self.subscription_interval_days
            * DAYS_PER_MONTH
        )

    @computed_field
    @property
    def subscription_coverage(self) -> float | None:
        """1.0 = das Abo liefert genau so viel, wie verbraucht wird."""
        if (
            not self.is_subscription
            or not self.subscription_interval_days
            or not self.days_per_pack
        ):
            return None
        delivered_per_day = self.subscription_packs / self.subscription_interval_days
        used_per_day = 1 / self.days_per_pack
        return round(delivered_per_day / used_per_day, 2)


class RestockIn(BaseModel):
    """Kauf verbuchen: Packungen wandern in den Bestand."""

    packs: float = 1
    price: float | None = None
    purchased_on: date | None = None
    note: str | None = None


class StockIn(BaseModel):
    """Bestand korrigieren - ab heute rechnet die App wieder selbst weiter."""

    stock_packs: float
    as_of: date | None = None


class PurchaseIn(BaseModel):
    purchased_on: date | None = None
    note: str | None = None


class PurchaseOut(ORMModel):
    id: int
    supply_id: int
    purchased_on: date
    packs: float
    price: float | None
    note: str | None


class ShoppingItem(BaseModel):
    supply_id: int
    name: str
    vendor: str | None
    list_name: str | None
    color: str
    status: SupplyStatus
    days_left: int | None
    packs: int
    pack_label: str | None
    price: float | None
    total: float | None
    is_subscription: bool
    url: str | None


class ShoppingGroup(BaseModel):
    vendor: str
    items: list[ShoppingItem]
    total: float


# --- Auswertung ---------------------------------------------------------

class PocketSummary(BaseModel):
    pocket_id: int | None
    name: str
    color: str
    counts_to_total: bool
    amount: float
    items: list[str] = Field(default_factory=list)


class CategorySummary(BaseModel):
    name: str
    color: str
    amount: float


class Summary(BaseModel):
    total_transferred: float
    total_household: float
    excluded: float
    pockets: list[PocketSummary]
    categories: list[CategorySummary]
    expense_count: int
    subscription_count: int
    subscription_monthly: float
    supplies_total: int
    supplies_order: int
    supplies_empty: int
    supplies_soon: int
    supplies_monthly: float
    subscription_savings_yearly: float


# --- Backup -------------------------------------------------------------

class BackupInfo(BaseModel):
    name: str
    kind: str
    kind_label: str
    size: int
    created_at: str
    note: str | None = None


class BackupNote(BaseModel):
    note: str | None = None


class RestoreResult(BaseModel):
    restored: str
    safety_snapshot: str
