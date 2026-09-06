import { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  ExternalLink,
  Inbox,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  Timer,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SupplyDrawer } from "../components/SupplyDrawer";
import { Card, EmptyState } from "../components/ui";
import {
  SUPPLY_STATUS,
  colorOf,
  coverageLabel,
  euro,
  packs as packLabel,
  unitPrice,
} from "../lib/format";
import {
  useSupplies,
  useSupplyActions,
  useSupplyListActions,
  useSupplyLists,
} from "../lib/hooks";
import type { Supply } from "../types";

type Smart = "all" | "order" | "soon" | "subscription";

/** Balken: wie weit reicht der Vorrat gemessen an der Zielreichweite? */
function CoverageBar({ supply }: { supply: Supply }) {
  const status = SUPPLY_STATUS[supply.status];
  const target = Math.max(supply.target_cover_days, 1);
  const filled = Math.min(100, Math.max(0, ((supply.days_left ?? 0) / target) * 100));
  const bufferAt = Math.min(100, (supply.buffer_days / target) * 100);

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${filled}%`, background: colorOf(status.color) }}
      />
      {/* Markierung: ab hier sollte bestellt werden */}
      <div
        className="absolute inset-y-0 w-px bg-[var(--faint)] opacity-70"
        style={{ left: `${bufferAt}%` }}
        title={`Nachbestellen ab ${supply.buffer_days} Tagen Rest`}
      />
    </div>
  );
}

function SupplyRow({
  supply,
  onOpen,
  onRestock,
}: {
  supply: Supply;
  onOpen: () => void;
  onRestock: () => void;
}) {
  const status = SUPPLY_STATUS[supply.status];
  const perUnit = unitPrice(supply.price_per_unit, supply.unit);
  // Menge für den Preis: "24x 85 g für 18,49 € (0,77 € / Dose)"
  const priceLine = [
    supply.pack_size,
    supply.price !== null ? `${euro(supply.price)}${perUnit ? ` · ${perUnit}` : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
            <span className="truncate text-[14px] font-medium">{supply.name}</span>
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
          <span className="truncate font-medium" style={{ color: colorOf(status.color) }}>
            {coverageLabel(supply.days_left)}
          </span>
          <span className="shrink-0 tabular-nums text-faint">
            {packLabel(supply.stock_now)}
          </span>
        </div>
        <CoverageBar supply={supply} />
      </div>

      <div
        className="flex shrink-0 items-center gap-1 justify-self-end"
        onClick={(event) => event.stopPropagation()}
      >
        {supply.suggested_packs > 0 && (
          <span className="hidden rounded-md bg-line-soft px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted sm:block">
            {supply.suggested_packs}×
          </span>
        )}
        <button
          onClick={onRestock}
          title={`${Math.max(1, supply.suggested_packs)} Packungen als gekauft buchen`}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-[12px] font-medium text-muted transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <Check size={13} /> Gekauft
        </button>
        <ChevronRight size={15} className="text-faint" />
      </div>
    </div>
  );
}

export function Supplies({ onMenu }: { onMenu: () => void }) {
  const [search, setSearch] = useState("");
  const [smart, setSmart] = useState<Smart>("all");
  const [listId, setListId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [newList, setNewList] = useState(false);

  const { data: supplies = [], isLoading } = useSupplies();
  const { data: lists = [] } = useSupplyLists();
  const actions = useSupplyActions();
  const listActions = useSupplyListActions();

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
          order[a.status] - order[b.status] || (a.days_left ?? 9999) - (b.days_left ?? 9999),
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
      stock_packs: 1,
      buffer_days: 14,
      target_cover_days: 60,
    });
    setDraft("");
  };

  const smartItems: { key: Smart; label: string; icon: typeof Inbox; color: string }[] = [
    { key: "all", label: "Alles", icon: Inbox, color: "slate" },
    { key: "order", label: "Jetzt bestellen", icon: ShoppingCart, color: "orange" },
    { key: "soon", label: "Wird knapp", icon: Timer, color: "amber" },
    { key: "subscription", label: "Im Abo", icon: RefreshCw, color: "teal" },
  ];

  return (
    <>
      <PageHeader
        title="Vorrat"
        subtitle={`${counts.all} Artikel · ${counts.order} nachbestellen · ${euro(monthly)} pro Monat`}
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
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                    smart === item.key && listId === null
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
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                      listId === list.id
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
          </Card>
        </div>

        <div className="min-w-0 space-y-3">
          {/* Schnellerfassung wie in einer Aufgabenliste */}
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
                onRestock={() =>
                  actions.restock(supply.id, Math.max(1, supply.suggested_packs))
                }
              />
            ))}
          </Card>

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-faint">
            <Package size={13} />
            Der Bestand rechnet sich täglich selbst herunter. „Gekauft" bucht die
            vorgeschlagene Menge dazu, im Detail lässt er sich jederzeit korrigieren.
          </div>
        </div>
      </div>

      <SupplyDrawer supply={open} onClose={() => setOpenId(null)} />
    </>
  );
}
