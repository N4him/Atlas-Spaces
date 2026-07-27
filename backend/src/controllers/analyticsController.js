const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const { bogotaStringToUTCDate, BOGOTA_OFFSET_HOURS } = require('../utils/dateUtils');
const { BusinessRuleError } = require('../utils/reservationRules');

function parseRange(query) {
  if (!query.from || !query.to) {
    throw new BusinessRuleError('Los parámetros from y to (YYYY-MM-DD) son obligatorios', 422);
  }
  const from = bogotaStringToUTCDate(`${query.from}T00:00`);
  const to = bogotaStringToUTCDate(`${query.to}T23:59`);
  if (!from || !to) throw new BusinessRuleError('from/to inválidos, use formato YYYY-MM-DD', 422);
  if (from > to) throw new BusinessRuleError('from debe ser anterior o igual a to', 422);
  return { from, to };
}

/**
 * GET /api/analytics/summary?from=&to=
 * Indicadores: total de reservas, confirmadas, tasa de cancelación, espacio top.
 */
const getSummary = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);
  const match = { startAt: { $gte: from, $lte: to } };

  const [statusCounts, topSpaceAgg] = await Promise.all([
    Reservation.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Reservation.aggregate([
      { $match: { ...match, status: 'confirmed' } },
      { $group: { _id: '$space', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'spaces', localField: '_id', foreignField: '_id', as: 'space' } },
      { $unwind: { path: '$space', preserveNullAndEmptyArrays: true } },
    ]),
  ]);

  const countsByStatus = statusCounts.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  const total = Object.values(countsByStatus).reduce((sum, n) => sum + n, 0);
  const confirmed = countsByStatus.confirmed || 0;
  const cancelled = countsByStatus.cancelled || 0;
  const cancellationRate = total > 0 ? Number((cancelled / total).toFixed(4)) : 0;

  const topSpace = topSpaceAgg[0]
    ? { id: topSpaceAgg[0]._id, name: topSpaceAgg[0].space?.name || 'N/A', confirmedCount: topSpaceAgg[0].count }
    : null;

  return res.status(200).json({
    range: { from: req.query.from, to: req.query.to },
    totalReservations: total,
    confirmedReservations: confirmed,
    cancellationRate,
    topSpace,
  });
});

/**
 * GET /api/analytics/reservations-by-day?from=&to=
 * Serie diaria de reservas dentro del rango, agrupada por fecha en hora de Bogotá.
 */
const getReservationsByDay = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);

  const rows = await Reservation.aggregate([
    { $match: { startAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$startAt',
            timezone: 'America/Bogota',
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return res.status(200).json({ items: rows.map((r) => ({ date: r._id, count: r.count })) });
});

/**
 * GET /api/analytics/status-distribution?from=&to=
 */
const getStatusDistribution = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);

  const rows = await Reservation.aggregate([
    { $match: { startAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  return res.status(200).json({ items: rows.map((r) => ({ status: r._id, count: r.count })) });
});

/**
 * GET /api/analytics/space-usage?from=&to=
 * Uso por espacio medido en horas confirmadas (criterio documentado en README).
 */
const getSpaceUsage = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);

  const rows = await Reservation.aggregate([
    { $match: { startAt: { $gte: from, $lte: to }, status: 'confirmed' } },
    {
      $addFields: {
        durationHours: { $divide: [{ $subtract: ['$endAt', '$startAt'] }, 1000 * 60 * 60] },
      },
    },
    {
      $group: {
        _id: '$space',
        confirmedHours: { $sum: '$durationHours' },
        confirmedCount: { $sum: 1 },
      },
    },
    { $lookup: { from: 'spaces', localField: '_id', foreignField: '_id', as: 'space' } },
    { $unwind: { path: '$space', preserveNullAndEmptyArrays: true } },
    { $sort: { confirmedHours: -1 } },
  ]);

  return res.status(200).json({
    items: rows.map((r) => ({
      spaceId: r._id,
      spaceName: r.space?.name || 'N/A',
      confirmedHours: Number(r.confirmedHours.toFixed(2)),
      confirmedCount: r.confirmedCount,
    })),
  });
});

module.exports = {
  getSummary,
  getReservationsByDay,
  getStatusDistribution,
  getSpaceUsage,
};
