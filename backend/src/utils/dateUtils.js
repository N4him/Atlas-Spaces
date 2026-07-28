/**
 * Manejo de zona horaria para Atlas Spaces.
 *
 * Decisión documentada (ver README > Supuestos y decisiones):
 * - Colombia (America/Bogota) usa UTC-5 todo el año, sin horario de verano.
 *   Por lo tanto el offset es fijo y no requiere una librería de timezones (ej. Luxon/IANA tz data).
 * - Todas las fechas se almacenan en MongoDB en UTC (comportamiento nativo de `Date`).
 * - El frontend siempre trabaja y muestra horas en America/Bogota (UTC-5).
 * - Los inputs `datetime-local` del frontend se interpretan como hora de Bogotá y se
 *   convierten a UTC antes de enviarse/guardarse. Al leer, se convierten de vuelta.
 */

const BOGOTA_OFFSET_HOURS = -5;
const BOGOTA_OFFSET_MS = BOGOTA_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Convierte un string "YYYY-MM-DDTHH:mm" (interpretado como hora de Bogotá) a un objeto Date en UTC.
 */
function bogotaStringToUTCDate(value) {
  if (!value) return null;
  const naive = new Date(value.endsWith('Z') ? value : `${value}:00.000Z`);
  if (Number.isNaN(naive.getTime())) return null;
  // naive fue parseado como si "value" ya fuera UTC; le restamos el offset de Bogotá
  // para obtener el instante UTC real que corresponde a esa hora local de Bogotá.
  return new Date(naive.getTime() - BOGOTA_OFFSET_MS);
}

/**
 * Convierte un Date (UTC, tal como se guarda en Mongo) a un string ISO en hora de Bogotá,
 * útil para mostrar en el frontend o exportar en CSV.
 */
function utcDateToBogotaISOString(date) {
  if (!date) return null;
  const bogotaTime = new Date(date.getTime() + BOGOTA_OFFSET_MS);
  return bogotaTime.toISOString().replace('Z', '-05:00');
}

/**
 * Extrae solo la hora (HH:mm) en Bogotá de un Date UTC, útil para validar horario de apertura/cierre.
 */
function utcDateToBogotaHHmm(date) {
  const bogotaTime = new Date(date.getTime() + BOGOTA_OFFSET_MS);
  const hh = String(bogotaTime.getUTCHours()).padStart(2, '0');
  const mm = String(bogotaTime.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Devuelve el instante actual en UTC (equivalente a "ahora" de Bogotá expresado en UTC).
 */
function nowUTC() {
  return new Date();
}

module.exports = {
  BOGOTA_OFFSET_HOURS,
  bogotaStringToUTCDate,
  utcDateToBogotaISOString,
  utcDateToBogotaHHmm,
  nowUTC,
};
