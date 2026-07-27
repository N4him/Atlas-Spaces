import React, { useEffect, useState, useCallback } from 'react';
import { spacesApi } from '../api/resources';
import { useAuth } from '../hooks/useAuth';
import { LoadingState, ErrorState, EmptyState } from '../components/UiStates';
import SpaceFormModal, { SPACE_TYPE_LABELS } from '../components/SpaceFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SpacesPage() {
  const { isAdmin } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [showInactive, setShowInactive] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [toggleTarget, setToggleTarget] = useState(null); // espacio a activar/desactivar
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const res = await spacesApi.list(showInactive ? { includeInactive: 'true' } : {});
      setSpaces(res.data.items);
      setLoadState('ready');
    } catch (err) {
      setLoadState('error');
    }
  }, [showInactive]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingSpace(null);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(space) {
    setEditingSpace(space);
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(data) {
    setSubmitting(true);
    setFormError('');
    try {
      if (editingSpace) {
        await spacesApi.update(editingSpace._id, data);
      } else {
        await spacesApi.create(data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setFormError(apiErrors ? apiErrors.join(' · ') : err.response?.data?.message || 'Error al guardar el espacio');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmToggle() {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      if (toggleTarget.isActive) {
        await spacesApi.deactivate(toggleTarget._id);
      } else {
        await spacesApi.reactivate(toggleTarget._id);
      }
      setToggleTarget(null);
      await load();
    } finally {
      setToggling(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Espacios</h1>
          <p className="text-sm text-ink-soft">Salas, oficinas y auditorios disponibles para reserva.</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="focus-ring rounded-md2 bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Nuevo espacio
          </button>
        )}
      </div>

      {isAdmin && (
        <label className="mb-4 flex w-fit items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-border text-brand-500 focus:ring-brand-400"
          />
          Mostrar espacios inactivos
        </label>
      )}

      {loadState === 'loading' && <LoadingState label="Cargando espacios…" />}
      {loadState === 'error' && <ErrorState onRetry={load} />}

      {loadState === 'ready' && spaces.length === 0 && (
        <EmptyState
          title="No hay espacios registrados"
          description={isAdmin ? 'Crea el primer espacio para empezar a recibir reservas.' : 'Aún no se han configurado espacios.'}
        />
      )}

      {loadState === 'ready' && spaces.length > 0 && (
        <div className="overflow-hidden rounded-md2 border border-border bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Sede</th>
                <th className="px-4 py-3 font-medium">Capacidad</th>
                <th className="px-4 py-3 font-medium">Horario</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {spaces.map((space) => (
                <tr key={space._id} className={!space.isActive ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-ink">{space.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{SPACE_TYPE_LABELS[space.type] || space.type}</td>
                  <td className="px-4 py-3 text-ink-soft">{space.location}</td>
                  <td className="px-4 py-3 text-ink-soft">{space.capacity} personas</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                    {space.openTime} – {space.closeTime}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        space.isActive ? 'bg-brand-50 text-brand-600' : 'bg-surface-sunken text-ink-soft'
                      }`}
                    >
                      {space.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEdit(space)}
                          className="focus-ring text-sm font-medium text-brand-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setToggleTarget(space)}
                          className={`focus-ring text-sm font-medium hover:underline ${
                            space.isActive ? 'text-danger-500' : 'text-brand-600'
                          }`}
                        >
                          {space.isActive ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SpaceFormModal
        open={modalOpen}
        initialData={editingSpace}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        submitting={submitting}
        serverError={formError}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.isActive ? 'Desactivar espacio' : 'Reactivar espacio'}
        description={
          toggleTarget?.isActive
            ? `"${toggleTarget?.name}" dejará de admitir nuevas reservas. Las reservas futuras existentes no se cancelan automáticamente.`
            : `"${toggleTarget?.name}" volverá a estar disponible para nuevas reservas.`
        }
        confirmLabel={toggleTarget?.isActive ? 'Desactivar' : 'Reactivar'}
        tone={toggleTarget?.isActive ? 'danger' : 'brand'}
        onConfirm={confirmToggle}
        onCancel={() => setToggleTarget(null)}
        loading={toggling}
      />
    </div>
  );
}
