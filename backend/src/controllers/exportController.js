const asyncHandler = require('express-async-handler');
const Reservation = require('../models/Reservation');
const { buildReservationFilter, buildSort } = require('./reservationController');
const { utcDateToBogotaISOString } = require('../utils/dateUtils');

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  'id',
  'espacio',
  'sede',
  'inicio',
  'fin',
  'estado',
  'cliente',
  'correo',
  'asistentes',
  'usuario_creador',
  'fecha_creacion',
];

/**
 * GET /api/reservations/export?status=&spaceId=&from=&to=&search=
 * Aplica EXACTAMENTE los mismos filtros que el listado (comparte buildReservationFilter),
 * sin paginación: exporta la totalidad de resultados que coinciden con los filtros.
 */
const exportReservationsCSV = asyncHandler(async (req, res) => {
  const filter = buildReservationFilter(req.query);
  const sort = buildSort(req.query);

  const reservations = await Reservation.find(filter)
    .sort(sort)
    .populate('space', 'name location')
    .populate('createdBy', 'name email')
    .lean();

  const rows = reservations.map((r) => [
    r._id.toString(),
    r.space?.name || '',
    r.space?.location || '',
    utcDateToBogotaISOString(r.startAt),
    utcDateToBogotaISOString(r.endAt),
    r.status,
    r.clientName,
    r.clientEmail,
    r.attendeesCount,
    r.createdBy?.name || r.createdBy?.email || '',
    utcDateToBogotaISOString(r.createdAt),
  ]);

  const lines = [CSV_HEADERS.join(',')].concat(
    rows.map((row) => row.map(csvEscape).join(','))
  );
  // BOM UTF-8 para que Excel reconozca correctamente los acentos
  const csvContent = '\uFEFF' + lines.join('\n');

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `reservas_atlas_spaces_${dateStamp}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csvContent);
});

module.exports = { exportReservationsCSV };
