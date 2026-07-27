const Reservation = require('../models/Reservation');
const { BLOCKING_STATUSES } = require('../models/Reservation');
const { utcDateToBogotaHHmm, nowUTC } = require('./dateUtils');

class BusinessRuleError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'BusinessRuleError';
    this.statusCode = statusCode;
  }
}

/**
 * Valida que el rango horario sea coherente: inicio antes que fin.
 */
function validateDateOrder(startAt, endAt) {
  if (!(startAt instanceof Date) || !(endAt instanceof Date) || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new BusinessRuleError('Fecha de inicio o finalización inválida', 422);
  }
  if (startAt >= endAt) {
    throw new BusinessRuleError('La fecha/hora de inicio debe ser anterior a la de finalización', 422);
  }
}

/**
 * Valida que la reserva no sea en el pasado (con margen de minuto para evitar falsos negativos
 * por latencia de red).
 */
function validateNotInPast(startAt) {
  const now = nowUTC();
  if (startAt.getTime() < now.getTime() - 60 * 1000) {
    throw new BusinessRuleError('No se pueden crear reservas en fechas pasadas', 422);
  }
}

/**
 * Valida que el número de asistentes sea válido y no exceda la capacidad del espacio.
 */
function validateAttendeesCapacity(attendeesCount, space) {
  if (!Number.isInteger(attendeesCount) || attendeesCount <= 0) {
    throw new BusinessRuleError('El número de asistentes debe ser mayor que cero', 422);
  }
  if (attendeesCount > space.capacity) {
    throw new BusinessRuleError(
      `El número de asistentes (${attendeesCount}) supera la capacidad del espacio (${space.capacity})`,
      422
    );
  }
}

/**
 * Valida que la reserva completa esté dentro del horario de apertura/cierre del espacio.
 * Se compara únicamente en hora de Bogotá (los horarios del espacio están definidos en esa zona).
 */
function validateWithinSpaceSchedule(startAt, endAt, space) {
  const startHHmm = utcDateToBogotaHHmm(startAt);
  const endHHmm = utcDateToBogotaHHmm(endAt);

  if (startHHmm < space.openTime || endHHmm > space.closeTime) {
    throw new BusinessRuleError(
      `La reserva debe estar dentro del horario del espacio (${space.openTime} - ${space.closeTime}, hora Bogotá)`,
      422
    );
  }
}

/**
 * Valida que el espacio esté activo.
 */
function validateSpaceActive(space) {
  if (!space.isActive) {
    throw new BusinessRuleError('El espacio está inactivo y no admite nuevas reservas', 422);
  }
}

/**
 * Verifica que no exista una reserva superpuesta (en estado pendiente o confirmado) para el
 * mismo espacio. Permite reservas consecutivas (una inicia justo cuando termina otra).
 *
 * excludeReservationId: al editar, se excluye la propia reserva de la comparación.
 */
async function assertNoOverlap({ spaceId, startAt, endAt, excludeReservationId }) {
  const query = {
    space: spaceId,
    status: { $in: BLOCKING_STATUSES },
    // Solapamiento estricto: startA < endB && endA > startB (permite consecutivas: startA === endB)
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  };

  if (excludeReservationId) {
    query._id = { $ne: excludeReservationId };
  }

  const conflict = await Reservation.findOne(query).lean();

  if (conflict) {
    throw new BusinessRuleError(
      'El espacio ya tiene una reserva pendiente o confirmada que se superpone con este horario',
      409
    );
  }
}

/**
 * Ejecuta todas las validaciones de negocio para crear o editar una reserva.
 */
async function validateReservationRules({
  space,
  startAt,
  endAt,
  attendeesCount,
  excludeReservationId,
  skipPastValidation = false,
}) {
  validateSpaceActive(space);
  validateDateOrder(startAt, endAt);
  if (!skipPastValidation) {
    validateNotInPast(startAt);
  }
  validateAttendeesCapacity(attendeesCount, space);
  validateWithinSpaceSchedule(startAt, endAt, space);
  await assertNoOverlap({ spaceId: space._id, startAt, endAt, excludeReservationId });
}

module.exports = {
  BusinessRuleError,
  validateReservationRules,
  assertNoOverlap,
  validateDateOrder,
  validateNotInPast,
  validateAttendeesCapacity,
  validateWithinSpaceSchedule,
  validateSpaceActive,
};
