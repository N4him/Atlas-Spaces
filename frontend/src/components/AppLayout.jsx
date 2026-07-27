import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/espacios', label: 'Espacios' },
  { to: '/reservas', label: 'Reservas' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-white">
        <div className="px-5 py-6">
          <p className="font-display text-lg font-bold tracking-tight text-ink">Atlas Spaces</p>
          <p className="text-xs text-ink-soft">Panel operativo · Coworking</p>
        </div>
        <div className="hour-ruler mx-5" aria-hidden="true" />

        <nav className="flex-1 px-3 py-6">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `focus-ring block rounded-md2 px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-ink-soft hover:bg-surface-sunken hover:text-ink'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border px-5 py-4">
          <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
          <p className="text-xs capitalize text-ink-soft">{user?.role === 'admin' ? 'Administrador' : 'Operador'}</p>
          <button
            onClick={logout}
            className="focus-ring mt-3 text-xs font-medium text-brand-600 hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
