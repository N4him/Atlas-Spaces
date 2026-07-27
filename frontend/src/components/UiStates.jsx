export function LoadingState({ label = 'Cargando…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-soft">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message = 'Ocurrió un error al cargar la información.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md2 border border-danger-400/30 bg-danger-50 py-12 text-center">
      <p className="text-sm font-medium text-danger-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="focus-ring rounded-md2 border border-danger-400/40 bg-white px-4 py-1.5 text-sm font-medium text-danger-600 hover:bg-danger-50"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'No hay datos para mostrar', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md2 border border-dashed border-border bg-surface-sunken/50 py-14 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-soft">{description}</p>}
      {action}
    </div>
  );
}
