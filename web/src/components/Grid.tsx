import { useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Chip } from "./ui";

export function Grid({
  children,
  minWidth = 1180,
  fixed = false,
}: {
  children: ReactNode;
  minWidth?: number;
  /**
   * Spaltenbreiten verbindlich machen statt nur als Mindestmaß: ohne das wächst
   * die Tabelle über die angegebenen Breiten hinaus, sobald ein Zellinhalt länger
   * ist - und scrollt dann quer, obwohl die Summe der Breiten gepasst hätte.
   */
  fixed?: boolean;
}) {
  return (
    <div
      className="overflow-x-auto rounded-xl border border-line bg-surface"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <table
        className={`w-full border-collapse text-[13px] ${fixed ? "table-fixed" : ""}`}
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  width,
  align = "left",
  className = "",
  onResize,
  separator = false,
}: {
  children: ReactNode;
  width?: number;
  align?: "left" | "right" | "center";
  className?: string;
  /**
   * Excel-artige Kante am rechten Rand des Headers: ziehen, die Spalte wächst.
   * `delta` in Pixeln pro Bewegungsschritt, der Aufrufer entscheidet über die
   * Mindest-/Maximalbreite und speichert ab.
   */
  onResize?: (delta: number) => void;
  /**
   * Feine Trennlinie zwischen den Spalten einzeichnen. Standard aus – man
   * schaltet sie pro Tabelle an, sonst wirkt es auf jedem Grid gleich.
   */
  separator?: boolean;
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const separatorClass = separator ? "border-r border-line last:border-r-0" : "";
  const [grabbing, setGrabbing] = useState(false);
  // Ref statt State: mehrere Pointer-Moves pro Render sind normal, der
  // Referenzwert darf dabei nie "stecken bleiben", sonst addiert sich das
  // Ziehen auf oder springt
  const lastX = useRef(0);

  const setCursor = (x: number) => {
    document.body.style.cursor = x > 0 ? "e-resize" : x < 0 ? "w-resize" : "col-resize";
    if (x === 0) document.body.style.cursor = "";
  };
  const start = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setGrabbing(true);
    lastX.current = event.clientX;
  };
  const move = (event: React.PointerEvent) => {
    if (!grabbing) return;
    const delta = event.clientX - lastX.current;
    lastX.current = event.clientX;
    onResize?.(delta);
    setCursor(delta);
  };
  const end = (event: React.PointerEvent) => {
    if (!grabbing) return;
    setGrabbing(false);
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
    setCursor(0);
  };

  return (
    <th
      style={width ? { width, minWidth: width, position: "relative" } : undefined}
      className={`border-b border-line bg-raised px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-faint ${separatorClass} ${alignClass} ${className}`}
    >
      <div
        className={`flex items-center gap-1 ${
          align === "right" ? "flex-row-reverse" : align === "center" ? "justify-center" : ""
        }`}
      >
        {children}
      </div>
      {onResize && (
        <span
          role="separator"
          aria-orientation="vertical"
          className={`absolute -right-0.5 top-1/2 h-4 w-1.5 -translate-y-1/2 touch-none cursor-col-resize rounded-full transition ${
            grabbing ? "bg-brand" : "hover:bg-faint/40"
          }`}
          title="Ziehen, um die Spalte zu verstellen"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </th>
  );
}

export function Td({
  children,
  className = "",
  padded = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <td
      className={`border-b border-line-soft ${padded ? "px-2.5 py-2" : "p-0"} ${className}`}
    >
      {children}
    </td>
  );
}

export function GroupRow({
  label,
  color,
  count,
  amount,
  collapsed,
  onToggle,
  span,
}: {
  label: string;
  color?: string | null;
  count: number;
  amount: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  span: number;
}) {
  return (
    <tr className="bg-raised/70">
      <td colSpan={span} className="border-y border-line px-2.5 py-1.5">
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-2 text-left"
        >
          <ChevronRight
            size={14}
            className={`shrink-0 text-faint transition-transform ${collapsed ? "" : "rotate-90"}`}
          />
          <Chip label={label} color={color} />
          <span className="text-[12px] text-faint">
            {count} {count === 1 ? "Position" : "Positionen"}
          </span>
          <span className="text-[13px] font-semibold tabular-nums">{amount}</span>
          <span className="text-[12px] text-faint">/ Monat</span>
        </button>
      </td>
    </tr>
  );
}
