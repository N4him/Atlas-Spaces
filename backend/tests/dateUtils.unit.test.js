const {
  bogotaStringToUTCDate,
  utcDateToBogotaHHmm,
  utcDateToBogotaISOString,
} = require('../src/utils/dateUtils');

describe('dateUtils (America/Bogota, UTC-5 fijo)', () => {
  test('bogotaStringToUTCDate convierte 09:00 Bogotá a 14:00 UTC', () => {
    const date = bogotaStringToUTCDate('2026-08-10T09:00');
    expect(date.toISOString()).toBe('2026-08-10T14:00:00.000Z');
  });

  test('utcDateToBogotaHHmm convierte de vuelta correctamente', () => {
    const utcDate = new Date('2026-08-10T14:00:00.000Z');
    expect(utcDateToBogotaHHmm(utcDate)).toBe('09:00');
  });

  test('round-trip: string Bogotá -> UTC -> HH:mm Bogotá conserva la hora original', () => {
    const original = '2026-01-15T16:45';
    const utc = bogotaStringToUTCDate(original);
    const hhmm = utcDateToBogotaHHmm(utc);
    expect(hhmm).toBe('16:45');
  });

  test('utcDateToBogotaISOString incluye el offset -05:00', () => {
    const utcDate = new Date('2026-08-10T14:00:00.000Z');
    const result = utcDateToBogotaISOString(utcDate);
    expect(result).toMatch(/-05:00$/);
    expect(result).toMatch(/^2026-08-10T09:00:00/);
  });

  test('devuelve null para valores vacíos o inválidos', () => {
    expect(bogotaStringToUTCDate('')).toBeNull();
    expect(bogotaStringToUTCDate(undefined)).toBeNull();
  });
});
