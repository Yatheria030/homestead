import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  History,
  Inbox,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Timer,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { QuickBuyButton } from "../components/QuickBuyButton";
import { SupplyDrawer } from "../components/SupplyDrawer";
import { Button, Card, EmptyState } from "../components/ui";
import {
  SUPPLY_STATUS,
  colorOf,
  dateLabel,
  euro,
  rhythmLabel,
  unitPrice,
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

type Smart = "all" | "order" | "soon" | "subscription";

/** Balken: wo im Kaufzyklus stehen wir gerade? */
function CycleBar({ supply }: { supply: Supply }) {
  const status = SUPPLY_STATUS[supply.status];
  const cycle = Math.max(supply.purchase_interval_days ?? 0, 1);
  const left = Math.max(0, supply.days_left ?? 0);
  const used = Math.min(100, Math.max(0, ((cycle - left) / cycle) * 100));
  const buyAt = Math.min(100, ((cycle - supply.buffer_days) / cycle) * 100);

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${used}%`, background: colorOf(status.color) }}
      />
      {/* Markierung: ab hier kaufen, damit der Vorlauf reicht */}
      <div
        className="absolute inset-y-0 w-px bg-[var(--faint)] opacity-70"
        style={{ left: `${buyAt}%` }}
        title={`Kaufen, wenn noch ${supply.buffer_days} Tage übrig sind`}
      />
    </div>
  );
}

function SupplyRow({
  supply,
  onOpen,
  onRestock,
  onRename,
}: {
  supply: Supply;
  onOpen: () => void;
  onRestock: (packs: number) => void;
  onRename: (name: string) => void;
}) {
  const status = SUPPLY_STATUS[supply.status];
  const perUnit = unitPrice(supply.price_per_unit, supply.unit);
  // Menge für den Preis: "24x 85 g für 18,49 € (0,77 € / Dose)"
  const priceLine = [
    supply.pack_label,
    supply.price !== null ? `${euro(supply.price)}${perUnit ? ` · ${perUnit}` : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(supply.name);
  // Von außen aktualisierte Namen übernehmen, solange gerade nicht editiert wird
  useEffect(() => {
    if (!editing) setDraft(supply.name);
  }, [supply.name, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== supply.name) onRename(trimmed);
    else setDraft(supply.name);
  };

  return (
    <div
      className={`group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line-soft px-4 py-3 transition last:border-0 hover:bg-raised md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.5fr)_auto] ${
        supply.active ? "" : "opacity-45"
      }`}
      onClick={onOpen}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="dot size-2.5 shrink-0 rounded-full"
          style={{ ["--chip" as string]: colorOf(status.color) }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commit();
                  if (event.key === "Escape") {
                    setDraft(supply.name);
                    setEditing(false);
                  }
                }}
                className="-mx-1.5 min-w-0 flex-1 rounded-md bg-raised px-1.5 text-[14px] font-medium outline-none ring-2 ring-brand/25"
              />
            ) : (
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  setEditing(true);
                }}
                title="Zum Umbenennen klicken"
                className="truncate rounded-md px-1.5 -mx-1.5 text-[14px] font-medium decoration-dotted decoration-faint hover:bg-line-soft hover:underline"
              >
                {supply.name}
              </span>
            )}
            {supply.is_subscription && (
              <RefreshCw size={12} className="shrink-0 text-teal-500" />
            )}
          </div>
          <div className="flex items-center gap-1.5 truncate text-[12px] text-muted">
            <span className="truncate">{priceLine || "Preis und Menge fehlen"}</span>
            {supply.vendor && (
              <>
                <span className="text-faint">·</span>
                {supply.url ? (
                  <a
                    href={supply.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex shrink-0 items-center gap-1 truncate font-medium text-brand hover:underline"
                    title={`Bei ${supply.vendor} nachbestellen`}
                  >
                    {supply.vendor}
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="shrink-0 truncate">{supply.vendor}</span>
                )}
              </>
            )}
            {!supply.vendor && supply.url && (
              <a
                href={supply.url}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex shrink-0 items-center gap-1 font-medium text-brand hover:underline"
              >
                Bezugsquelle <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-2 min-w-0 md:col-span-1">
        <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
          <span className="flex min-w-0 items-center gap-1 truncate font-medium">
            {supply.rhythm_source === "history" && (
              <History
                size={11}
                className="shrink-0 text-faint"
                aria-label="aus der Kaufhistorie berechnet"
              />
            )}
            <span className="truncate">
              {rhythmLabel(supply.effective_packs_per_purchase, supply.purchase_interval_days)}
            </span>
          </span>
          <span
            className="shrink-0 font-medium tabular-nums"
            style={{ color: colorOf(status.color) }}
            title={supply.buy_on ? `Kaufen am ${dateLabel(supply.buy_on)}` : undefined}
          >
            {untilPurchase(supply.days_until_purchase)}
          </span>
        </div>
        <CycleBar supply={supply} />
      </div>

      <div
        className="flex shrink-0 items-center gap-1 justify-self-end"
        onClick={(event) => event.stopPropagation()}
      >
        <QuickBuyButton supply={supply} onBuy={onRestock} />
        <ChevronRight size={15} className="text-faint" />
      </div>
    </div>
  );
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
      .sort(
        (a, b) =>
          order[a.status] - order[b.status] ||
          (a.days_until_purchase ?? 9999) - (b.days_until_purchase ?? 9999),
      );
  }, [supplies, search, smart, listId]);

  const monthly = rows.reduce((sum, supply) => sum + (supply.monthly_cost ?? 0), 0);
  const open = supplies.find((supply) => supply.id === openId) ?? null;

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

  return (
    <>
      <PageHeader
        title="Vorrat"
        subtitle={`${counts.all} Artikel · ${counts.order} jetzt kaufen · ${euro(monthly)} pro Monat`}
        onMenu={onMenu}
        search={search}
        onSearch={setSearch}
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
                  showTrash
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-line-soft hover:text-ink"
                }`}
              >
                <Trash2 size={15} />
                <span className="flex-1 text-left">Papierkorb</span>
                {trash.length > 0 && (
                  <span className="tabular-nums text-faint">{trash.length}</span>
                )}
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
          ) : (
            <Card padded={false}>
              {isLoading && <EmptyState title="Lädt…" />}
              {!isLoading && rows.length === 0 && (
                <EmptyState
                  title="Nichts in dieser Liste"
                  hint="Oben hinzufügen oder einen anderen Filter wählen."
                />
              )}
              {rows.map((supply) => (
                <SupplyRow
                  key={supply.id}
                  supply={supply}
                  onOpen={() => setOpenId(supply.id)}
                  onRename={(name) => actions.update(supply.id, { name })}
                  onRestock={(packs) => actions.restock(supply.id, packs)}
                />
              ))}
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-faint">
            <Package size={13} />
            {showTrash
              ? "Ein Klick auf „Wiederherstellen“ bringt den Artikel samt Kaufhistorie zurück."
              : "Der Rhythmus ergibt sich aus Haltbarkeit mal Kaufmenge. „Gekauft“ startet ihn neu – Reste aus dem letzten Einkauf werden dabei mitgerechnet."}
          </div>
        </div>
      </div>

      <SupplyDrawer supply={open} onClose={() => setOpenId(null)} />
    </>
  );
}
