import React, { useCallback, useEffect, useState } from 'react';
import { reservationsApi, spacesApi } from '../api/resources';
import { LoadingState, ErrorState, EmptyState } from '../components/UiStates';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import ReservationFormModal from '../components/ReservationFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDateTime } from '../utils/dateUtils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'completed', label: 'Completado' },
];

const DEFAULT_FILTERS = {
  status: '',
  spaceId: '',
  from: '',
  to: '',
  search: '',
  sortBy: 'startAt',
  sortOrder: 'desc',
};

export default function ReservationsPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 });
  const [loadState, setLoadState] = useState('loading');
  const [spaces, setSpaces] = useState([]);
  const [exporting, setExporting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Debounce del texto de búsqueda para no disparar una petición por cada tecla.
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    spacesApi.list({ includeInactive: 'true' }).then((res) => setSpaces(res.data.items));
  }, []);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const params = { ...filters, page, limit };
      Object.keys(params).forEach((k) => {
        if (params[k] === '') delete params[k];
      });
      const res = await reservationsApi.list(params);
      setData(res.data);
      setLoadState('ready');
    } catch (err) {
      setLoadState('error');
    }
  }, [filters, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    setPage(1);
  }

  function openCreate() {
    setEditingReservation(null);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(reservation) {
    setEditingReservation(reservation);
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(form) {
    setSubmitting(true);
    setFormError('');
    try {
      if (editingReservation) {
        await reservationsApi.update(editingReservation._id, form);
      } else {
        await reservationsApi.create(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setFormError(apiErrors ? apiErrors.join(' · ') : err.response?.data?.message || 'Error al guardar la reserva');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await reservationsApi.cancel(cancelTarget._id);
      setCancelTarget(null);
      await load();
    } finally {
      setCancelling(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach((k) => {
        if (params[k] === '') delete params[k];
      });
      await reservationsApi.exportCSV(params);
    } finally {
      setExporting(false);
    }
  }

  function toggleSort(field) {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Reservas</h1>
          <p className="text-sm text-ink-soft">Crea, consulta y gestiona las reservas de los espacios.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="focus-ring flex-1 rounded-md2 border border-border bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60 sm:flex-none"
          >
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
          <button
            onClick={openCreate}
            className="focus-ring flex-1 rounded-md2 bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 sm:flex-none"
          >
            + Nueva reserva
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-md2 border border-border bg-white p-4 shadow-card sm:flex sm:flex-wrap sm:items-end">
        <div className="col-span-2 sm:min-w-[200px] sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-soft">Buscar</label>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Título, cliente o correo…"
            className="focus-ring w-full rounded-md2 border border-border px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Estado</label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="focus-ring w-full rounded-md2 border border-border px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Espacio</label>
          <select
            value={filters.spaceId}
            onChange={(e) => updateFilter('spaceId', e.target.value)}
            className="focus-ring w-full rounded-md2 border border-border px-3 py-1.5 text-sm"
          >
            <option value="">Todos los espacios</option>
            {spaces.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Desde</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter('from', e.target.value)}
            className="focus-ring w-full rounded-md2 border border-border px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Hasta</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter('to', e.target.value)}
            className="focus-ring w-full rounded-md2 border border-border px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={resetFilters}
          className="focus-ring col-span-2 rounded-md2 px-3 py-1.5 text-sm font-medium text-brand-600 hover:underline sm:col-span-1"
        >
          Limpiar filtros
        </button>
      </div>

      {loadState === 'loading' && <LoadingState label="Cargando reservas…" />}
      {loadState === 'error' && <ErrorState onRetry={load} />}

      {loadState === 'ready' && data.items.length === 0 && (
        <EmptyState
          title="No hay reservas con estos filtros"
          description="Ajusta los filtros o crea una nueva reserva."
        />
      )}

      {loadState === 'ready' && data.items.length > 0 && (
        <div className="overflow-hidden rounded-md2 border border-border bg-white shadow-card">
          {/* overflow-x-auto: en pantallas angostas, la tabla se desliza horizontalmente
              en vez de comprimir 7 columnas hasta hacerlas ilegibles o desbordar la página. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Espacio</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th
                  className="cursor-pointer select-none px-4 py-3 font-medium"
                  onClick={() => toggleSort('startAt')}
                >
                  Inicio {filters.sortBy === 'startAt' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="cursor-pointer select-none px-4 py-3 font-medium"
                  onClick={() => toggleSort('createdAt')}
                >
                  Creada {filters.sortBy === 'createdAt' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-3 font-medium text-ink">{r.title}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.space?.name}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    <div>{r.clientName}</div>
                    <div className="text-xs text-ink-soft/70">{r.clientEmail}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{formatDateTime(r.startAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => openEdit(r)}
                        className="focus-ring text-sm font-medium text-brand-600 hover:underline"
                      >
                        Editar
                      </button>
                      {r.status !== 'cancelled' && r.status !== 'completed' && (
                        <button
                          onClick={() => setCancelTarget(r)}
                          className="focus-ring text-sm font-medium text-danger-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          <Pagination
            page={data.page || page}
            totalPages={data.totalPages || 1}
            total={data.total || 0}
            limit={limit}
            onChange={setPage}
          />
        </div>
      )}

      <ReservationFormModal
        open={modalOpen}
        spaces={spaces.filter((s) => s.isActive || s._id === editingReservation?.space?._id)}
        initialData={editingReservation}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        submitting={submitting}
        serverError={formError}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancelar reserva"
        description={`¿Cancelar la reserva "${cancelTarget?.title}"? Esta acción liberará el horario para otras reservas.`}
        confirmLabel="Sí, cancelar"
        tone="danger"
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
        loading={cancelling}
      />
    </div>
  );
}
