export default function KpiCard({ label, value, hint, tone = 'default' }) {
  const toneClasses =
    tone === 'brand'
      ? 'text-brand-600'
      : tone === 'ochre'
        ? 'text-ochre-600'
        : tone === 'danger'
          ? 'text-danger-500'
          : 'text-ink';

  return (
    <div className="rounded-md2 border border-border bg-white p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${toneClasses}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
