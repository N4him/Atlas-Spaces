import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="font-display text-4xl font-bold text-ink">404</p>
      <p className="text-sm text-ink-soft">La página que buscas no existe.</p>
      <Link to="/" className="focus-ring mt-2 rounded-md2 bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
        Volver al inicio
      </Link>
    </div>
  );
}
