const asyncHandler = require('express-async-handler');
const Reservation = require('../models/Reservation');
const { RESERVATION_STATUSES } = require('../models/Reservation');
const Space = require('../models/Space');
const { bogotaStringToUTCDate } = require('../utils/dateUtils');
const { validateReservationRules, BusinessRuleError } = require('../utils/reservationRules');

const SORTABLE_FIELDS = ['startAt', 'createdAt'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Construye el filtro Mongo compartido entre el listado (GET /reservations) y la
 * exportación CSV (GET /reservations/export), garantizando que ambos apliquen
 * exactamente los mismos criterios (status, spaceId, from, to, search).
 */
function buildReservationFilter(query) {
  const filter = {};

  if (query.status) {
    if (!RESERVATION_STATUSES.includes(query.status)) {
      throw new BusinessRuleError(`status inválido. Valores permitidos: ${RESERVATION_STATUSES.join(', ')}`, 422);
    }
    filter.status = query.status;
  }

  if (query.spaceId) {
    filter.space = query.spaceId;
  }

  if (query.from || query.to) {
    filter.startAt = {};
    if (query.from) {
      const fromDate = bogotaStringToUTCDate(`${query.from}T00:00`);
      if (!fromDate) throw new BusinessRuleError('from inválido, use formato YYYY-MM-DD', 422);
      filter.startAt.$gte = fromDate;
    }
    if (query.to) {
      const toDate = bogotaStringToUTCDate(`${query.to}T23:59`);
      if (!toDate) throw new BusinessRuleError('to inválido, use formato YYYY-MM-DD', 422);
      filter.startAt.$lte = toDate;
    }
  }

  if (query.search) {
    const safe = String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (safe) {
      const regex = new RegExp(safe, 'i');
      filter.$or = [{ title: regex }, { clientName: regex }, { clientEmail: regex }];
    }
  }

  return filter;
}

function buildSort(query) {
  const sortBy = SORTABLE_FIELDS.includes(query.sortBy) ? query.sortBy : 'startAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  return { [sortBy]: sortOrder };
}

/**
 * GET /api/reservations?page=&limit=&status=&spaceId=&from=&to=&search=&sortBy=&sortOrder=
 */
const listReservations = asyncHandler(async (req, res) => {
  const filter = buildReservationFilter(req.query);
  const sort = buildSort(req.query);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Reservation.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('space', 'name location type')
      .populate('createdBy', 'name email')
      .lean(),
    Reservation.countDocuments(filter),
  ]);

  return res.status(200).json({
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  });
});

const getReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id)
    .populate('space', 'name location type capacity openTime closeTime')
    .populate('createdBy', 'name email');
  if (!reservation) return res.status(404).json({ message: 'Reserva no encontrada' });
  return res.status(200).json({ item: reservation });
});

function validateBasicPayload(body) {
  const errors = [];
  if (!body.spaceId) errors.push('spaceId es obligatorio');
  if (typeof body.title !== 'string' || !body.title.trim()) errors.push('title es obligatorio');
  if (typeof body.clientName !== 'string' || !body.clientName.trim()) errors.push('clientName es obligatorio');
  if (typeof body.clientEmail !== 'string' || !EMAIL_REGEX.test(body.clientEmail.trim())) {
    errors.push('clientEmail debe tener formato válido');
  }
  if (!Number.isFinite(Number(body.attendeesCount)) || Number(body.attendeesCount) <= 0) {
    errors.push('attendeesCount debe ser un número mayor que cero');
  }
  if (!body.startAt) errors.push('startAt es obligatorio');
  if (!body.endAt) errors.push('endAt es obligatorio');
  return errors;
}

/**
 * POST /api/reservations
 * Body: { spaceId, title, clientName, clientEmail, attendeesCount, startAt, endAt, notes? }
 * startAt/endAt se reciben como "YYYY-MM-DDTHH:mm" en hora de Bogotá.
 */
const createReservation = asyncHandler(async (req, res) => {
  const errors = validateBasicPayload(req.body);
  if (errors.length) return res.status(422).json({ message: 'Error de validación', errors });

  const space = await Space.findById(req.body.spaceId);
  if (!space) return res.status(404).json({ message: 'Espacio no encontrado' });

  const startAt = bogotaStringToUTCDate(req.body.startAt);
  const endAt = bogotaStringToUTCDate(req.body.endAt);
  const attendeesCount = Number(req.body.attendeesCount);

  if (!startAt || !endAt) {
    return res.status(422).json({ message: 'startAt/endAt deben tener formato YYYY-MM-DDTHH:mm' });
  }

  await validateReservationRules({ space, startAt, endAt, attendeesCount });

  const reservation = await Reservation.create({
    space: space._id,
    title: req.body.title.trim(),
    clientName: req.body.clientName.trim(),
    clientEmail: req.body.clientEmail.trim().toLowerCase(),
    attendeesCount,
    startAt,
    endAt,
    notes: req.body.notes ? String(req.body.notes).trim() : '',
    status: 'pending',
    createdBy: req.user._id,
  });

  const populated = await reservation.populate('space', 'name location type');
  return res.status(201).json({ item: populated });
});

/**
 * PUT /api/reservations/:id
 * Re-valida TODAS las reglas de negocio (excluyendo la propia reserva de la comparación
 * de solapamiento), tal como exige el requerimiento.
 */
const updateReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) return res.status(404).json({ message: 'Reserva no encontrada' });

  const spaceId = req.body.spaceId || reservation.space.toString();
  const space = await Space.findById(spaceId);
  if (!space) return res.status(404).json({ message: 'Espacio no encontrado' });

  const startAt = req.body.startAt ? bogotaStringToUTCDate(req.body.startAt) : reservation.startAt;
  const endAt = req.body.endAt ? bogotaStringToUTCDate(req.body.endAt) : reservation.endAt;
  const attendeesCount = req.body.attendeesCount !== undefined ? Number(req.body.attendeesCount) : reservation.attendeesCount;

  if (!startAt || !endAt) {
    return res.status(422).json({ message: 'startAt/endAt deben tener formato YYYY-MM-DDTHH:mm' });
  }

  // Si solo se está cambiando el estado (ej. completar una reserva pasada), no exigimos
  // que la fecha de inicio sea futura, ya que la reserva pudo haberse creado legítimamente
  // y su ejecución ya haber pasado. Ver README > Supuestos y decisiones.
  const onlyStatusChange =
    req.body.startAt === undefined &&
    req.body.endAt === undefined &&
    req.body.attendeesCount === undefined &&
    req.body.spaceId === undefined;

  await validateReservationRules({
    space,
    startAt,
    endAt,
    attendeesCount,
    excludeReservationId: reservation._id,
    skipPastValidation: onlyStatusChange,
  });

  reservation.space = space._id;
  reservation.startAt = startAt;
  reservation.endAt = endAt;
  reservation.attendeesCount = attendeesCount;
  if (req.body.title !== undefined) reservation.title = String(req.body.title).trim();
  if (req.body.clientName !== undefined) reservation.clientName = String(req.body.clientName).trim();
  if (req.body.clientEmail !== undefined) reservation.clientEmail = String(req.body.clientEmail).trim().toLowerCase();
  if (req.body.notes !== undefined) reservation.notes = String(req.body.notes).trim();
  if (req.body.status !== undefined) {
    if (!RESERVATION_STATUSES.includes(req.body.status)) {
      return res.status(422).json({ message: `status inválido. Valores permitidos: ${RESERVATION_STATUSES.join(', ')}` });
    }
    reservation.status = req.body.status;
  }

  await reservation.save();
  const populated = await reservation.populate('space', 'name location type');
  return res.status(200).json({ item: populated });
});

/**
 * PATCH /api/reservations/:id/cancel
 * Cancelar es una operación frecuente y de bajo riesgo (no requiere re-validar solapamiento
 * porque libera el horario en vez de ocuparlo), se expone como acción explícita además de PUT.
 */
const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) return res.status(404).json({ message: 'Reserva no encontrada' });

  if (reservation.status === 'cancelled') {
    return res.status(200).json({ item: reservation });
  }

  reservation.status = 'cancelled';
  await reservation.save();
  return res.status(200).json({ item: reservation });
});

module.exports = {
  buildReservationFilter,
  buildSort,
  listReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
};
