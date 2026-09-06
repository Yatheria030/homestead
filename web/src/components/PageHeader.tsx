import type { ReactNode } from "react";
import { Menu, Search } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  onMenu,
  search,
  onSearch,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  onMenu: () => void;
  search?: string;
  onSearch?: (value: string) => void;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur">
      <button
        onClick={onMenu}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-line-soft md:hidden"
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-[12px] text-muted">{subtitle}</p>}
      </div>

      {onSearch && (
        <div className="relative hidden sm:block">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Suchen…"
            className="h-8 w-48 rounded-lg border border-line bg-raised pl-8 pr-2.5 text-[13px] outline-none transition focus:w-60 focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20"
          />
        </div>
      )}

      {actions}
    </header>
  );
}
