const STATUS_CONFIG = {
  pending: { label: 'Pendiente', className: 'bg-ochre-50 text-ochre-600 border-ochre-400/40' },
  confirmed: { label: 'Confirmado', className: 'bg-brand-50 text-brand-600 border-brand-400/40' },
  cancelled: { label: 'Cancelado', className: 'bg-danger-50 text-danger-600 border-danger-400/40' },
  completed: { label: 'Completado', className: 'bg-surface-sunken text-ink-soft border-border' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-surface-sunken text-ink-soft border-border' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {config.label}
    </span>
  );
}
