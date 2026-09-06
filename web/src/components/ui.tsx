import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { colorOf } from "../lib/format";

export function Chip({
  label,
  color,
  dot = true,
  className = "",
}: {
  label: ReactNode;
  color?: string | null;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`chip inline-flex max-w-full items-center gap-1.5 truncate rounded-md px-2 py-0.5 text-[12px] font-medium ${className}`}
      style={{ ["--chip" as string]: colorOf(color) }}
    >
      {dot && <span className="dot size-1.5 shrink-0 rounded-full" />}
      <span className="truncate">{label}</span>
    </span>
  );
}

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface ${padded ? "p-4" : ""} ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "ghost",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "subtle";
}) {
  const styles = {
    primary:
      "bg-brand text-white hover:brightness-110 border border-transparent shadow-sm",
    ghost:
      "border border-line bg-surface hover:bg-raised text-ink",
    subtle:
      "border border-transparent hover:bg-line-soft text-muted hover:text-ink",
    danger:
      "border border-transparent text-rose-600 hover:bg-rose-500/10 dark:text-rose-400",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "indigo",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: colorOf(accent) }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium uppercase tracking-wide text-faint">
            {label}
          </div>
          <div className="mt-1.5 truncate text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </div>
          {hint && <div className="mt-1 text-[12px] text-muted">{hint}</div>}
        </div>
        {icon && (
          <div
            className="chip grid size-9 shrink-0 place-items-center rounded-lg"
            style={{ ["--chip" as string]: colorOf(accent) }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh] backdrop-blur-sm">
      <div
        className={`rise w-full ${width} rounded-xl border border-line bg-surface shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-md text-muted transition hover:bg-line-soft hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-9 w-full rounded-lg border border-line bg-raised px-2.5 text-[13px] outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-16 text-center">
      <p className="text-[14px] font-medium text-muted">{title}</p>
      {hint && <p className="mt-1 text-[13px] text-faint">{hint}</p>}
    </div>
  );
}
