import { useState } from "react";
import { History, Plus, Trash2 } from "lucide-react";
import { Button, Chip, inputClass } from "./ui";
import { dateLabel, euro } from "../lib/format";
import { useSupplyActions, usePurchases } from "../lib/hooks";
import type { Supply } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Der Kaufrhythmus wird aus dieser Liste berechnet, nicht geschätzt: Zeitspanne
 * zwischen den Käufen geteilt durch die Menge, die in der Zeit weg war. Käufe
 * hier eintragen wirkt sich nur auf die Rechnung aus - für einen Kauf gerade
 * eben ist der Haken "auch zum Bestand" da, sonst bleibt der Bestand unberührt.
 */
export function PurchaseHistory({ supply }: { supply: Supply }) {
  const { purchases, isLoading, add, remove } = usePurchases(supply.id);
  const actions = useSupplyActions();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [packs, setPacks] = useState(String(supply.suggested_packs || 1));
  const [price, setPrice] = useState(supply.price !== null ? String(supply.price) : "");
  const [addToStock, setAddToStock] = useState(true);

  const isToday = date === today();

  const openForm = () => {
    setDate(today());
    setPacks(String(supply.suggested_packs || 1));
    setPrice(supply.price !== null ? String(supply.price) : "");
    setAddToStock(true);
    setOpen(true);
  };

  const submit = () => {
    const parsedPacks = Number(packs.replace(",", ".")) || 1;
    const parsedPrice = price.trim() === "" ? undefined : Number(price.replace(",", "."));
    if (addToStock) {
      // Bucht gleichzeitig auf den aktuellen Bestand - der übliche Fall "gerade gekauft"
      actions.restock(supply.id, parsedPacks, parsedPrice, date);
    } else {
      // Reiner Historieneintrag, z. B. zum Nachtragen vergangener Käufe
      add({ purchased_on: date, packs: parsedPacks, price: parsedPrice });
    }
    setOpen(false);
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-faint">
          Kaufhistorie
        </h3>
        {supply.rhythm_source === "history" && (
          <Chip
            label={`aus ${supply.purchase_count} Käufen berechnet`}
            color="emerald"
            dot={false}
          />
        )}
      </div>

      {supply.rhythm_source !== "history" && (
        <p className="mb-2 text-[12px] text-muted">
          {supply.purchase_count === 0
            ? "Noch keine Käufe eingetragen – trag mindestens zwei ein, dann berechnet sich der Rhythmus von selbst."
            : "Noch zu wenig Käufe für eine verlässliche Berechnung – trag einen weiteren ein."}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-line">
        {isLoading && (
          <div className="px-3 py-3 text-[12px] text-faint">Lädt…</div>
        )}
        {!isLoading && purchases.length === 0 && (
          <div className="px-3 py-3 text-[12px] text-faint">Noch keine Einträge.</div>
        )}
        {purchases.map((purchase) => (
          <div
            key={purchase.id}
            className="group flex items-center gap-2 border-b border-line-soft px-3 py-2 text-[13px] last:border-0 hover:bg-raised"
          >
            <span className="min-w-0 flex-1 truncate">{dateLabel(purchase.purchased_on)}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {purchase.packs} {purchase.packs === 1 ? "Packung" : "Packungen"}
            </span>
            {purchase.price !== null && (
              <span className="hidden shrink-0 tabular-nums text-faint sm:block">
                {euro(purchase.price)}
              </span>
            )}
            <button
              onClick={() => remove(purchase.id)}
              title="Eintrag löschen"
              className="grid size-6 shrink-0 place-items-center rounded-md text-faint opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {open ? (
        <div className="mt-2 space-y-2 rounded-lg border border-line bg-raised p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted">Datum</span>
              <input
                type="date"
                value={date}
                max={today()}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted">Packungen</span>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={packs}
                onChange={(event) => setPacks(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted">Preis (optional)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            <input
              type="checkbox"
              checked={addToStock}
              onChange={(event) => setAddToStock(event.target.checked)}
              className="size-3.5 accent-[var(--brand)]"
            />
            auch zum aktuellen Bestand hinzufügen
            {!isToday && addToStock && " (rückwirkend)"}
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button variant="primary" onClick={submit}>
              Eintragen
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={openForm}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-[12px] font-medium text-muted transition hover:border-brand hover:text-brand"
        >
          <Plus size={14} /> Kauf eintragen
        </button>
      )}

      {supply.effective_days_per_pack !== null && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-faint">
          <History size={12} />
          {supply.rhythm_source === "history"
            ? `Gemessen: eine Packung hält im Schnitt ${Math.round(
                supply.effective_days_per_pack,
              )} Tage, üblich sind ${supply.avg_purchase_packs?.toFixed(1).replace(/\.0$/, "")} Packungen pro Kauf.`
            : "Geschätzt, solange die Kaufhistorie noch dünn ist."}
        </p>
      )}
    </section>
  );
}
