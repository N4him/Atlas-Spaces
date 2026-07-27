export default function Pagination({ page, totalPages, total, limit, onChange }) {
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-ink-soft">
      <p>
        {total === 0 ? 'Sin resultados' : `Mostrando página ${page} de ${totalPages} · ${total} resultado(s)`}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="focus-ring rounded-md2 border border-border px-3 py-1 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="focus-ring rounded-md2 border border-border px-3 py-1 disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
