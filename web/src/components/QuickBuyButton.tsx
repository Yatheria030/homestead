import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { Supply } from "../types";

/**
 * "Gekauft"-Knopf mit editierbarer Menge - Klick auf die Zahl macht sie zum
 * Eingabefeld (wie beim Umbenennen), der Rest bleibt der schnelle Ein-Klick-Weg
 * für den Normalfall. Kein Umweg über den Drawer nötig, wenn mal eine andere
 * Menge als die übliche gekauft wurde.
 */
export function QuickBuyButton({
  supply,
  onBuy,
  className = "",
}: {
  supply: Supply;
  onBuy: (packs: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(supply.suggested_packs));

  useEffect(() => {
    if (!editing) setDraft(String(supply.suggested_packs));
  }, [supply.suggested_packs, editing]);

  const confirm = () => {
    const parsed = Number(draft.replace(",", "."));
    setEditing(false);
    onBuy(parsed > 0 ? parsed : supply.suggested_packs);
  };

  return (
    <div
      className={`inline-flex h-7 shrink-0 items-center overflow-hidden rounded-md border border-line text-[12px] font-medium text-muted transition hover:border-emerald-500/40 ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      {editing ? (
        <input
          autoFocus
          type="number"
          step="0.5"
          min="0.5"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (event.key === "Enter") confirm();
            if (event.key === "Escape") {
              setDraft(String(supply.suggested_packs));
              setEditing(false);
            }
          }}
          onBlur={() => setEditing(false)}
          className="h-full w-11 bg-raised pl-2 text-right tabular-nums outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          title="Menge ändern"
          className="h-full pl-2 pr-1 tabular-nums decoration-dotted hover:bg-line-soft hover:underline"
        >
          {supply.suggested_packs}×
        </button>
      )}
      <button
        onClick={confirm}
        className="flex h-full items-center gap-1 pl-1 pr-2 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
      >
        <Check size={13} /> gekauft
      </button>
    </div>
  );
}
