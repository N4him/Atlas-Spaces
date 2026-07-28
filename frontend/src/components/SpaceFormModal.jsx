import React, { useEffect, useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';

const SPACE_TYPE_LABELS = {
  sala_reunion: 'Sala de reunión',
  oficina_privada: 'Oficina privada',
  auditorio: 'Auditorio',
};

const emptyForm = {
  name: '',
  type: 'sala_reunion',
  location: '',
  capacity: 4,
  openTime: '08:00',
  closeTime: '18:00',
};

export default function SpaceFormModal({ open, initialData, onSubmit, onClose, submitting, serverError }) {
  const [form, setForm] = useState(emptyForm);
  const [localErrors, setLocalErrors] = useState([]);
  const titleId = 'space-form-title';
  const errorsId = 'space-form-errors';
  const dialogRef = useModalA11y({ open, onClose });

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? {
              name: initialData.name,
              type: initialData.type,
              location: initialData.location,
              capacity: initialData.capacity,
              openTime: initialData.openTime,
              closeTime: initialData.closeTime,
            }
          : emptyForm
      );
      setLocalErrors([]);
    }
  }, [open, initialData]);

  if (!open) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const errors = [];
    if (!form.name.trim()) errors.push('El nombre es obligatorio');
    if (!form.location.trim()) errors.push('La sede/ubicación es obligatoria');
    if (!form.capacity || Number(form.capacity) <= 0) errors.push('La capacidad debe ser mayor que cero');
    if (form.openTime >= form.closeTime) errors.push('La hora de apertura debe ser anterior a la de cierre');
    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setLocalErrors(errors);
    if (errors.length) return;
    onSubmit({ ...form, capacity: Number(form.capacity) });
  }

  const hasErrors = localErrors.length > 0 || serverError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-md2 bg-white p-6 shadow-card"
      >
        <h3 id={titleId} className="font-display text-lg font-semibold text-ink">
          {initialData ? 'Editar espacio' : 'Nuevo espacio'}
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate aria-describedby={hasErrors ? errorsId : undefined}>
          <div>
            <label htmlFor="space-name" className="mb-1 block text-sm font-medium text-ink">
              Nombre
            </label>
            <input
              id="space-name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              placeholder="Ej. Sala Bogotá"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="space-type" className="mb-1 block text-sm font-medium text-ink">
                Tipo
              </label>
              <select
                id="space-type"
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              >
                {Object.entries(SPACE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="space-capacity" className="mb-1 block text-sm font-medium text-ink">
                Capacidad
              </label>
              <input
                id="space-capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => update('capacity', e.target.value)}
                className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="space-location" className="mb-1 block text-sm font-medium text-ink">
              Sede / ubicación
            </label>
            <input
              id="space-location"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              placeholder="Ej. Sede Chapinero"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="space-open-time" className="mb-1 block text-sm font-medium text-ink">
                Hora de apertura
              </label>
              <input
                id="space-open-time"
                type="time"
                value={form.openTime}
                onChange={(e) => update('openTime', e.target.value)}
                className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="space-close-time" className="mb-1 block text-sm font-medium text-ink">
                Hora de cierre
              </label>
              <input
                id="space-close-time"
                type="time"
                value={form.closeTime}
                onChange={(e) => update('closeTime', e.target.value)}
                className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {hasErrors && (
            <div id={errorsId} role="alert" className="rounded-md2 bg-danger-50 px-3 py-2 text-sm text-danger-600">
              <ul className="list-inside list-disc">
                {localErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {serverError && <li>{serverError}</li>}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-md2 border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-sunken"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="focus-ring rounded-md2 bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { SPACE_TYPE_LABELS };
