import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/espacios', label: 'Espacios' },
  { to: '/reservas', label: 'Reservas' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cierra el drawer automáticamente al navegar a otra pantalla en móvil —
  // sin esto, después de tocar "Reservas" el menú seguiría tapando la pantalla.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#main-content"
        className="focus-ring sr-only rounded-md2 bg-brand-500 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Saltar al contenido principal
      </a>

      {/* Barra superior — solo visible en móvil/tablet, con el botón de menú */}
      <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3 lg:hidden">
        <p className="font-display text-base font-bold tracking-tight text-ink">Atlas Spaces</p>
        <button
          onClick={() => setSidebarOpen(true)}
          className="focus-ring rounded-md2 border border-border p-2 text-ink"
          aria-label="Abrir menú de navegación"
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Overlay oscuro detrás del drawer en móvil — al tocarlo, se cierra el menú */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col border-r border-border bg-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-60 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex items-center justify-between px-5 py-6 lg:block">
          <div>
            <p className="font-display text-lg font-bold tracking-tight text-ink">Atlas Spaces</p>
            <p className="text-xs text-ink-soft">Panel operativo · Coworking</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="focus-ring rounded-md2 p-1 text-ink-soft lg:hidden"
            aria-label="Cerrar menú de navegación"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="hour-ruler mx-5" aria-hidden="true" />

        <nav aria-label="Navegación principal" className="flex-1 px-3 py-6">
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

      <main id="main-content" className="flex-1 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
