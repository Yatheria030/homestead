import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, ShoppingCart, Store } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card, Chip, EmptyState, StatCard } from "../components/ui";
import { SUPPLY_STATUS, colorOf, coverageLabel, euro } from "../lib/format";
import { useShoppingList, useSupplyActions } from "../lib/hooks";

export function ShoppingList({ onMenu }: { onMenu: () => void }) {
  const { data: groups = [], isLoading } = useShoppingList();
  const actions = useSupplyActions();
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const itemCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  const text = useMemo(
    () =>
      groups
        .map((group) =>
          [
            group.vendor,
            ...group.items.map((item) => `  ${item.packs}× ${item.name}${
              item.pack_label ? ` (${item.pack_label})` : ""
            }`),
          ].join("\n"),
        )
        .join("\n\n"),
    [groups],
  );

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  /** Abhaken bucht den Kauf: Packungen wandern in den Bestand. */
  const check = (supplyId: number, packs: number) => {
    setDone((state) => ({ ...state, [supplyId]: true }));
    actions.restock(supplyId, packs);
  };

  return (
    <>
      <PageHeader
        title="Einkaufsliste"
        subtitle="Was jetzt nachbestellt werden sollte – nach Anbieter gebündelt"
        onMenu={onMenu}
        actions={
          <button
            onClick={copy}
            disabled={itemCount === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium transition hover:bg-raised disabled:opacity-50"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? "Kopiert" : "Liste kopieren"}
          </button>
        }
      />

      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Zu bestellen"
            value={itemCount}
            hint={itemCount === 1 ? "Artikel" : "Artikel"}
            icon={<ShoppingCart size={17} />}
            accent="orange"
          />
          <StatCard label="Summe" value={euro(total)} hint="bei den hinterlegten Preisen" accent="indigo" />
          <StatCard
            label="Anbieter"
            value={groups.length}
            hint={groups.map((group) => group.vendor).slice(0, 3).join(", ")}
            icon={<Store size={17} />}
            accent="violet"
          />
        </div>

        {isLoading && (
          <Card>
            <EmptyState title="Lädt…" />
          </Card>
        )}

        {!isLoading && groups.length === 0 && (
          <Card>
            <EmptyState
              title="Nichts zu bestellen"
              hint="Alle Artikel liegen über ihrem Nachbestellpunkt."
            />
          </Card>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.vendor} padded={false} className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Store size={15} className="text-faint" />
                  <h2 className="text-[14px] font-semibold">{group.vendor}</h2>
                  <span className="text-[12px] text-faint">
                    {group.items.length} {group.items.length === 1 ? "Artikel" : "Artikel"}
                  </span>
                </div>
                <span className="text-[14px] font-semibold tabular-nums">
                  {euro(group.total)}
                </span>
              </div>

              <div className="border-t border-line">
                {group.items.map((item) => {
                  const checked = done[item.supply_id];
                  return (
                    <div
                      key={item.supply_id}
                      className={`flex items-center gap-3 border-b border-line-soft px-4 py-2.5 last:border-0 transition ${
                        checked ? "opacity-40" : "hover:bg-raised"
                      }`}
                    >
                      <button
                        onClick={() => check(item.supply_id, item.packs)}
                        disabled={checked}
                        title="Gekauft – bucht die Menge in den Bestand"
                        className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${
                          checked
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-line hover:border-emerald-500 hover:bg-emerald-500/10"
                        }`}
                      >
                        {checked && <Check size={13} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`truncate text-[13px] font-medium ${
                              checked ? "line-through" : ""
                            }`}
                          >
                            {item.packs}× {item.name}
                          </span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-faint hover:text-brand"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        <div className="truncate text-[12px] text-muted">
                          {[item.pack_label, item.list_name].filter(Boolean).join(" · ")}
                        </div>
                      </div>

                      <div className="hidden shrink-0 text-right sm:block">
                        <div
                          className="text-[12px] font-medium"
                          style={{ color: colorOf(SUPPLY_STATUS[item.status].color) }}
                        >
                          {coverageLabel(item.days_left)}
                        </div>
                        <div className="text-[12px] tabular-nums text-faint">
                          {euro(item.total)}
                        </div>
                      </div>

                      {item.is_subscription && <Chip label="Abo" color="teal" dot={false} />}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {itemCount > 0 && (
          <p className="text-[12px] text-faint">
            Die Mengen ergeben sich aus der Zielreichweite je Artikel. Abhaken bucht den Kauf
            direkt in den Bestand – der Artikel verschwindet dann aus der Liste.
          </p>
        )}
      </div>
    </>
  );
}
