const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    db: dbState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
