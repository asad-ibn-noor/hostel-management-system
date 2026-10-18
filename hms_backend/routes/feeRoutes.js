const express = require('express');
const router = express.Router();
// Import the new delete function alongside the others
const { createFeeStructure, getFeeStructures, deleteFeeStructure } = require('../controllers/FeeStructureController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All fee routes require authentication
router.use(verifyToken);

// Fee Structure Routes (Admin only)
router.post('/structures', requireRole('admin'), createFeeStructure);
router.get('/structures', requireRole('admin', 'warden'), getFeeStructures);
// Add the delete route here
router.delete('/structures/:id', requireRole('admin'), deleteFeeStructure);

module.exports = router;