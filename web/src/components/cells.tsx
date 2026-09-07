import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Plus } from "lucide-react";
import { Chip } from "./ui";
import { PALETTE_NAMES, colorOf, euro } from "../lib/format";

/** Zellen-Grundgeruest: zeigt Text an und wird beim Klick zum Eingabefeld. */
function EditableShell({
  display,
  children,
  editing,
  setEditing,
  align = "left",
}: {
  display: ReactNode;
  children: (close: () => void) => ReactNode;
  editing: boolean;
  setEditing: (value: boolean) => void;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`group/cell relative h-9 cursor-text px-2.5 ${
        align === "right" ? "text-right" : ""
      }`}
      onClick={() => !editing && setEditing(true)}
    >
      {editing ? (
        <div className="absolute inset-0 z-10 rounded-[3px] ring-2 ring-brand">
          {children(() => setEditing(false))}
        </div>
      ) : (
        <div className="flex h-full items-center truncate">
          <span className={align === "right" ? "w-full truncate" : "truncate"}>{display}</span>
        </div>
      )}
    </div>
  );
}

export function TextCell({
  value,
  onCommit,
  placeholder = "–",
  className = "",
}: {
  value: string | null;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value ?? ""), [value]);
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = (close: () => void) => {
    close();
    if (draft !== (value ?? "")) onCommit(draft);
  };

  return (
    <EditableShell
      editing={editing}
      setEditing={setEditing}
      display={
        value ? (
          <span className={className}>{value}</span>
        ) : (
          <span className="text-faint">{placeholder}</span>
        )
      }
    >
      {(close) => (
        <input
          ref={ref}
          className="cell-input h-full rounded-[3px] bg-surface px-2.5"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(close)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(close);
            if (event.key === "Escape") {
              setDraft(value ?? "");
              close();
            }
          }}
          autoFocus
        />
      )}
    </EditableShell>
  );
}

export function NumberCell({
  value,
  onCommit,
  money = false,
  suffix = "",
  step = "0.01",
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  money?: boolean;
  suffix?: string;
  step?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value === null ? "" : String(value)), [value]);
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = (close: () => void) => {
    close();
    const parsed = draft.trim() === "" ? null : Number(draft.replace(",", "."));
    if (parsed !== value && !Number.isNaN(parsed as number)) onCommit(parsed);
  };

  const display =
    value === null ? (
      <span className="text-faint">–</span>
    ) : money ? (
      euro(value)
    ) : (
      `${value}${suffix}`
    );

  return (
    <EditableShell
      editing={editing}
      setEditing={setEditing}
      align="right"
      display={<span className="tabular-nums">{display}</span>}
    >
      {(close) => (
        <input
          ref={ref}
          type="number"
          step={step}
          className="cell-input h-full rounded-[3px] bg-surface px-2.5 text-right tabular-nums"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(close)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(close);
            if (event.key === "Escape") close();
          }}
          autoFocus
        />
      )}
    </EditableShell>
  );
}

export function SelectCell<T extends string | number>({
  value,
  options,
  onCommit,
  placeholder = "–",
  display,
}: {
  value: T | null;
  options: { value: T; label: string; color?: string | null }[];
  onCommit: (value: T | null) => void;
  placeholder?: string;
  display?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const current = options.find((option) => option.value === value);

  return (
    <EditableShell
      editing={editing}
      setEditing={setEditing}
      display={
        display ??
        (current ? (
          <Chip label={current.label} color={current.color} />
        ) : (
          <span className="text-faint">{placeholder}</span>
        ))
      }
    >
      {(close) => (
        <select
          className="h-full w-full rounded-[3px] bg-surface px-2 text-[13px] outline-none"
          value={value === null ? "" : String(value)}
          onChange={(event) => {
            const raw = event.target.value;
            const next =
              raw === ""
                ? null
                : ((typeof options[0]?.value === "number" ? Number(raw) : raw) as T);
            onCommit(next);
            close();
          }}
          onBlur={close}
          autoFocus
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </EditableShell>
  );
}

export function DateCell({
  value,
  onCommit,
}: {
  value: string | null;
  onCommit: (value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const display = value
    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(value))
    : null;

  return (
    <EditableShell
      editing={editing}
      setEditing={setEditing}
      display={display ?? <span className="text-faint">–</span>}
    >
      {(close) => (
        <input
          type="date"
          className="cell-input h-full rounded-[3px] bg-surface px-2.5"
          defaultValue={value ?? ""}
          onChange={(event) => onCommit(event.target.value || null)}
          onBlur={close}
          autoFocus
        />
      )}
    </EditableShell>
  );
}

export function CheckCell({
  value,
  onCommit,
}: {
  value: boolean;
  onCommit: (value: boolean) => void;
}) {
  return (
    <div className="flex h-9 items-center justify-center px-2">
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onCommit(event.target.checked)}
        className="size-4 cursor-pointer accent-[var(--brand)]"
      />
    </div>
  );
}

/**
 * Zelle mit eigenem Drop-Down statt Browser-Select: farbig eingezaunte
 * Optionsspalte direkt im Blatt und unten ein "Neue Liste"-Eingabefeld,
 * das sofort beim Eingabe-Enter angelegt wird.
 */
export function ListCell<T extends string | number>({
  value,
  options,
  onCommit,
  onCreate,
  placeholder = "Keine Liste",
}: {
  value: T | null;
  options: { value: T; label: string; color?: string | null; icon?: string | null }[];
  onCommit: (value: T | null) => void;
  placeholder?: string;
  /** Neue Liste anlegen, liefert den neuen Id zurueck (Hook invalidiert selbst). */
  onCreate?: (body: { name: string; color: string; icon: string | null }) => Promise<T>;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("indigo");
  const [busy, setBusy] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);

  const current = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setName("");
      setIcon("");
      setRect(null);
      return;
    }
    const button = anchor.current?.querySelector("button");
    if (button) {
      const box = button.getBoundingClientRect();
      setRect({ top: box.bottom + 6, left: box.left });
    }
    const within = (target: unknown) =>
      (anchor.current?.contains(target as Node) ?? false) ||
      (menuRef.current?.contains(target as Node) ?? false);
    const outside = (event: MouseEvent) => {
      if (!within(event.target)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Scrolling der Tabelle verschob die Zelle, aber nicht das fixe Menu.
    const scroll = () => setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
    };
  }, [open]);

  useEffect(() => {
    if (creating) createRef.current?.select();
  }, [creating]);

  const choose = (id: T) => {
    setOpen(false);
    onCommit(id);
  };

  const detach = () => {
    setOpen(false);
    onCommit(null);
  };

  const createList = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const id = await onCreate?.({ name: trimmed, color, icon: icon.trim() || null });
      if (id !== undefined && id !== null) {
        setOpen(false);
        setName("");
        setIcon("");
        onCommit(id);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={anchor} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center gap-1"
        title={current?.label ?? placeholder}
      >
        {current ? (
          <span
            className="chip inline-flex min-w-0 max-w-full items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-[12px] font-medium"
            style={{ ["--chip" as string]: colorOf(current.color) }}
          >
            {current.icon != null && current.icon !== "" && (
              <span className="shrink-0">{current.icon}</span>
            )}
            <span className="truncate">{current.label}</span>
          </span>
        ) : (
          <span className="text-faint">{placeholder}</span>
        )}
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[220px] rounded-lg border border-line bg-surface p-1 shadow-lg"
            style={{ top: rect.top, left: Math.min(rect.left, window.innerWidth - 240) }}
          >
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => choose(option.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                    active ? "bg-raised" : "hover:bg-raised"
                  }`}
                >
                  <span
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[12px]"
                    style={{
                      background: `color-mix(in srgb, ${colorOf(option.color)} 12%, transparent)`,
                      color: colorOf(option.color),
                    }}
                  >
                    {option.icon ?? "•"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {active && <Check size={14} className="shrink-0 text-brand" />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={detach}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                value === null ? "bg-raised text-ink" : "text-muted hover:bg-raised hover:text-ink"
              }`}
            >
              <span className="flex size-5 shrink-0 items-center justify-center text-faint">
                <span className="text-[13px]">∅</span>
              </span>
              <span className="min-w-0 flex-1 truncate">{placeholder}</span>
              {value === null && <Check size={14} className="shrink-0 text-brand" />}
            </button>
          </div>

          {onCreate && (
            <div className="mt-1 border-t border-line-soft pt-1">
              {creating ? (
                <div className="px-1 pb-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={createRef}
                      value={icon}
                      onChange={(event) => setIcon(event.target.value)}
                      title="Emoji"
                      className="w-10 shrink-0 rounded-md border border-line bg-raised px-1.5 py-1 text-center text-[13px] outline-none"
                      maxLength={4}
                    />
                    <input
                      value={name}
                      autoFocus
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") createList();
                        if (event.key === "Escape") {
                          setCreating(false);
                          setName("");
                          setIcon("");
                        }
                      }}
                      placeholder="Name der neuen Liste…"
                      className="min-w-0 flex-1 rounded-md border border-line bg-raised px-2 py-1 text-[13px] outline-none"
                    />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 px-0.5 pb-0.5">
                    {PALETTE_NAMES.map((token) => (
                      <button
                        key={token}
                        type="button"
                        title={token}
                        onClick={() => setColor(token)}
                        className={`size-4 rounded-md ring-offset-1 transition ${
                        color === token ? "ring-2 ring-ink" : "hover:scale-110"
                        }`}
                        style={{ background: colorOf(token) }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={createList}
                      disabled={busy || !name.trim()}
                      className="ml-auto rounded-md bg-brand px-2 py-1 text-[12px] font-medium text-white transition hover:brightness-110 disabled:opacity-40"
                    >
                      {busy ? "…" : "Anlegen"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-muted transition hover:bg-raised hover:text-ink"
                >
                  <span className="flex size-5 items-center justify-center">
                    <Plus size={14} />
                  </span>
                  <span>Neue Liste aus dieser Zelle</span>
                </button>
              )}
            </div>
          )}
          </div>
          , document.body)
      }
    </div>
  );
}
