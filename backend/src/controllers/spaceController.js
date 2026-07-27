const asyncHandler = require('express-async-handler');
const Space = require('../models/Space');
const { SPACE_TYPES } = require('../models/Space');
const Reservation = require('../models/Reservation');
const { BLOCKING_STATUSES } = require('../models/Reservation');

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validateSpacePayload(body, { partial = false } = {}) {
  const errors = [];
  const { name, type, location, capacity, openTime, closeTime } = body;

  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) errors.push('name es obligatorio');
  }
  if (!partial || type !== undefined) {
    if (!SPACE_TYPES.includes(type)) errors.push(`type debe ser uno de: ${SPACE_TYPES.join(', ')}`); 
  }
  if (!partial || location !== undefined) {
    if (typeof location !== 'string' || !location.trim()) errors.push('location es obligatorio');
  }
  if (!partial || capacity !== undefined) {
    if (!Number.isFinite(Number(capacity)) || Number(capacity) <= 0) errors.push('capacity debe ser un número mayor que cero');
  }
  if (!partial || openTime !== undefined) {
    if (!TIME_REGEX.test(openTime || '')) errors.push('openTime debe tener formato HH:mm');
  }
  if (!partial || closeTime !== undefined) {
    if (!TIME_REGEX.test(closeTime || '')) errors.push('closeTime debe tener formato HH:mm');
  }
  if (openTime && closeTime && TIME_REGEX.test(openTime) && TIME_REGEX.test(closeTime) && openTime >= closeTime) {
    errors.push('openTime debe ser anterior a closeTime');
  }

  return errors;
}

/**
 * GET /api/spaces
 * Disponible para admin y operator. Soporta ?includeInactive=true (solo admin lo necesita realmente,
 * pero se deja disponible para ambos ya que es solo lectura).
 */
const listSpaces = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.includeInactive !== 'true') {
    filter.isActive = true;
  }
  if (req.query.type && SPACE_TYPES.includes(req.query.type)) {
    filter.type = req.query.type;
  }

  const spaces = await Space.find(filter).sort({ name: 1 }).lean();
  return res.status(200).json({ items: spaces, total: spaces.length });
});

const getSpace = asyncHandler(async (req, res) => {
  const space = await Space.findById(req.params.id).lean();
  if (!space) return res.status(404).json({ message: 'Espacio no encontrado' });
  return res.status(200).json({ item: space });
});

/**
 * POST /api/spaces — solo admin
 */
const createSpace = asyncHandler(async (req, res) => {
  const errors = validateSpacePayload(req.body);
  if (errors.length) return res.status(422).json({ message: 'Error de validación', errors });

  const space = await Space.create({
    name: req.body.name.trim(),
    type: req.body.type,
    location: req.body.location.trim(),
    capacity: Number(req.body.capacity),
    openTime: req.body.openTime,
    closeTime: req.body.closeTime,
    isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
  });

  return res.status(201).json({ item: space });
});

/**
 * PUT /api/spaces/:id — solo admin
 */
const updateSpace = asyncHandler(async (req, res) => {
  const space = await Space.findById(req.params.id);
  if (!space) return res.status(404).json({ message: 'Espacio no encontrado' });

  const errors = validateSpacePayload(req.body, { partial: true });
  if (errors.length) return res.status(422).json({ message: 'Error de validación', errors });

  const fields = ['name', 'type', 'location', 'capacity', 'openTime', 'closeTime', 'isActive'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      space[field] = field === 'capacity' ? Number(req.body[field]) : req.body[field];
    }
  });

  await space.save();
  return res.status(200).json({ item: space });
});

/**
 * PATCH /api/spaces/:id/deactivate — solo admin
 * Decisión documentada (README > Supuestos y decisiones): al desactivar un espacio, las reservas
 * futuras ya existentes (pendientes/confirmadas) NO se cancelan automáticamente; se conservan
 * para no destruir compromisos ya adquiridos con clientes. Simplemente se bloquean nuevas reservas
 * sobre el espacio inactivo. El admin puede cancelarlas manualmente si lo requiere.
 */
const deactivateSpace = asyncHandler(async (req, res) => {
  const space = await Space.findById(req.params.id);
  if (!space) return res.status(404).json({ message: 'Espacio no encontrado' });

  space.isActive = false;
  await space.save();

  const affectedFutureReservations = await Reservation.countDocuments({
    space: space._id,
    status: { $in: BLOCKING_STATUSES },
    startAt: { $gte: new Date() },
  });

  return res.status(200).json({
    item: space,
    warning:
      affectedFutureReservations > 0
        ? `Este espacio tiene ${affectedFutureReservations} reserva(s) futuras pendientes/confirmadas. No fueron canceladas automáticamente.`
        : undefined,
  });
});

const reactivateSpace = asyncHandler(async (req, res) => {
  const space = await Space.findById(req.params.id);
  if (!space) return res.status(404).json({ message: 'Espacio no encontrado' });

  space.isActive = true;
  await space.save();
  return res.status(200).json({ item: space });
});

module.exports = {
  listSpaces,
  getSpace,
  createSpace,
  updateSpace,
  deactivateSpace,
  reactivateSpace,
};
