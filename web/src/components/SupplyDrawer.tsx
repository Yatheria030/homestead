import { useEffect, useState } from "react";
import { Check, ExternalLink, Trash2, X } from "lucide-react";
import { Button, Chip, Field, inputClass } from "./ui";
import {
  SUPPLY_STATUS,
  dateLabel,
  euro,
  rhythmLabel,
  unitPrice,
  untilPurchase,
} from "../lib/format";
import { useSupplyActions, useSupplyLists } from "../lib/hooks";
import type { Supply } from "../types";

/** Dauer in der Einheit eingeben, in der man sie denkt - gespeichert wird in Tagen. */
function DurationInput({
  days,
  onCommit,
}: {
  days: number | null;
  onCommit: (days: number | null) => void;
}) {
  const guessUnit = (value: number | null) => {
    if (!value) return 7;
    if (value % 30 === 0) return 30;
    if (value % 7 === 0) return 7;
    return 1;
  };
  const [unit, setUnit] = useState(() => guessUnit(days));
  const [draft, setDraft] = useState(() => (days ? String(days / guessUnit(days)) : ""));

  useEffect(() => {
    const next = guessUnit(days);
    setUnit(next);
    setDraft(days ? String(days / next) : "");
  }, [days]);

  const commit = (value: string, factor: number) => {
    const parsed =
      value.trim() === "" ? null : Math.round(Number(value.replace(",", ".")) * factor);
    if (parsed !== days && !Number.isNaN(parsed as number)) onCommit(parsed);
  };

  return (
    <div className="flex gap-1.5">
      <input
        type="number"
        step="0.5"
        min="0"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value, unit)}
        className={inputClass}
      />
      <select
        value={unit}
        onChange={(event) => {
          const factor = Number(event.target.value);
          setUnit(factor);
          commit(draft, factor);
        }}
        className={`${inputClass} w-28`}
      >
        <option value={1}>Tage</option>
        <option value={7}>Wochen</option>
        <option value={30}>Monate</option>
      </select>
    </div>
  );
}

/** Detailansicht eines Artikels - alles, was nicht in die Zeile passt. */
export function SupplyDrawer({
  supply,
  onClose,
}: {
  supply: Supply | null;
  onClose: () => void;
}) {
  const { data: lists = [] } = useSupplyLists();
  const actions = useSupplyActions();
  const [stockDraft, setStockDraft] = useState("");

  useEffect(() => {
    setStockDraft(supply ? String(supply.stock_now) : "");
  }, [supply?.id, supply?.stock_now]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!supply) return null;

  const set = (body: Partial<Supply>) => actions.update(supply.id, body);
  const status = SUPPLY_STATUS[supply.status];
  const perUnit = unitPrice(supply.price_per_unit, supply.unit);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <input
              value={supply.name}
              onChange={(event) => set({ name: event.target.value })}
              className="w-full rounded-md bg-transparent text-[15px] font-semibold outline-none focus:bg-raised"
            />
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Chip label={status.label} color={status.color} />
              <span className="text-[12px] text-muted">
                {untilPurchase(supply.days_until_purchase)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-line-soft hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section className="grid grid-cols-2 gap-3">
            <Field label="Liste">
              <select
                value={supply.list_id ?? ""}
                onChange={(event) =>
                  set({ list_id: event.target.value ? Number(event.target.value) : null })
                }
                className={inputClass}
              >
                <option value="">Ohne Liste</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.icon ? `${list.icon} ` : ""}
                    {list.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ort">
              <input
                defaultValue={supply.location ?? ""}
                onBlur={(event) => set({ location: event.target.value || null })}
                className={inputClass}
                placeholder="z. B. Abstellraum"
              />
            </Field>
          </section>

          <section>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
              Kaufrhythmus
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Eine Packung hält">
                <DurationInput
                  days={supply.days_per_pack}
                  onCommit={(days) => set({ days_per_pack: days })}
                />
              </Field>
              <Field label="Kaufmenge" hint="Packungen je Einkauf">
                <input
                  type="number"
                  step="1"
                  min="1"
                  defaultValue={supply.packs_per_purchase}
                  onBlur={(event) =>
                    set({ packs_per_purchase: Number(event.target.value || 1) })
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-3 rounded-lg border border-line bg-raised px-3 py-2.5">
              <div className="text-[13px] font-medium">
                {rhythmLabel(supply.packs_per_purchase, supply.purchase_interval_days)}
              </div>
              <div className="mt-0.5 text-[12px] text-muted">
                Nächster Einkauf: {dateLabel(supply.buy_on)} ·{" "}
                {untilPurchase(supply.days_until_purchase)}
                {supply.runs_out_on && ` · leer am ${dateLabel(supply.runs_out_on)}`}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Vorlauf" hint="so viele Tage vor dem Leerstand kaufen">
                <input
                  type="number"
                  min="0"
                  defaultValue={supply.buffer_days}
                  onBlur={(event) => set({ buffer_days: Number(event.target.value || 0) })}
                  className={inputClass}
                />
              </Field>
              <Field label="Rest zuhause" hint="nur falls du nachgezählt hast">
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={stockDraft}
                    onChange={(event) => setStockDraft(event.target.value)}
                    className={inputClass}
                  />
                  <Button
                    onClick={() => actions.setStock(supply.id, Number(stockDraft || 0))}
                    disabled={Number(stockDraft) === supply.stock_now}
                  >
                    Setzen
                  </Button>
                </div>
              </Field>
            </div>
            <p className="mt-2 text-[12px] text-faint">
              Zuletzt gekauft: {dateLabel(supply.last_purchased)}. Beim Kauf zählt die App
              Reste mit – wenn noch etwas da war, verschiebt sich der nächste Termin.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
              Menge, Preis &amp; Bezugsquelle
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Packung">
                <input
                  defaultValue={supply.pack_size ?? ""}
                  onBlur={(event) => set({ pack_size: event.target.value || null })}
                  className={inputClass}
                  placeholder="z. B. 2x 10 l"
                />
              </Field>
              <Field label="Inhalt">
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={supply.units_per_pack ?? ""}
                    onBlur={(event) =>
                      set({
                        units_per_pack: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    className={inputClass}
                  />
                  <input
                    defaultValue={supply.unit ?? ""}
                    onBlur={(event) => set({ unit: event.target.value || null })}
                    className={`${inputClass} w-24`}
                    placeholder="l"
                  />
                </div>
              </Field>
              <Field label="Preis pro Packung">
                <input
                  type="number"
                  step="0.01"
                  defaultValue={supply.price ?? ""}
                  onBlur={(event) =>
                    set({ price: event.target.value ? Number(event.target.value) : null })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Normalpreis" hint="ohne Abo – zeigt die Ersparnis">
                <input
                  type="number"
                  step="0.01"
                  defaultValue={supply.regular_price ?? ""}
                  onBlur={(event) =>
                    set({ regular_price: event.target.value ? Number(event.target.value) : null })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Wo bestellst du es?" hint="Link zum Shop oder zum Spar-Abo">
                <div className="flex gap-1.5">
                  <input
                    defaultValue={supply.url ?? ""}
                    onBlur={(event) => set({ url: event.target.value || null })}
                    className={inputClass}
                    placeholder="https://amazon.de/…"
                  />
                  {supply.url && (
                    <a
                      href={supply.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Shop öffnen"
                      className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:border-brand hover:text-brand"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
              {perUnit && <span>{perUnit}</span>}
              {supply.monthly_cost !== null && <span>{euro(supply.monthly_cost)} / Monat</span>}
              {supply.yearly_cost !== null && <span>{euro(supply.yearly_cost)} / Jahr</span>}
              {supply.yearly_savings !== null && (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  spart {euro(supply.yearly_savings)} / Jahr
                </span>
              )}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                Abo
              </h3>
              <label className="flex items-center gap-1.5 text-[12px] text-muted">
                <input
                  type="checkbox"
                  checked={supply.is_subscription}
                  onChange={(event) => set({ is_subscription: event.target.checked })}
                  className="size-3.5 accent-[var(--brand)]"
                />
                läuft im Abo
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Anbieter">
                <input
                  defaultValue={supply.vendor ?? ""}
                  onBlur={(event) => set({ vendor: event.target.value || null })}
                  className={inputClass}
                  placeholder="Amazon Spar-Abo"
                />
              </Field>
              <Field label="Lieferung alle" hint="Tage">
                <input
                  type="number"
                  defaultValue={supply.subscription_interval_days ?? ""}
                  onBlur={(event) =>
                    set({
                      subscription_interval_days: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Menge je Lieferung" hint="Packungen">
                <input
                  type="number"
                  step="0.5"
                  defaultValue={supply.subscription_packs}
                  onBlur={(event) => set({ subscription_packs: Number(event.target.value || 1) })}
                  className={inputClass}
                />
              </Field>
              <Field label="Nächste Lieferung">
                <input
                  type="date"
                  defaultValue={supply.next_delivery ?? ""}
                  onBlur={(event) => set({ next_delivery: event.target.value || null })}
                  className={inputClass}
                />
              </Field>
            </div>
            {supply.subscription_coverage !== null && (
              <p className="mt-2 text-[12px] text-muted">
                Das Abo deckt{" "}
                <span className="font-medium text-ink">
                  {Math.round(supply.subscription_coverage * 100)} %
                </span>{" "}
                deines Verbrauchs
                {supply.subscription_coverage < 0.95 && " – du kaufst regelmäßig dazu."}
                {supply.subscription_coverage > 1.15 && " – es sammelt sich Vorrat an."}
              </p>
            )}
          </section>

          <section>
            <div>
              <Field label="Notiz">
                <textarea
                  defaultValue={supply.note ?? ""}
                  onBlur={(event) => set({ note: event.target.value || null })}
                  rows={2}
                  className={`${inputClass} h-auto py-2`}
                  placeholder="Modell, Sorte, Erfahrungen…"
                />
              </Field>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          <Button
            variant="danger"
            onClick={() => {
              actions.remove(supply.id);
              onClose();
            }}
          >
            <Trash2 size={14} /> Löschen
          </Button>
          <Button
            variant="primary"
            onClick={() => actions.restock(supply.id, supply.suggested_packs)}
          >
            <Check size={14} /> {supply.suggested_packs}× gekauft
          </Button>
        </div>
      </aside>
    </>
  );
}
