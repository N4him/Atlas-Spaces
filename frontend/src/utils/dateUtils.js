// El frontend siempre trabaja en hora de Bogotá (UTC-5 fijo, sin horario de verano).
// El backend recibe/devuelve fechas ya sea como ISO UTC (desde Mongo) o como strings
// "YYYY-MM-DDTHH:mm" que interpreta como hora de Bogotá. Aquí solo formateamos para mostrar
// y convertimos <input type="datetime-local"> (que ya está en hora local del navegador,
// asumimos coincide con Bogotá para el propósito de esta prueba) al formato que espera la API.

export function isoToDatetimeLocalInput(isoOrDate) {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  // Convertimos el instante UTC a "hora de Bogotá" (UTC-5) para poblar el input.
  const bogota = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 16);
}

export function formatDateTime(isoOrDate) {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '—';
  const bogota = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const [datePart, timePart] = bogota.toISOString().slice(0, 16).split('T');
  const [y, m, day] = datePart.split('-');
  return `${day}/${m}/${y} ${timePart}`;
}

export function formatDateShort(isoOrDate) {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '—';
  const bogota = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const [datePart] = bogota.toISOString().slice(0, 16).split('T');
  const [y, m, day] = datePart.split('-');
  return `${day}/${m}/${y}`;
}

export function todayBogotaDateStr() {
  const now = new Date();
  const bogota = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}

export function daysAgoBogotaDateStr(days) {
  const now = new Date();
  const bogota = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  bogota.setUTCDate(bogota.getUTCDate() - days);
  return bogota.toISOString().slice(0, 10);
}

export function daysAheadBogotaDateStr(days) {
  return daysAgoBogotaDateStr(-days);
}
