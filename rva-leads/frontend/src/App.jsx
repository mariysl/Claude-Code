import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

function NavBar() {
  return (
    <header className="bg-navy text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-orange font-black text-xl tracking-tight">RVA</span>
        <span className="font-bold text-xl tracking-tight">Leads</span>
      </div>
      <nav className="flex gap-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`
          }
        >
          Settings
        </NavLink>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
