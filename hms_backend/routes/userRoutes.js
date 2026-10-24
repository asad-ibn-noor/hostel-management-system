const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createWarden,
  getPendingStudents,
  approveStudent,
  rejectStudent,
  deleteWarden,
} = require('../controllers/UserController');

// All routes here require authentication
router.use(verifyToken);

// Admin-only endpoint
router.post('/warden', requireRole('admin'), createWarden);

// Delete Warden (Admin only)
router.delete('/warden/:id', requireRole('admin'), deleteWarden);

// Admin & Warden endpoints
router.get('/pending', requireRole('admin', 'warden'), getPendingStudents);
router.patch('/:userId/approve', requireRole('admin', 'warden'), approveStudent);
router.delete('/:userId/reject', requireRole('admin', 'warden'), rejectStudent);

module.exports = router;