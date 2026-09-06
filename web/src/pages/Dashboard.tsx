import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ArrowRight, Check, Package, RefreshCw, Users, Wallet } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card, Chip, EmptyState, StatCard } from "../components/ui";
import { SUPPLY_STATUS, colorOf, coverageLabel, euro } from "../lib/format";
import { useSummary, useSupplies, useSupplyActions } from "../lib/hooks";

export function Dashboard({ onMenu }: { onMenu: () => void }) {
  const { data: summary, isLoading } = useSummary();
  const { data: supplies = [] } = useSupplies();
  const { restock } = useSupplyActions();

  const upcoming = [...supplies]
    .filter((supply) => supply.active && supply.days_left !== null && supply.status !== "ok")
    .sort((a, b) => (a.days_left ?? 0) - (b.days_left ?? 0))
    .slice(0, 6);

  const counted = summary?.pockets.filter((pocket) => pocket.counts_to_total) ?? [];
  const excludedPockets = summary?.pockets.filter((pocket) => !pocket.counts_to_total) ?? [];
  const maxPocket = Math.max(...counted.map((pocket) => pocket.amount), 1);
  const maxCategory = Math.max(...(summary?.categories.map((c) => c.amount) ?? [1]), 1);

  return (
    <>
      <PageHeader
        title="Übersicht"
        subtitle="Was diesen Monat auf die Pockets geht und was im Haus fehlt"
        onMenu={onMenu}
      />

      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Auf Pockets"
            value={euro(summary?.total_transferred ?? 0)}
            hint="dein Anteil pro Monat"
            icon={<Wallet size={17} />}
            accent="indigo"
          />
          <StatCard
            label="Haushalt gesamt"
            value={euro(summary?.total_household ?? 0)}
            hint={`${summary?.expense_count ?? 0} Positionen, beide zusammen`}
            icon={<Users size={17} />}
            accent="violet"
          />
          <StatCard
            label="Abos"
            value={euro(summary?.subscription_monthly ?? 0)}
            hint={
              summary?.subscription_savings_yearly
                ? `${summary.subscription_count} Abos · spart ${euro(
                    summary.subscription_savings_yearly,
                  )} im Jahr`
                : `${summary?.subscription_count ?? 0} laufende Abos`
            }
            icon={<RefreshCw size={17} />}
            accent="teal"
          />
          <StatCard
            label="Vorrat"
            value={summary?.supplies_order ? `${summary.supplies_order} bestellen` : "alles da"}
            hint={`${summary?.supplies_soon ?? 0} werden knapp · ${euro(
              summary?.supplies_monthly ?? 0,
            )} pro Monat`}
            icon={<Package size={17} />}
            accent={summary?.supplies_order ? "orange" : "emerald"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold">Pocket-Verteilung</h2>
                <p className="text-[12px] text-muted">Dein Anteil, aufgeteilt auf die Töpfe</p>
              </div>
              <Link
                to="/pockets"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline"
              >
                Details <ArrowRight size={13} />
              </Link>
            </div>

            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative size-44 shrink-0">
                <PieChart width={176} height={176}>
                  <Pie
                    data={counted}
                    dataKey="amount"
                    nameKey="name"
                    cx={84}
                    cy={84}
                    innerRadius={56}
                    outerRadius={86}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {counted.map((pocket) => (
                      <Cell key={pocket.name} fill={colorOf(pocket.color)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [euro(value), name]}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                      background: "var(--surface)",
                      fontSize: 12,
                      color: "var(--ink)",
                    }}
                  />
                </PieChart>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-wide text-faint">gesamt</div>
                    <div className="text-[17px] font-semibold tabular-nums">
                      {euro(summary?.total_transferred ?? 0, 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full flex-1 space-y-2.5">
                {isLoading && <p className="text-[13px] text-muted">Lädt…</p>}
                {counted.map((pocket) => (
                  <div key={pocket.name}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="truncate font-medium">{pocket.name}</span>
                      <span className="shrink-0 tabular-nums">{euro(pocket.amount)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(pocket.amount / maxPocket) * 100}%`,
                          background: colorOf(pocket.color),
                        }}
                      />
                    </div>
                  </div>
                ))}
                {excludedPockets.map((pocket) => (
                  <div
                    key={pocket.name}
                    className="flex items-center justify-between gap-2 border-t border-line-soft pt-2 text-[12px] text-muted"
                  >
                    <span className="flex items-center gap-1.5">
                      <Chip label={pocket.name} color={pocket.color} />
                      zählt nicht in die Summe
                    </span>
                    <span className="tabular-nums">{euro(pocket.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-[14px] font-semibold">Nach Kategorie</h2>
            <p className="mb-4 text-[12px] text-muted">Woher die Beträge kommen</p>
            <div className="space-y-3">
              {summary?.categories.map((category) => (
                <div key={category.name}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate">{category.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {euro(category.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(category.amount / maxCategory) * 100}%`,
                        background: colorOf(category.color),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card padded={false}>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h2 className="text-[14px] font-semibold">Geht zur Neige</h2>
              <p className="text-[12px] text-muted">Nach Restreichweite sortiert</p>
            </div>
            <Link
              to="/einkaufsliste"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline"
            >
              Einkaufsliste <ArrowRight size={13} />
            </Link>
          </div>
          <div className="border-t border-line">
            {upcoming.length === 0 && (
              <EmptyState title="Alles versorgt" hint="Kein Artikel wird in nächster Zeit knapp." />
            )}
            {upcoming.map((supply) => (
              <div
                key={supply.id}
                className="flex items-center gap-3 border-b border-line-soft px-4 py-2.5 last:border-0 hover:bg-raised"
              >
                <span
                  className="dot size-2 shrink-0 rounded-full"
                  style={{ ["--chip" as string]: colorOf(SUPPLY_STATUS[supply.status].color) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{supply.name}</div>
                  <div className="truncate text-[12px] text-muted">
                    {supply.supply_list?.name ?? "Ohne Liste"}
                    {supply.vendor ? ` · ${supply.vendor}` : ""}
                  </div>
                </div>
                {supply.is_subscription && <Chip label="Abo" color="teal" dot={false} />}
                <span className="hidden w-40 shrink-0 text-right text-[12px] text-muted sm:block">
                  {coverageLabel(supply.days_left)}
                </span>
                <button
                  onClick={() => restock(supply.id, Math.max(1, supply.suggested_packs))}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-line px-2 text-[12px] font-medium text-muted transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <Check size={13} /> {Math.max(1, supply.suggested_packs)}× gekauft
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
