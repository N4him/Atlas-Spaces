const express = require('express');
const {
  listReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
} = require('../controllers/reservationController');
const { requireAuth } = require('../middleware/auth');
const { exportReservationsCSV } = require('../controllers/exportController');

const router = express.Router();

// Admin y operator pueden crear/gestionar reservas por igual (ver contexto del negocio).
router.use(requireAuth);

router.get('/', listReservations);
// IMPORTANTE: la ruta /export debe declararse antes de /:id, de lo contrario Express
// interpretaría "export" como un :id y el request nunca llegaría al controlador correcto.
router.get('/export', exportReservationsCSV);
router.get('/:id', getReservation);
router.post('/', createReservation);
router.put('/:id', updateReservation);
router.patch('/:id/cancel', cancelReservation);

module.exports = router;
