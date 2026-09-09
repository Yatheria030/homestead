import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { Pockets } from "./pages/Pockets";
import { Supplies } from "./pages/Supplies";
import { ShoppingList } from "./pages/ShoppingList";
import { Scan } from "./pages/Scan";
import { Subscriptions } from "./pages/Subscriptions";
import { SettingsPage } from "./pages/Settings";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = () => setMenuOpen(true);

  return (
    <div className="flex h-full">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-canvas">
        <Routes>
          <Route path="/" element={<Dashboard onMenu={openMenu} />} />
          <Route path="/ausgaben" element={<Expenses onMenu={openMenu} />} />
          <Route path="/pockets" element={<Pockets onMenu={openMenu} />} />
          <Route path="/vorrat" element={<Supplies onMenu={openMenu} />} />
          <Route path="/einkaufsliste" element={<ShoppingList onMenu={openMenu} />} />
          <Route path="/scan" element={<Scan onMenu={openMenu} />} />
          <Route path="/abos" element={<Subscriptions onMenu={openMenu} />} />
          <Route path="/einstellungen" element={<SettingsPage onMenu={openMenu} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
