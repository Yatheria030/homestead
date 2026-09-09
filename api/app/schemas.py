from __future__ import annotations

from datetime import date, datetime
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
# So lange bleibt ein geloeschter Artikel im Papierkorb, bevor er automatisch
# endgueltig entfernt wird.
TRASH_RETENTION_DAYS = 30


class SupplyListIn(BaseModel):
    name: str
    color: str = "indigo"
    icon: str | None = None
    sort_order: int = 0


class SupplyListPatch(BaseModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None
    sort_order: int | None = None


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
    packs_per_purchase: float = 1
    stock_packs: float = 0
    stock_as_of: date | None = None
    buffer_days: int = 14
    target_cover_days: int = 60
    target_stock: float | None = None
    recheck_days: int | None = None
    next_check: date | None = None
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
    packs_per_purchase: float | None = None
    stock_packs: float | None = None
    stock_as_of: date | None = None
    buffer_days: int | None = None
    target_cover_days: int | None = None
    target_stock: float | None = None
    recheck_days: int | None = None
    next_check: date | None = None
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


SupplyStatus = Literal["unknown", "empty", "order", "check", "soon", "ok"]


class SupplyOut(ORMModel):
    id: int
    name: str
    list_id: int | None
    location: str | None
    pack_size: str | None
    units_per_pack: float | None
    unit: str | None
    days_per_pack: int | None
    packs_per_purchase: float
    stock_packs: float
    stock_as_of: date | None
    buffer_days: int
    target_cover_days: int
    target_stock: float | None = None
    recheck_days: int | None = None
    next_check: date | None = None
    measured_days_per_pack: float | None = None
    reorder_since: date | None = None
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
    deleted_at: datetime | None = None
    supply_list: SupplyListOut | None = None

    # Aus der Kaufhistorie vorberechnet (vom Router gesetzt, bevor validiert wird) -
    # siehe routers/supplies.py::_purchase_stats
    purchase_count: int = 0
    avg_purchase_packs: float | None = None
    derived_days_per_pack: float | None = None

    # --- abgeleitete Werte ---

    @computed_field
    @property
    def pack_label(self) -> str | None:
        """Anzeige-Label der Packung: die eingetragene Bezeichnung, sonst aus
        Menge + Einheit gebildet - 'Packung' und 'Inhalt' müssen nicht doppelt
        gepflegt werden, nur wenn eine eigene Beschriftung (z. B. '2x 250 ml')
        mehr sagt als die reine Zahl."""
        if self.pack_size:
            return self.pack_size
        if self.units_per_pack and self.unit:
            trimmed = f"{self.units_per_pack:g}"
            return f"{trimmed} {self.unit}"
        return None

    @computed_field
    @property
    def is_trashed(self) -> bool:
        return self.deleted_at is not None

    @computed_field
    @property
    def purge_on(self) -> date | None:
        """Ab wann ein Papierkorb-Eintrag automatisch endgültig gelöscht wird."""
        from datetime import timedelta

        if self.deleted_at is None:
            return None
        return self.deleted_at.date() + timedelta(days=TRASH_RETENTION_DAYS)

    @computed_field
    @property
    def rhythm_source(self) -> Literal["history", "counted", "manual", "unknown"]:
        """Woher die Haltbarkeit kommt: aus der Kaufhistorie, aus zwei Nachzählungen,
        von Hand geschätzt, oder gar nicht bekannt."""
        if self.purchase_count >= 2 and self.derived_days_per_pack:
            return "history"
        if self.measured_days_per_pack:
            return "counted"
        if self.days_per_pack:
            return "manual"
        return "unknown"

    @computed_field
    @property
    def effective_days_per_pack(self) -> float | None:
        """Beste bekannte Haltbarkeit: gemessen aus der Kaufhistorie, sonst aus zwei
        Nachzählungen, sonst die von Hand eingetragene grobe Schätzung."""
        if self.purchase_count >= 2 and self.derived_days_per_pack:
            return self.derived_days_per_pack
        if self.measured_days_per_pack:
            return self.measured_days_per_pack
        return self.days_per_pack

    @computed_field
    @property
    def effective_packs_per_purchase(self) -> float:
        """Übliche Kaufmenge: Ø aus der Historie, sonst die eingetragene Schätzung."""
        if self.purchase_count >= 1 and self.avg_purchase_packs:
            return self.avg_purchase_packs
        return self.packs_per_purchase or 1

    @property
    def raw_stock(self) -> float:
        """Bestand von heute: Stichtagsbestand minus geschaetztem Verbrauch seither."""
        rate = self.effective_days_per_pack
        if self.stock_as_of is None or not rate:
            return self.stock_packs
        elapsed = (date.today() - self.stock_as_of).days
        return max(0.0, self.stock_packs - elapsed / rate)

    @computed_field
    @property
    def stock_now(self) -> float:
        return round(self.raw_stock, 2)

    @computed_field
    @property
    def days_left(self) -> int | None:
        """Reichweite in Tagen."""
        rate = self.effective_days_per_pack
        if not rate:
            return None
        return int(self.raw_stock * rate)

    @computed_field
    @property
    def purchase_interval_days(self) -> int | None:
        """Kaufrhythmus: Haltbarkeit einer Packung mal Kaufmenge."""
        rate = self.effective_days_per_pack
        if not rate:
            return None
        return max(1, round(rate * self.effective_packs_per_purchase))

    @computed_field
    @property
    def days_until_purchase(self) -> int | None:
        """Tage bis zum nächsten Einkauf - der Vorlauf ist schon abgezogen."""
        if self.days_left is None:
            return None
        return self.days_left - self.buffer_days

    @computed_field
    @property
    def runs_out_on(self) -> date | None:
        from datetime import timedelta

        days = self.days_left
        return None if days is None else date.today() + timedelta(days=days)

    @computed_field
    @property
    def buy_on(self) -> date | None:
        """Tag, an dem gekauft werden sollte - Vorlauf vor dem Leerstand."""
        from datetime import timedelta

        out = self.runs_out_on
        return None if out is None else out - timedelta(days=self.buffer_days)

    @computed_field
    @property
    def check_due(self) -> bool:
        """Der Nachzähl-Termin ist erreicht - die App fragt jetzt, wie viel noch da ist."""
        return self.next_check is not None and date.today() >= self.next_check

    @computed_field
    @property
    def suggested_recheck_days(self) -> int | None:
        """Vorschlag fürs Frage-Intervall: so lange warten, bis der Bestand auf die
        doppelte Vorlaufzeit zusammengeschmolzen ist - dann lohnt das Nachzählen."""
        left = self.days_left
        if left is None:
            return None
        return max(1, left - 2 * self.buffer_days)

    @computed_field
    @property
    def status(self) -> SupplyStatus:
        # Ein "jetzt kaufen" aus einer Nachzählung schlägt den blinden Countdown
        if self.reorder_since is not None:
            days = self.days_left
            return "empty" if days is not None and days <= 0 else "order"
        days = self.days_left
        if days is None:
            return "unknown"
        if days <= 0:
            return "empty"
        if days <= self.buffer_days:
            return "order"
        if self.check_due:
            return "check"
        if days <= self.buffer_days * 2:
            return "soon"
        return "ok"

    @computed_field
    @property
    def suggested_packs(self) -> int:
        """Kaufmenge: bis zum Soll-Bestand auffüllen, sonst die übliche Menge."""
        import math

        if self.target_stock:
            return max(1, math.ceil(self.target_stock - self.raw_stock))
        return max(1, math.ceil(self.effective_packs_per_purchase))

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
        rate = self.effective_days_per_pack
        if self.price is None or not rate:
            return None
        return money(self.price / rate * DAYS_PER_MONTH)

    @computed_field
    @property
    def yearly_cost(self) -> float | None:
        rate = self.effective_days_per_pack
        if self.price is None or not rate:
            return None
        return money(self.price / rate * 365)

    @computed_field
    @property
    def yearly_savings(self) -> float | None:
        """Ersparnis pro Jahr gegenueber dem Normalpreis (z. B. durch Spar-Abo)."""
        rate = self.effective_days_per_pack
        if (
            self.price is None
            or self.regular_price is None
            or not rate
            or self.regular_price <= self.price
        ):
            return None
        return money((self.regular_price - self.price) / rate * 365)

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
        """1.0 = das Abo liefert genau so viel, wie tatsächlich verbraucht wird."""
        rate = self.effective_days_per_pack
        if not self.is_subscription or not self.subscription_interval_days or not rate:
            return None
        delivered_per_day = self.subscription_packs / self.subscription_interval_days
        used_per_day = 1 / rate
        return round(delivered_per_day / used_per_day, 2)


class RestockIn(BaseModel):
    """Kauf verbuchen: Packungen wandern in den Bestand und in die Kaufhistorie."""

    packs: float = Field(default=1, gt=0)
    price: float | None = Field(default=None, ge=0)
    purchased_on: date | None = None
    note: str | None = None


class StockIn(BaseModel):
    """Bestand korrigieren - ab dem Stichtag rechnet die App wieder selbst weiter."""

    stock_packs: float = Field(ge=0)
    as_of: date | None = None


class RecountIn(BaseModel):
    """Antwort auf die Nachzähl-Frage: so viel ist noch da. Die App entscheidet
    dann, ob der Termin nach hinten wandert oder ob gekauft werden muss."""

    stock_packs: float = Field(ge=0)


class PurchaseIn(BaseModel):
    """Kauf nachtragen - auch rückwirkend. Fließt in die Rhythmus-Berechnung ein,
    lässt den aktuellen Bestand aber unangetastet (dafür gibt es StockIn/RestockIn)."""

    purchased_on: date
    packs: float = Field(default=1, gt=0)
    price: float | None = Field(default=None, ge=0)
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


# --- Scanner ------------------------------------------------------------

ScanStatus = Literal["booked", "pending", "error"]


class ScanIn(BaseModel):
    """Ein gelesener Code. `packs` nur, wenn die Station selbst schon gebuendelt
    hat - sonst zaehlt der Server mehrfache Scans derselben EAN zusammen."""

    ean: str = Field(min_length=6, max_length=20)
    packs: float = Field(default=1, gt=0)


class ScanBatch(BaseModel):
    """Was die Station schickt: alles, was seit dem letzten erfolgreichen POST
    aufgelaufen ist. Gepuffert, damit ein WLAN-Aussetzer keinen Scan verliert."""

    device: str | None = Field(default=None, max_length=80)
    events: list[ScanIn] = Field(min_length=1, max_length=200)


class ScanResult(BaseModel):
    """Antwort je Code - die Station macht daraus ihr Signal: gruen gebucht,
    gelb liegt im Eingang, rot Fehler."""

    ean: str
    status: ScanStatus
    supply_id: int | None = None
    supply_name: str | None = None
    packs: float = 1
    scan_event_id: int | None = None
    message: str | None = None


class ScanBatchOut(BaseModel):
    results: list[ScanResult]


class ScanEventOut(ORMModel):
    id: int
    ean: str
    device: str | None
    scanned_at: datetime
    packs: float
    status: str
    product: dict | None
    suggestion: dict | None
    note: str | None


class ScanAssignIn(BaseModel):
    """Eingang zuordnen: Kauf verbuchen und die EAN kuenftig direkt erkennen."""

    supply_id: int
    packs: float | None = Field(default=None, gt=0)
    remember: bool = True


class ScanCreateIn(SupplyIn):
    """Eingang als neuen Artikel anlegen - SupplyIn plus die Scan-Extras."""

    packs: float | None = Field(default=None, gt=0)
    remember: bool = True


class BarcodeOut(ORMModel):
    ean: str
    supply_id: int
    supply_name: str | None = None
    packs: float
    label: str | None
    source: str
    created_at: datetime


class ScanConfigOut(BaseModel):
    """Was gerade aktiv ist - die Scan-Seite erklaert damit, warum ein Eingang
    vorbelegt ist oder eben nicht."""

    lookup_enabled: bool
    ai_enabled: bool
    ai_model: str | None
    auto_assign: float
    token_required: bool


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
