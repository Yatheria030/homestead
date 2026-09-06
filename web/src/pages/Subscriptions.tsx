import { useMemo } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card, Chip, EmptyState, StatCard } from "../components/ui";
import { dateLabel, euro, everyLabel, intervalLabel } from "../lib/format";
import { useExpenses, useSupplies } from "../lib/hooks";

interface Row {
  id: string;
  name: string;
  vendor: string | null;
  rhythm: string;
  price: number | null;
  monthly: number | null;
  source: "Ausgabe" | "Vorrat";
  url: string | null;
  /* nur bei Vorratsartikeln */
  coverage: number | null;
  savings: number | null;
  nextDelivery: string | null;
}

export function Subscriptions({ onMenu }: { onMenu: () => void }) {
  const { data: expenses = [] } = useExpenses();
  const { data: supplies = [] } = useSupplies();

  const rows = useMemo<Row[]>(() => {
    const fromExpenses: Row[] = expenses
      .filter((expense) => expense.is_subscription && expense.active)
      .map((expense) => ({
        id: `e${expense.id}`,
        name: expense.name,
        vendor: expense.vendor,
        rhythm: intervalLabel[expense.interval],
        price: expense.amount_total,
        monthly: expense.monthly_total,
        source: "Ausgabe",
        url: expense.url,
        coverage: null,
        savings: null,
        nextDelivery: null,
      }));

    const fromSupplies: Row[] = supplies
      .filter((supply) => supply.is_subscription && supply.active)
      .map((supply) => ({
        id: `s${supply.id}`,
        name: supply.name,
        vendor: supply.vendor,
        rhythm: everyLabel(supply.subscription_interval_days ?? supply.days_per_pack),
        price: supply.price,
        monthly: supply.subscription_monthly ?? supply.monthly_cost,
        source: "Vorrat",
        url: supply.url,
        coverage: supply.subscription_coverage,
        savings: supply.yearly_savings,
        nextDelivery: supply.next_delivery,
      }));

    return [...fromExpenses, ...fromSupplies].sort(
      (a, b) => (b.monthly ?? 0) - (a.monthly ?? 0),
    );
  }, [expenses, supplies]);

  const monthly = rows.reduce((sum, row) => sum + (row.monthly ?? 0), 0);
  const savings = rows.reduce((sum, row) => sum + (row.savings ?? 0), 0);

  const byVendor = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = row.vendor ?? "Ohne Anbieter";
      map.set(key, (map.get(key) ?? 0) + (row.monthly ?? 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Abos"
        subtitle="Alles, was automatisch wiederkommt – aus Ausgaben und Vorrat"
        onMenu={onMenu}
      />

      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Pro Monat"
            value={euro(monthly)}
            hint={`${rows.length} Abos`}
            icon={<RefreshCw size={17} />}
            accent="teal"
          />
          <StatCard
            label="Pro Jahr"
            value={euro(monthly * 12)}
            hint={savings > 0 ? `spart ${euro(savings)} gegenüber Normalpreis` : undefined}
            accent="indigo"
          />
          <StatCard
            label="Anbieter"
            value={byVendor.length}
            hint={byVendor
              .slice(0, 3)
              .map(([name]) => name)
              .join(", ")}
            accent="violet"
          />
        </div>

        <Card padded={false}>
          <div className="px-4 py-3">
            <h2 className="text-[14px] font-semibold">Laufende Abos</h2>
            <p className="text-[12px] text-muted">
              Häkchen „Abo“ in Ausgaben oder Vorrat setzen, dann tauchen sie hier auf.
            </p>
          </div>
          <div className="overflow-x-auto border-t border-line">
            {rows.length === 0 ? (
              <EmptyState title="Keine Abos markiert" />
            ) : (
              <table className="w-full border-collapse text-[13px]" style={{ minWidth: 1040 }}>
                <thead>
                  <tr className="bg-raised text-[11px] uppercase tracking-wider text-faint">
                    <th className="px-4 py-2 text-left font-semibold">Abo</th>
                    <th className="px-4 py-2 text-left font-semibold">Anbieter</th>
                    <th className="px-4 py-2 text-left font-semibold">Rhythmus</th>
                    <th className="px-4 py-2 text-left font-semibold">Nächste Lieferung</th>
                    <th className="px-4 py-2 text-left font-semibold">Deckt Verbrauch</th>
                    <th className="px-4 py-2 text-right font-semibold">Spart / Jahr</th>
                    <th className="px-4 py-2 text-right font-semibold">Preis</th>
                    <th className="px-4 py-2 text-right font-semibold">pro Monat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-line-soft hover:bg-raised">
                      <td className="px-4 py-2.5 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          {row.name}
                          {row.url && (
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-faint hover:text-brand"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{row.vendor ?? "–"}</td>
                      <td className="px-4 py-2.5 text-muted">{row.rhythm}</td>
                      <td className="px-4 py-2.5 text-muted">
                        {row.nextDelivery ? dateLabel(row.nextDelivery) : "–"}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.coverage === null ? (
                          <span className="text-faint">–</span>
                        ) : (
                          <Chip
                            label={`${Math.round(row.coverage * 100)} %`}
                            color={
                              row.coverage < 0.95
                                ? "amber"
                                : row.coverage > 1.15
                                  ? "sky"
                                  : "emerald"
                            }
                          />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {row.savings === null ? (
                          <span className="text-faint">–</span>
                        ) : (
                          euro(row.savings)
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {euro(row.price)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                        {euro(row.monthly)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-raised">
                    <td colSpan={7} className="px-4 py-2.5 text-[12px] font-medium text-muted">
                      Summe
                    </td>
                    <td className="px-4 py-2.5 text-right text-[14px] font-semibold tabular-nums">
                      {euro(monthly)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
