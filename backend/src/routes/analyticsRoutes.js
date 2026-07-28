const express = require('express');
const {
  getSummary,
  getReservationsByDay,
  getStatusDistribution,
  getSpaceUsage,
} = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/summary', getSummary);
router.get('/reservations-by-day', getReservationsByDay);
router.get('/status-distribution', getStatusDistribution);
router.get('/space-usage', getSpaceUsage);

module.exports = router;
