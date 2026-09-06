import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Moon,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  ShoppingCart,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { useTheme } from "../lib/theme";

const GROUPS = [
  {
    label: null,
    items: [{ to: "/", label: "Übersicht", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Geld",
    items: [
      { to: "/ausgaben", label: "Ausgaben", icon: Receipt },
      { to: "/pockets", label: "Pockets", icon: Wallet },
    ],
  },
  {
    label: "Haushalt",
    items: [
      { to: "/vorrat", label: "Vorrat", icon: Package },
      { to: "/einkaufsliste", label: "Einkaufsliste", icon: ShoppingCart },
      { to: "/abos", label: "Abos", icon: RefreshCw },
    ],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, toggle } = useTheme();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-line bg-surface transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-2.5 px-4">
          <div
            className="grid size-7 place-items-center rounded-lg text-[15px] font-bold text-white"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            H
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold leading-tight">Haushalt</div>
            <div className="truncate text-[11px] text-faint">Pockets &amp; Vorrat</div>
          </div>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-md text-muted hover:bg-line-soft md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-2">
          {GROUPS.map((group, index) => (
            <div key={index}>
              {group.label && (
                <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={"end" in item ? item.end : false}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                        isActive
                          ? "bg-brand-soft text-brand"
                          : "text-muted hover:bg-line-soft hover:text-ink"
                      }`
                    }
                  >
                    <item.icon size={16} strokeWidth={2} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-line p-2">
          <NavLink
            to="/einstellungen"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                isActive
                  ? "bg-brand-soft text-brand"
                  : "text-muted hover:bg-line-soft hover:text-ink"
              }`
            }
          >
            <Settings size={16} />
            Einstellungen
          </NavLink>
          <button
            onClick={toggle}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted transition hover:bg-line-soft hover:text-ink"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Heller Modus" : "Dunkler Modus"}
          </button>
        </div>
      </aside>
    </>
  );
}
