// routes/visitorRoutes.js
const express = require('express');
const router = express.Router();
const {
  logEntry,
  logExit,
  getActiveVisitors,
  getVisitorHistory
} = require('../controllers/VisitorController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('admin', 'warden')); // Staff members only

// CRITICAL: Keep '/active' BEFORE ':/id' routes
router.get('/active', getActiveVisitors);

router.post('/', logEntry);
router.get('/', getVisitorHistory);
router.put('/:id/checkout', logExit);

module.exports = router;