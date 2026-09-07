import { useEffect, useState } from "react";
import { ChevronRight, ExternalLink, History, RefreshCw } from "lucide-react";
import { QuickBuyButton } from "./QuickBuyButton";
import {
  SUPPLY_STATUS,
  colorOf,
  dateLabel,
  euro,
  rhythmLabel,
  unitPrice,
  untilPurchase,
} from "../lib/format";
import type { Supply } from "../types";

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

/**
 * Kartenzeile: zeigt Packungsgröße, Preis pro Einheit und den Fortschritt im
 * Kaufzyklus als Balken - Dinge, die in der Tabellenansicht keinen Platz haben.
 */
export function SupplyCardRow({
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
  // Menge für den Preis: "24x 85 g · 18,49 € · 0,77 € / Dose"
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
                className="-mx-1.5 truncate rounded-md px-1.5 text-[14px] font-medium decoration-faint decoration-dotted hover:bg-line-soft hover:underline"
              >
                {supply.name}
              </span>
            )}
            {supply.is_subscription && <RefreshCw size={12} className="shrink-0 text-teal-500" />}
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
