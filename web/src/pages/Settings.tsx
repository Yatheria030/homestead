import { useState } from "react";
import { Check, Database, Plus, Trash2 } from "lucide-react";
import { Backups } from "../components/Backups";
import { PageHeader } from "../components/PageHeader";
import { Button, Card, Chip, inputClass } from "../components/ui";
import { PALETTE, PALETTE_NAMES, colorOf } from "../lib/format";
import { useCategories, useMasterActions, usePockets } from "../lib/hooks";

function ColorPicker({
  value,
  onPick,
}: {
  value: string;
  onPick: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((state) => !state)}
        className="size-5 rounded-md ring-1 ring-line transition hover:scale-110"
        style={{ background: colorOf(value) }}
        title="Farbe ändern"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-20 grid w-40 grid-cols-6 gap-1.5 rounded-lg border border-line bg-surface p-2 shadow-xl">
            {PALETTE_NAMES.map((name) => (
              <button
                key={name}
                onClick={() => {
                  onPick(name);
                  setOpen(false);
                }}
                className="grid size-5 place-items-center rounded-md transition hover:scale-110"
                style={{ background: PALETTE[name] }}
              >
                {value === name && <Check size={12} className="text-white" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function SettingsPage({ onMenu }: { onMenu: () => void }) {
  const { data: pockets = [] } = usePockets();
  const { data: categories = [] } = useCategories();
  const actions = useMasterActions();
  const [newPocket, setNewPocket] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const addPocket = () => {
    if (!newPocket.trim()) return;
    actions.createPocket({
      name: newPocket.trim(),
      color: PALETTE_NAMES[pockets.length % PALETTE_NAMES.length],
      sort_order: (pockets.length + 1) * 10,
    });
    setNewPocket("");
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    actions.createCategory({
      name: newCategory.trim(),
      color: PALETTE_NAMES[categories.length % PALETTE_NAMES.length],
      sort_order: (categories.length + 1) * 10,
    });
    setNewCategory("");
  };

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Pockets, Kategorien und Daten" onMenu={onMenu} />

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <Card padded={false}>
          <div className="px-4 py-3">
            <h2 className="text-[14px] font-semibold">Pockets</h2>
            <p className="text-[12px] text-muted">
              Töpfe, auf die überwiesen wird. Ohne Häkchen zählt ein Pocket nicht in die
              Gesamtsumme – für Posten, die direkt untereinander laufen.
            </p>
          </div>
          <div className="border-t border-line">
            {pockets.map((pocket) => (
              <div
                key={pocket.id}
                className="group flex items-center gap-3 border-b border-line-soft px-4 py-2.5 last:border-0"
              >
                <ColorPicker
                  value={pocket.color}
                  onPick={(color) => actions.updatePocket(pocket.id, { ...pocket, color })}
                />
                <input
                  defaultValue={pocket.name}
                  onBlur={(event) =>
                    event.target.value !== pocket.name &&
                    actions.updatePocket(pocket.id, { ...pocket, name: event.target.value })
                  }
                  className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-[13px] font-medium outline-none transition hover:bg-line-soft focus:bg-raised focus:ring-2 focus:ring-brand/25"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted">
                  <input
                    type="checkbox"
                    checked={pocket.counts_to_total}
                    onChange={(event) =>
                      actions.updatePocket(pocket.id, {
                        ...pocket,
                        counts_to_total: event.target.checked,
                      })
                    }
                    className="size-3.5 accent-[var(--brand)]"
                  />
                  zählt zur Summe
                </label>
                <button
                  onClick={() => actions.deletePocket(pocket.id)}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-faint opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-line px-4 py-3">
            <input
              value={newPocket}
              onChange={(event) => setNewPocket(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addPocket()}
              placeholder="Neues Pocket…"
              className={inputClass}
            />
            <Button variant="primary" onClick={addPocket}>
              <Plus size={15} />
            </Button>
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-4 py-3">
            <h2 className="text-[14px] font-semibold">Kategorien</h2>
            <p className="text-[12px] text-muted">
              Wofür das Geld ausgegeben wird – rein zur Auswertung.
            </p>
          </div>
          <div className="border-t border-line">
            {categories.map((category) => (
              <div
                key={category.id}
                className="group flex items-center gap-3 border-b border-line-soft px-4 py-2.5 last:border-0"
              >
                <ColorPicker
                  value={category.color}
                  onPick={(color) => actions.updateCategory(category.id, { ...category, color })}
                />
                <input
                  defaultValue={category.name}
                  onBlur={(event) =>
                    event.target.value !== category.name &&
                    actions.updateCategory(category.id, {
                      ...category,
                      name: event.target.value,
                    })
                  }
                  className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-[13px] font-medium outline-none transition hover:bg-line-soft focus:bg-raised focus:ring-2 focus:ring-brand/25"
                />
                <Chip label={category.color} color={category.color} dot={false} />
                <button
                  onClick={() => actions.deleteCategory(category.id)}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-faint opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-line px-4 py-3">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addCategory()}
              placeholder="Neue Kategorie…"
              className={inputClass}
            />
            <Button variant="primary" onClick={addCategory}>
              <Plus size={15} />
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Backups />
        </div>

        <Card className="lg:col-span-2">
          <div className="flex items-start gap-3">
            <div
              className="chip grid size-9 shrink-0 place-items-center rounded-lg"
              style={{ ["--chip" as string]: colorOf("sky") }}
            >
              <Database size={17} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold">Wo die Daten liegen</h2>
              <p className="mt-1 text-[13px] text-muted">
                Alles steckt in einer SQLite-Datei unter <code>./data/haushalt.db</code> neben
                der docker-compose.yml, die Snapshots daneben in <code>./data/backups/</code>.
              </p>
              <p className="mt-2 text-[13px] text-muted">
                Die API ist unter{" "}
                <a href="/api/docs" target="_blank" rel="noreferrer" className="text-brand hover:underline">
                  /api/docs
                </a>{" "}
                dokumentiert – praktisch, falls später etwas anderes darauf zugreifen soll.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
