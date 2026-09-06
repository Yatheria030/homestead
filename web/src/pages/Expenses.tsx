import { Fragment, useMemo, useState } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Grid, GroupRow, Td, Th } from "../components/Grid";
import { CheckCell, NumberCell, SelectCell, TextCell } from "../components/cells";
import { Button, EmptyState } from "../components/ui";
import { euro, intervalLabel, rawMonthlyShare } from "../lib/format";
import {
  useCategories,
  useExpenseActions,
  useExpenses,
  usePockets,
} from "../lib/hooks";
import type { Expense, Interval } from "../types";

type GroupBy = "none" | "pocket" | "category";

const COLUMNS = 12;

export function Expenses({ onMenu }: { onMenu: () => void }) {
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("pocket");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data: expenses = [], isLoading } = useExpenses();
  const { data: categories = [] } = useCategories();
  const { data: pockets = [] } = usePockets();
  const actions = useExpenseActions();

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return expenses;
    return expenses.filter((expense) =>
      [expense.name, expense.category?.name, expense.pocket?.name, expense.vendor]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [expenses, search]);

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, { color: string | null; rows: Expense[]; order: number }>();
    for (const row of rows) {
      const source = groupBy === "pocket" ? row.pocket : row.category;
      const key = source?.name ?? (groupBy === "pocket" ? "Ohne Pocket" : "Ohne Kategorie");
      const entry = map.get(key) ?? {
        color: source?.color ?? "slate",
        rows: [],
        order: source?.sort_order ?? 999,
      };
      entry.rows.push(row);
      map.set(key, entry);
    }
    return [...map.entries()].sort((a, b) => a[1].order - b[1].order);
  }, [rows, groupBy]);

  const totalShare = rows
    .filter((row) => row.active && (row.pocket?.counts_to_total ?? true))
    .reduce((sum, row) => sum + rawMonthlyShare(row), 0);

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
    color: c.color,
  }));
  const pocketOptions = pockets.map((p) => ({ value: p.id, label: p.name, color: p.color }));
  const intervalOptions = (["monthly", "quarterly", "yearly"] as Interval[]).map((value) => ({
    value,
    label: intervalLabel[value],
    color: "slate" as const,
  }));

  const addRow = () =>
    actions.create({
      name: "Neue Position",
      share_percent: 50,
      amount_total: 0,
      interval: "monthly",
      pocket_id: pockets[0]?.id ?? null,
      category_id: categories[0]?.id ?? null,
    });

  const renderRow = (expense: Expense, index: number) => (
    <tr
      key={expense.id}
      className={`group transition hover:bg-raised ${expense.active ? "" : "opacity-45"}`}
    >
      <Td padded className="text-center text-[12px] text-faint">
        {index + 1}
      </Td>
      <Td className="font-medium">
        <TextCell
          value={expense.name}
          onCommit={(name) => actions.update(expense.id, { name })}
        />
      </Td>
      <Td>
        <SelectCell
          value={expense.category_id}
          options={categoryOptions}
          onCommit={(category_id) => actions.update(expense.id, { category_id })}
        />
      </Td>
      <Td>
        <SelectCell
          value={expense.pocket_id}
          options={pocketOptions}
          onCommit={(pocket_id) => actions.update(expense.id, { pocket_id })}
        />
      </Td>
      <Td>
        <NumberCell
          value={expense.amount_total}
          money
          onCommit={(amount_total) =>
            actions.update(expense.id, { amount_total: amount_total ?? 0 })
          }
        />
      </Td>
      <Td>
        <NumberCell
          value={expense.share_percent}
          suffix=" %"
          step="1"
          onCommit={(share_percent) =>
            actions.update(expense.id, { share_percent: share_percent ?? 0 })
          }
        />
      </Td>
      <Td padded className="text-right font-semibold tabular-nums">
        {euro(expense.share_amount)}
      </Td>
      <Td>
        <SelectCell
          value={expense.interval}
          options={intervalOptions}
          onCommit={(interval) =>
            actions.update(expense.id, { interval: (interval ?? "monthly") as Interval })
          }
        />
      </Td>
      <Td padded className="text-right tabular-nums text-muted">
        {euro(expense.monthly_share)}
      </Td>
      <Td>
        <CheckCell
          value={expense.is_subscription}
          onCommit={(is_subscription) => actions.update(expense.id, { is_subscription })}
        />
      </Td>
      <Td>
        <TextCell
          value={expense.vendor}
          onCommit={(vendor) => actions.update(expense.id, { vendor })}
        />
      </Td>
      <Td>
        <div className="flex h-9 items-center justify-center gap-1 px-1">
          <CheckCell
            value={expense.active}
            onCommit={(active) => actions.update(expense.id, { active })}
          />
          <button
            onClick={() => actions.remove(expense.id)}
            title="Position löschen"
            className="grid size-7 place-items-center rounded-md text-faint opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </Td>
    </tr>
  );

  return (
    <>
      <PageHeader
        title="Ausgaben"
        subtitle={`${rows.length} Positionen · ${euro(totalShare)} dein Anteil pro Monat`}
        onMenu={onMenu}
        search={search}
        onSearch={setSearch}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-lg border border-line bg-raised p-0.5 sm:flex">
              <Layers size={13} className="ml-1.5 text-faint" />
              {(
                [
                  ["pocket", "Pocket"],
                  ["category", "Kategorie"],
                  ["none", "Liste"],
                ] as [GroupBy, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setGroupBy(value)}
                  className={`rounded-md px-2 py-1 text-[12px] font-medium transition ${
                    groupBy === value
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={addRow}>
              <Plus size={15} /> Position
            </Button>
          </div>
        }
      />

      <div className="p-4">
        <Grid>
          <thead>
            <tr>
              <Th width={44} align="center">
                #
              </Th>
              <Th width={220}>Position</Th>
              <Th width={150}>Kategorie</Th>
              <Th width={160}>Pocket</Th>
              <Th width={120} align="right">
                Gesamt
              </Th>
              <Th width={90} align="right">
                Anteil
              </Th>
              <Th width={120} align="right">
                Dein Anteil
              </Th>
              <Th width={130}>Intervall</Th>
              <Th width={110} align="right">
                pro Monat
              </Th>
              <Th width={60} align="center">
                Abo
              </Th>
              <Th width={130}>Anbieter</Th>
              <Th width={90} align="center">
                Aktiv
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
                    title="Keine Positionen"
                    hint="Leg oben rechts eine neue Position an."
                  />
                </td>
              </tr>
            )}

            {groups
              ? groups.map(([label, group]) => (
                  <Fragment key={label}>
                    <GroupRow
                      label={label}
                      color={group.color}
                      count={group.rows.length}
                      amount={euro(
                        group.rows
                          .filter((row) => row.active)
                          .reduce((sum, row) => sum + rawMonthlyShare(row), 0),
                      )}
                      collapsed={!!collapsed[label]}
                      onToggle={() =>
                        setCollapsed((state) => ({ ...state, [label]: !state[label] }))
                      }
                      span={COLUMNS}
                    />
                    {!collapsed[label] && group.rows.map(renderRow)}
                  </Fragment>
                ))
              : rows.map(renderRow)}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-raised">
                <td colSpan={6} className="px-2.5 py-2.5 text-[12px] font-medium text-muted">
                  Summe deiner Pocket-Überweisungen
                </td>
                <td className="px-2.5 py-2.5 text-right text-[14px] font-semibold tabular-nums">
                  {euro(totalShare)}
                </td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          )}
        </Grid>

        <p className="mt-3 text-[12px] text-faint">
          Zellen sind direkt anklickbar. Pockets ohne Häkchen „zählt zur Summe“ bleiben aus
          der Gesamtsumme raus – praktisch für Posten, die direkt untereinander laufen.
        </p>
      </div>
    </>
  );
}
