import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ExternalLink,
  History,
  Inbox,
  LayoutGrid,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Rows3,
  ShoppingCart,
  Timer,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Grid, Td, Th } from "../components/Grid";
import { CheckCell, NumberCell, TextCell } from "../components/cells";
import { QuickBuyButton } from "../components/QuickBuyButton";
import { SupplyCardRow } from "../components/SupplyCardRow";
import { SupplyDrawer } from "../components/SupplyDrawer";
import { Button, Card, EmptyState } from "../components/ui";
import {
  SUPPLY_STATUS,
  colorOf,
  dateLabel,
  euro,
  rhythmLabel,
  untilPurchase,
} from "../lib/format";
import {
  useSupplies,
  useSupplyActions,
  useSupplyListActions,
  useSupplyLists,
  useTrash,
  useTrashActions,
} from "../lib/hooks";
import type { Supply } from "../types";

const COL_KEYS = ["status", "name", "list", "stock", "rhythm", "next", "price", "subscription", "vendor", "action"] as const;
type Smart = "all" | "order" | "soon" | "subscription";
type View = "grid" | "cards";

const COLUMNS = 10;
const VIEW_KEY = "homestead-vorrat-view";
const WIDTHS_KEY = "homestead-vorrat-col-widths";
const MIN_WIDTH = 48;
/** Standardbreiten pro Spalte – bei Ziehen wird nur der eigene Wert gemerkt. */
const DEFAULT_WIDTHS: Record<string, number> = {
  status: 36,
  name: 150,
  list: 92,
  stock: 70,
  rhythm: 160,
  next: 105,
  price: 85,
  subscription: 50,
  vendor: 85,
  action: 177,
};


/** Gewählte Ansicht merken - die Entscheidung ist Geschmackssache, nicht pro Besuch neu. */
function useViewPreference() {
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "cards" ? "cards" : "grid";
    } catch {
      return "grid";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* privater Modus o. Ä. - dann eben nur für diese Sitzung */
    }
  }, [view]);

  return [view, setView] as const;
}

/**
 * Spaltenbreiten merkt die Tabelle selbst, wie Excel: am Rand gezogen wird,
 * der Wert bleibt für spätere Besuche erhalten. Standardbreite gilt, solange
 * der Nutzer an einer Spalte nichts gezogen hat.
 */
function useColumnWidths(keys: string[]) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const base = Object.fromEntries(keys.map((key) => [key, DEFAULT_WIDTHS[key] ?? 100]));
    try {
      const stored = JSON.parse(localStorage.getItem(WIDTHS_KEY) ?? "{}") as Record<string, number>;
      for (const key of keys) {
        if (typeof stored[key] === "number" && stored[key] >= MIN_WIDTH) base[key] = stored[key];
      }
    } catch {
      /* kein/einwandiger Speicher – dann Standardbreiten */
    }
    return base;
  });

  useEffect(() => {
    try {
      localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths));
    } catch {
      /* privater Modus – Breite gilt dann nur für diese Sitzung */
    }
  }, [widths]);

  const resize = (key: string) => (delta: number) =>
    setWidths((current) => ({ ...current, [key]: Math.max(MIN_WIDTH, current[key] + delta) }));

  return { widths, resize };
}

function TrashRow({
  supply,
  onRestore,
  onPurge,
}: {
  supply: Supply;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3 last:border-0">
      <Trash2 size={15} className="shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{supply.name}</div>
        <div className="truncate text-[12px] text-muted">
          Gelöscht am {dateLabel(supply.deleted_at)} · wird am {dateLabel(supply.purge_on)}{" "}
          endgültig entfernt
        </div>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[12px] text-muted">Endgültig löschen?</span>
          <Button onClick={() => setConfirming(false)}>Abbrechen</Button>
          <Button variant="danger" onClick={onPurge}>
            Ja, löschen
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onRestore}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-[12px] font-medium text-muted transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <RotateCcw size={13} /> Wiederherstellen
          </button>
          <button
            onClick={() => setConfirming(true)}
            title="Endgültig löschen"
            className="grid size-7 place-items-center rounded-md text-faint transition hover:bg-rose-500/10 hover:text-rose-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function Supplies({ onMenu }: { onMenu: () => void }) {
  const [search, setSearch] = useState("");
  const [smart, setSmart] = useState<Smart>("all");
  const [listId, setListId] = useState<number | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [newList, setNewList] = useState(false);
  // Kopf „Liste" klicken: aufsteigend → absteigend → aus
  const [listSort, setListSort] = useState<null | "asc" | "desc">(null);
  const [view, setView] = useViewPreference();
  const { widths, resize } = useColumnWidths([...COL_KEYS]);

  const { data: supplies = [], isLoading } = useSupplies();
  const { data: lists = [] } = useSupplyLists();
  const { data: trash = [] } = useTrash();
  const actions = useSupplyActions();
  const listActions = useSupplyListActions();
  const trashActions = useTrashActions();

  const counts = useMemo(
    () => ({
      all: supplies.length,
      order: supplies.filter((s) => s.status === "order" || s.status === "empty").length,
      soon: supplies.filter((s) => s.status === "soon").length,
      subscription: supplies.filter((s) => s.is_subscription).length,
    }),
    [supplies],
  );

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const order: Record<string, number> = { empty: 0, order: 1, soon: 2, unknown: 3, ok: 4 };
    return supplies
      .filter((supply) => (listId === null ? true : supply.list_id === listId))
      .filter((supply) => {
        if (smart === "order") return supply.status === "order" || supply.status === "empty";
        if (smart === "soon") return supply.status === "soon";
        if (smart === "subscription") return supply.is_subscription;
        return true;
      })
      .filter((supply) =>
        !needle
          ? true
          : [supply.name, supply.location, supply.vendor, supply.supply_list?.name]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        if (listSort) {
          const nameA = a.supply_list?.name ?? "\u0000";
          const nameB = b.supply_list?.name ?? "\u0000";
          const cmp = nameA.localeCompare(nameB, "de");
          if (cmp !== 0) return listSort === "asc" ? cmp : -cmp;
        }
        return (
          order[a.status] - order[b.status] ||
          (a.days_until_purchase ?? 9999) - (b.days_until_purchase ?? 9999)
        );
      });
    }, [supplies, search, smart, listId, listSort]);

  const monthly = rows.reduce((sum, supply) => sum + (supply.monthly_cost ?? 0), 0);

  const addSupply = () => {
    const name = draft.trim();
    if (!name) return;
    actions.create({
      name,
      list_id: listId ?? lists[0]?.id ?? null,
      days_per_pack: 30,
      packs_per_purchase: 1,
      stock_packs: 1,
      buffer_days: 7,
    });
    setDraft("");
  };

  const smartItems: { key: Smart; label: string; icon: typeof Inbox; color: string }[] = [
    { key: "all", label: "Alles", icon: Inbox, color: "slate" },
    { key: "order", label: "Jetzt kaufen", icon: ShoppingCart, color: "orange" },
    { key: "soon", label: "Bald dran", icon: Timer, color: "amber" },
    { key: "subscription", label: "Im Abo", icon: RefreshCw, color: "teal" },
  ];

  const renderRow = (supply: Supply) => {
    const status = SUPPLY_STATUS[supply.status];
    return (
      <tr key={supply.id} className={`group transition hover:bg-raised ${supply.active ? "" : "opacity-45"}`}>
        <Td padded className="text-center">
          <span
            className="dot inline-block size-2.5 rounded-full align-middle"
            style={{ ["--chip" as string]: colorOf(status.color) }}
            title={status.label}
          />
        </Td>
        <Td className="font-medium">
          <TextCell value={supply.name} onCommit={(name) => actions.update(supply.id, { name })} />
        </Td>
        <Td>
          {supply.supply_list ? (
            <span
              className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] font-medium"
              style={{
                color: colorOf(supply.supply_list.color),
                background: `color-mix(in srgb, ${colorOf(supply.supply_list.color)} 12%, transparent)`,
              }}
            >
              <span className="shrink-0">{supply.supply_list.icon ?? "•"}</span>
              <span className="truncate">{supply.supply_list.name}</span>
            </span>
          ) : (
            <span className="text-faint">–</span>
          )}
        </Td>
        <Td>
          <NumberCell
            value={supply.stock_now}
            step="0.1"
            onCommit={(value) => actions.setStock(supply.id, value ?? 0)}
          />
        </Td>
        <Td padded>
          <div className="flex items-center gap-1 truncate">
            {supply.rhythm_source === "history" && (
              <History size={11} className="shrink-0 text-faint" aria-label="aus der Kaufhistorie berechnet" />
            )}
            <span className="truncate">
              {rhythmLabel(supply.effective_packs_per_purchase, supply.purchase_interval_days)}
            </span>
          </div>
        </Td>
        <Td padded>
          <span className="font-medium tabular-nums" style={{ color: colorOf(status.color) }}>
            {untilPurchase(supply.days_until_purchase)}
          </span>
        </Td>
        <Td>
          <NumberCell
            value={supply.price}
            money
            onCommit={(price) => actions.update(supply.id, { price })}
          />
        </Td>
        <Td>
          <CheckCell
            value={supply.is_subscription}
            onCommit={(is_subscription) => actions.update(supply.id, { is_subscription })}
          />
        </Td>
        <Td>
          <TextCell value={supply.vendor} onCommit={(vendor) => actions.update(supply.id, { vendor })} />
        </Td>
        <Td>
          <div className="flex h-9 items-center justify-end gap-1 px-1.5">
            <QuickBuyButton supply={supply} onBuy={(packs) => actions.restock(supply.id, packs)} />
            {supply.url && (
              <a
                href={supply.url}
                target="_blank"
                rel="noreferrer"
                title="Bezugslink öffnen"
                className="grid size-7 shrink-0 place-items-center rounded-md text-faint transition hover:bg-brand/10 hover:text-brand"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={() => setOpenId(supply.id)}
              title="Details öffnen – dort auch löschen"
              className="grid size-7 shrink-0 place-items-center rounded-md text-faint transition hover:bg-line-soft hover:text-ink"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </Td>
      </tr>
    );
  };

  return (
    <>
      <PageHeader
        title="Vorrat"
        subtitle={`${counts.all} Artikel · ${counts.order} jetzt kaufen · ${euro(monthly)} pro Monat`}
        onMenu={onMenu}
        search={search}
        onSearch={setSearch}
        actions={
          !showTrash && (
            <div className="hidden items-center gap-0.5 rounded-lg border border-line bg-raised p-0.5 sm:flex">
              {(
                [
                  ["grid", "Tabelle", Rows3],
                  ["cards", "Karten", LayoutGrid],
                ] as [View, string, typeof Rows3][]
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  onClick={() => setView(value)}
                  title={
                    value === "cards"
                      ? "Karten: mit Fortschrittsbalken und Preis je Einheit"
                      : "Tabelle: alle Werte direkt bearbeitbar"
                  }
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium transition ${
                    view === value
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          )
        }
      />

      <div className="grid gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Listen wie in der Erinnerungen-App */}
        <div className="space-y-4">
          <Card padded={false} className="overflow-hidden">
            <div className="space-y-0.5 p-1.5">
              {smartItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setSmart(item.key);
                    setListId(null);
                    setShowTrash(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                    smart === item.key && listId === null && !showTrash
                      ? "bg-brand-soft text-brand"
                      : "text-muted hover:bg-line-soft hover:text-ink"
                  }`}
                >
                  <item.icon size={15} style={{ color: colorOf(item.color) }} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="tabular-nums text-faint">{counts[item.key]}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-line p-1.5">
              <div className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Listen
              </div>
              {lists.map((list) => {
                const count = supplies.filter((supply) => supply.list_id === list.id).length;
                return (
                  <button
                    key={list.id}
                    onClick={() => {
                      setListId(list.id);
                      setSmart("all");
                      setShowTrash(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                      listId === list.id && !showTrash
                        ? "bg-brand-soft text-brand"
                        : "text-muted hover:bg-line-soft hover:text-ink"
                    }`}
                  >
                    <span
                      className="grid size-5 shrink-0 place-items-center rounded-md text-[11px]"
                      style={{
                        background: `color-mix(in srgb, ${colorOf(list.color)} 18%, transparent)`,
                      }}
                    >
                      {list.icon ?? "•"}
                    </span>
                    <span className="flex-1 truncate text-left">{list.name}</span>
                    <span className="tabular-nums text-faint">{count}</span>
                  </button>
                );
              })}

              {newList ? (
                <input
                  autoFocus
                  placeholder="Name der Liste…"
                  onBlur={() => setNewList(false)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && event.currentTarget.value.trim()) {
                      listActions.create({
                        name: event.currentTarget.value.trim(),
                        color: "indigo",
                        sort_order: (lists.length + 1) * 10,
                      });
                      setNewList(false);
                    }
                    if (event.key === "Escape") setNewList(false);
                  }}
                  className="mt-0.5 w-full rounded-lg bg-raised px-2.5 py-2 text-[13px] outline-none ring-2 ring-brand/25"
                />
              ) : (
                <button
                  onClick={() => setNewList(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-faint transition hover:bg-line-soft hover:text-ink"
                >
                  <Plus size={15} /> Liste
                </button>
              )}
            </div>

            <div className="border-t border-line p-1.5">
              <button
                onClick={() => setShowTrash(true)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                  showTrash ? "bg-brand-soft text-brand" : "text-muted hover:bg-line-soft hover:text-ink"
                }`}
              >
                <Trash2 size={15} />
                <span className="flex-1 text-left">Papierkorb</span>
                {trash.length > 0 && <span className="tabular-nums text-faint">{trash.length}</span>}
              </button>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-3">
          {/* Schnellerfassung wie in einer Aufgabenliste */}
          {!showTrash && (
            <Card padded={false}>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Plus size={16} className="shrink-0 text-faint" />
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addSupply()}
                  placeholder="Artikel hinzufügen – z. B. Katzenstreu"
                  className="h-7 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
                />
                {draft && (
                  <button
                    onClick={addSupply}
                    className="rounded-md bg-brand px-2.5 py-1 text-[12px] font-medium text-white"
                  >
                    Anlegen
                  </button>
                )}
              </div>
            </Card>
          )}

          {showTrash ? (
            <Card padded={false}>
              {trash.length === 0 && (
                <EmptyState
                  title="Papierkorb ist leer"
                  hint="Gelöschte Artikel bleiben 30 Tage hier, bevor sie endgültig entfernt werden."
                />
              )}
              {trash.map((supply) => (
                <TrashRow
                  key={supply.id}
                  supply={supply}
                  onRestore={() => trashActions.restore(supply.id)}
                  onPurge={() => trashActions.purge(supply.id)}
                />
              ))}
            </Card>
          ) : view === "cards" ? (
            <Card padded={false}>
              {isLoading && <EmptyState title="Lädt…" />}
              {!isLoading && rows.length === 0 && (
                <EmptyState
                  title="Nichts in dieser Liste"
                  hint="Oben hinzufügen oder einen anderen Filter wählen."
                />
              )}
              {rows.map((supply) => (
                <SupplyCardRow
                  key={supply.id}
                  supply={supply}
                  onOpen={() => setOpenId(supply.id)}
                  onRename={(name) => actions.update(supply.id, { name })}
                  onRestock={(packs) => actions.restock(supply.id, packs)}
                />
              ))}
            </Card>
          ) : (
            <Grid
              minWidth={Math.min(1100, Math.max(560, Object.values(widths).reduce((a, b) => a + b, 0)))}
              fixed
            >
              <thead>
                <tr>
                  <Th width={widths.status} separator align="center" onResize={resize("status")}>
                    <span title="Status">•</span>
                  </Th>
                  <Th width={widths.name} separator onResize={resize("name")}>Artikel</Th>
                  <Th width={widths.list} separator onResize={resize("list")}>
                    <button
                      onClick={() =>
                        setListSort(listSort ? null : listSort === "asc" ? "desc" : "asc")
                      }
                      title="Nach Liste sortieren"
                      className={`inline-flex items-center gap-1 uppercase tracking-wider ${
                        listSort ? "text-brand" : ""
                      }`}
                    >
                      Liste
                      {listSort === "asc" && <ArrowUp size={11} />}
                      {listSort === "desc" && <ArrowDown size={11} />}
                    </button>
                  </Th>
                  <Th width={widths.stock} separator align="right" onResize={resize("stock")}>
                    Bestand
                  </Th>
                  <Th width={widths.rhythm} separator onResize={resize("rhythm")}>Rhythmus</Th>
                  <Th width={widths.next} separator onResize={resize("next")}>Nächster Kauf</Th>
                  <Th width={widths.price} separator align="right" onResize={resize("price")}>
                    Preis
                  </Th>
                  <Th width={widths.subscription} separator align="center" onResize={resize("subscription")}>
                    Abo
                  </Th>
                  <Th width={widths.vendor} separator onResize={resize("vendor")}>Anbieter</Th>
                  <Th width={widths.action} separator align="right" onResize={resize("action")}>
                    Aktion
                  </Th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={COLUMNS}>
                      <EmptyState title="Lädt…" />
                    </td>
                  </tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS}>
                      <EmptyState
                        title="Nichts in dieser Liste"
                        hint="Oben hinzufügen oder einen anderen Filter wählen."
                      />
                    </td>
                  </tr>
                )}
                {rows.map(renderRow)}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-raised">
                    <td colSpan={6} className="px-2.5 py-2.5 text-[12px] font-medium text-muted">
                      Vorrat gesamt · pro Monat
                    </td>
                    <td colSpan={4} className="px-2.5 py-2.5 text-right text-[14px] font-semibold tabular-nums">
                      {euro(monthly)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </Grid>
          )}

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-faint">
            <Package size={13} />
            {showTrash
              ? "Ein Klick auf „Wiederherstellen“ bringt den Artikel samt Kaufhistorie zurück."
              : view === "cards"
                ? "Der Balken zeigt, wo im Kaufzyklus der Artikel gerade steht – der Strich markiert den Kauftermin. Zum Bearbeiten aller Werte oben auf „Tabelle“ wechseln."
                : "Zellen sind direkt anklickbar. Der Rhythmus ergibt sich aus Haltbarkeit mal Kaufmenge – „gekauft“ startet ihn neu."}
          </div>
        </div>
      </div>

      <SupplyDrawer supply={supplies.find((s) => s.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </>
  );
}
