import { useEffect, useRef, useState, type ReactNode } from "react";
import { Chip } from "./ui";
import { euro } from "../lib/format";

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
}: {
  value: T | null;
  options: { value: T; label: string; color?: string | null }[];
  onCommit: (value: T | null) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const current = options.find((option) => option.value === value);

  return (
    <EditableShell
      editing={editing}
      setEditing={setEditing}
      display={
        current ? (
          <Chip label={current.label} color={current.color} />
        ) : (
          <span className="text-faint">{placeholder}</span>
        )
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
