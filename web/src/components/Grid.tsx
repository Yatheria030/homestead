import type { ReactNode } from "react";
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
}: {
  children: ReactNode;
  width?: number;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      style={width ? { width, minWidth: width } : undefined}
      className={`border-b border-line bg-raised px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-faint ${alignClass} ${className}`}
    >
      {children}
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
