// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const {
  getOccupancyStats,
  getPaymentStats,
  getVisitorStats,
  exportReport
} = require('../controllers/DashboardController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Protect all dashboard routes (Admin or Warden access)
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/occupancy', getOccupancyStats);
router.get('/payments', getPaymentStats);
router.get('/visitors', getVisitorStats);
router.get('/export', exportReport);

module.exports = router;