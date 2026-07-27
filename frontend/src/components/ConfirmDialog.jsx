export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'brand',
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

  const toneClasses =
    tone === 'danger'
      ? 'bg-danger-500 hover:bg-danger-600 focus:ring-danger-400'
      : 'bg-brand-500 hover:bg-brand-600 focus:ring-brand-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-md2 bg-white p-6 shadow-card">
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="focus-ring rounded-md2 border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-sunken disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`focus-ring rounded-md2 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${toneClasses}`}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
