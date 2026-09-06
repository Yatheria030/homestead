export const euro = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined
    ? "–"
    : new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);

export const num = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "–"
    : new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value);

export const dateLabel = (iso: string | null | undefined) =>
  !iso ? "–" : new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(iso));

export const intervalLabel: Record<string, string> = {
  monthly: "monatlich",
  quarterly: "quartalsweise",
  yearly: "jährlich",
};

/** "alle 45 Tage" bzw. grobe Monatsangabe, wenn es sich rund rechnet */
export function everyLabel(days: number | null | undefined) {
  if (!days) return "–";
  if (days % 30 === 0 && days >= 30) {
    const months = days / 30;
    return months === 1 ? "monatlich" : `alle ${months} Monate`;
  }
  if (days === 7) return "wöchentlich";
  if (days === 14) return "alle 2 Wochen";
  return `alle ${days} Tage`;
}

export function daysLabel(days: number | null | undefined) {
  if (days === null || days === undefined) return "–";
  if (days === 0) return "heute fällig";
  if (days < 0) return `${Math.abs(days)} Tage überfällig`;
  if (days === 1) return "morgen";
  return `in ${days} Tagen`;
}

export const PALETTE: Record<string, string> = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  fuchsia: "#c026d3",
  rose: "#f43f5e",
  orange: "#f97316",
  amber: "#f59e0b",
  lime: "#84cc16",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  slate: "#64748b",
};

export const PALETTE_NAMES = Object.keys(PALETTE);

export const colorOf = (name: string | null | undefined) =>
  PALETTE[name ?? "slate"] ?? PALETTE.slate;

export const INTERVAL_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/** Ungerundeter Monatsanteil - Summen erst am Ende runden, wie in der Excel. */
export const rawMonthlyShare = (expense: {
  amount_total: number;
  share_percent: number;
  interval: string;
}) =>
  (expense.amount_total * expense.share_percent) / 100 / (INTERVAL_MONTHS[expense.interval] ?? 1);

export const SUPPLY_STATUS: Record<
  string,
  { label: string; color: string; short: string }
> = {
  empty: { label: "leer", color: "rose", short: "leer" },
  order: { label: "bestellen", color: "orange", short: "bestellen" },
  soon: { label: "wird knapp", color: "amber", short: "knapp" },
  ok: { label: "genug da", color: "emerald", short: "ok" },
  unknown: { label: "kein Verbrauch hinterlegt", color: "slate", short: "offen" },
};

/** "reicht noch 28 Tage" – die Kernaussage jeder Zeile im Vorrat. */
export function coverageLabel(days: number | null | undefined) {
  if (days === null || days === undefined) return "Verbrauch fehlt";
  if (days <= 0) return "aufgebraucht";
  if (days === 1) return "reicht noch 1 Tag";
  if (days < 70) return `reicht noch ${days} Tage`;
  const months = Math.round(days / 30.4);
  return `reicht noch ~${months} Monate`;
}

/** Bestand in Packungen, ohne unnötige Nachkommastellen. */
export const packs = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "–"
    : `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} ${
        Math.abs(value) === 1 ? "Packung" : "Packungen"
      }`;

export const unitPrice = (value: number | null | undefined, unit: string | null) =>
  value === null || value === undefined
    ? null
    : `${new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: value < 0.1 ? 3 : 2,
      }).format(value)}${unit ? ` / ${unit}` : ""}`;
