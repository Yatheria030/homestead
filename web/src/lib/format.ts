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

/** Rhythmus in der Einheit, in der man ihn auch denkt: Tage, Wochen, Monate. */
export function everyLabel(days: number | null | undefined) {
  if (!days) return "–";
  if (days === 7) return "jede Woche";
  if (days === 30 || days === 31) return "jeden Monat";
  if (days < 14) return `alle ${days} Tage`;
  if (days % 7 === 0 && days < 70) return `alle ${days / 7} Wochen`;
  if (days % 30 === 0) return `alle ${days / 30} Monate`;
  if (days >= 60) {
    const months = Math.round(days / 30.4);
    return `alle ~${months} Monate`;
  }
  const weeks = Math.round(days / 7);
  return `alle ~${weeks} Wochen`;
}

/** Menge und Rhythmus in einem Satz: "2 Packungen alle 6 Wochen". */
export function rhythmLabel(packsPerPurchase: number, intervalDays: number | null | undefined) {
  if (!intervalDays) return "Rhythmus fehlt";
  const amount =
    packsPerPurchase === 1
      ? "1 Packung"
      : `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(
          packsPerPurchase,
        )} Packungen`;
  return `${amount} ${everyLabel(intervalDays)}`;
}

/** Countdown bis zum nächsten Einkauf. */
export function untilPurchase(days: number | null | undefined) {
  if (days === null || days === undefined) return "–";
  if (days < 0) return `seit ${Math.abs(days)} Tagen fällig`;
  if (days === 0) return "heute kaufen";
  if (days === 1) return "morgen kaufen";
  if (days < 14) return `in ${days} Tagen`;
  if (days < 70) return `in ${Math.round(days / 7)} Wochen`;
  return `in ${Math.round(days / 30.4)} Monaten`;
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
  empty: { label: "überfällig", color: "rose", short: "überfällig" },
  order: { label: "jetzt kaufen", color: "orange", short: "kaufen" },
  check: { label: "nachzählen", color: "sky", short: "zählen" },
  soon: { label: "bald dran", color: "amber", short: "bald" },
  ok: { label: "im Plan", color: "emerald", short: "ok" },
  unknown: { label: "noch kein Rhythmus", color: "slate", short: "offen" },
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
