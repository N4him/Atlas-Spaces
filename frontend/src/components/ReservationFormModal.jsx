import React, { useEffect, useState } from 'react';
import { isoToDatetimeLocalInput } from '../utils/dateUtils';

const emptyForm = {
  spaceId: '',
  title: '',
  clientName: '',
  clientEmail: '',
  attendeesCount: 1,
  startAt: '',
  endAt: '',
  notes: '',
};

export default function ReservationFormModal({
  open,
  spaces,
  initialData,
  onSubmit,
  onClose,
  submitting,
  serverError,
}) {
  const [form, setForm] = useState(emptyForm);
  const [localErrors, setLocalErrors] = useState([]);

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? {
              spaceId: initialData.space?._id || initialData.space,
              title: initialData.title,
              clientName: initialData.clientName,
              clientEmail: initialData.clientEmail,
              attendeesCount: initialData.attendeesCount,
              startAt: isoToDatetimeLocalInput(initialData.startAt),
              endAt: isoToDatetimeLocalInput(initialData.endAt),
              notes: initialData.notes || '',
            }
          : { ...emptyForm, spaceId: spaces[0]?._id || '' }
      );
      setLocalErrors([]);
    }
  }, [open, initialData, spaces]);

  if (!open) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate() {
    const errors = [];
    if (!form.spaceId) errors.push('Selecciona un espacio');
    if (!form.title.trim()) errors.push('El título/motivo es obligatorio');
    if (!form.clientName.trim()) errors.push('El nombre del cliente es obligatorio');
    if (!EMAIL_REGEX.test(form.clientEmail.trim())) errors.push('El correo del cliente no es válido');
    if (!form.attendeesCount || Number(form.attendeesCount) <= 0) errors.push('Los asistentes deben ser mayor que cero');
    if (!form.startAt) errors.push('La fecha/hora de inicio es obligatoria');
    if (!form.endAt) errors.push('La fecha/hora de finalización es obligatoria');
    if (form.startAt && form.endAt && form.startAt >= form.endAt) {
      errors.push('El inicio debe ser anterior a la finalización');
    }
    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setLocalErrors(errors);
    if (errors.length) return;
    onSubmit({ ...form, attendeesCount: Number(form.attendeesCount) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-md2 bg-white p-6 shadow-card">
        <h3 className="font-display text-lg font-semibold text-ink">
          {initialData ? 'Editar reserva' : 'Nueva reserva'}
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Espacio</label>
            <select
              value={form.spaceId}
              onChange={(e) => update('spaceId', e.target.value)}
              className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Selecciona un espacio
              </option>
              {spaces.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} · {s.location} (cap. {s.capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Título / motivo</label>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              placeholder="Ej. Reunión de planeación"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Nombre del cliente</label>
              <input
                value={form.clientName}
                onChange={(e) => update('clientName', e.target.value)}
                className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Correo del cliente</label>
              <input
                type="email"
                value={form.clientEmail}
                onChange={(e) => update('clientEmail', e.target.value)}
                className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Asistentes</label>
              <input
                type="number"
                min="1"
                value={form.attendeesCount}
                onChange={(e) => update('attendeesCount', e.target.value)}
                className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Inicio</label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => update('startAt', e.target.value)}
                className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Fin</label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => update('endAt', e.target.value)}
                className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              className="focus-ring w-full rounded-md2 border border-border px-3 py-2 text-sm"
              placeholder="Ej. Requiere proyector"
            />
          </div>

          {(localErrors.length > 0 || serverError) && (
            <div className="rounded-md2 bg-danger-50 px-3 py-2 text-sm text-danger-600">
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
