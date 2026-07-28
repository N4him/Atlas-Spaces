import { useRef } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';

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
  const cancelButtonRef = useRef(null);
  const titleId = 'confirm-dialog-title';
  const descriptionId = 'confirm-dialog-description';

  // Foco inicial en "Cancelar" (la acción no destructiva) al abrir; Escape y trampa de
  // foco (Tab/Shift+Tab) se manejan en el hook compartido useModalA11y.
  const dialogRef = useModalA11y({ open, onClose: onCancel, initialFocusRef: cancelButtonRef });

  if (!open) return null;

  const toneClasses =
    tone === 'danger'
      ? 'bg-danger-500 hover:bg-danger-600 focus:ring-danger-400'
      : 'bg-brand-500 hover:bg-brand-600 focus:ring-brand-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-sm rounded-md2 bg-white p-6 shadow-card"
      >
        <h3 id={titleId} className="font-display text-lg font-semibold text-ink">
          {title}
        </h3>
        {description && (
          <p id={descriptionId} className="mt-2 text-sm text-ink-soft">
            {description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={loading}
            className="focus-ring rounded-md2 border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-sunken disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            className={`focus-ring rounded-md2 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${toneClasses}`}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
