import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card, Chip, EmptyState } from "../components/ui";
import { colorOf, euro, rawMonthlyShare } from "../lib/format";
import { useExpenses, useSummary } from "../lib/hooks";

export function Pockets({ onMenu }: { onMenu: () => void }) {
  const { data: summary } = useSummary();
  const { data: expenses = [] } = useExpenses();
  const [copied, setCopied] = useState(false);

  const pockets = summary?.pockets ?? [];
  const counted = pockets.filter((pocket) => pocket.counts_to_total);
  const others = pockets.filter((pocket) => !pocket.counts_to_total);
  const total = summary?.total_transferred ?? 0;

  const amountByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of expenses) {
      if (expense.active) map.set(expense.name, rawMonthlyShare(expense));
    }
    return map;
  }, [expenses]);

  const copyPlan = async () => {
    const lines = counted.map((pocket) => `${pocket.name}: ${euro(pocket.amount)}`);
    lines.push(`Gesamt: ${euro(total)}`);
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <PageHeader
        title="Pockets"
        subtitle="Wie sich dein Anteil auf die Töpfe verteilt"
        onMenu={onMenu}
        actions={
          <button
            onClick={copyPlan}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium transition hover:bg-raised"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? "Kopiert" : "Plan kopieren"}
          </button>
        }
      />

      <div className="space-y-4 p-4">
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-wide text-faint">
              Summe der Überweisungen
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {euro(total)}
            </div>
            <p className="mt-1 text-[12px] text-muted">
              {counted.length} Pockets pro Monat
              {others.length > 0 &&
                ` · ${euro(summary?.excluded ?? 0)} laufen daran vorbei`}
            </p>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full sm:max-w-md">
            {counted.map((pocket) => (
              <div
                key={pocket.name}
                title={`${pocket.name}: ${euro(pocket.amount)}`}
                style={{
                  width: `${(pocket.amount / (total || 1)) * 100}%`,
                  background: colorOf(pocket.color),
                }}
              />
            ))}
          </div>
        </Card>

        {pockets.length === 0 && (
          <Card>
            <EmptyState
              title="Noch keine Pockets"
              hint="Lege unter Ausgaben Positionen an und weise ihnen ein Pocket zu."
            />
          </Card>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...counted, ...others].map((pocket) => (
            <Card key={pocket.name} padded={false} className="overflow-hidden">
              <div
                className="h-1"
                style={{ background: colorOf(pocket.color) }}
              />
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Chip label={pocket.name} color={pocket.color} />
                    <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                      {euro(pocket.amount)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[12px] tabular-nums text-faint">
                      {pocket.counts_to_total && total > 0
                        ? `${Math.round((pocket.amount / total) * 100)} %`
                        : "extern"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-line-soft pt-3">
                  {pocket.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-baseline justify-between gap-2 text-[13px]"
                    >
                      <span className="truncate text-muted">{item}</span>
                      <span className="shrink-0 tabular-nums text-faint">
                        {euro(amountByName.get(item) ?? null)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
