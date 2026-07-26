const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  register,
  login,
  createWarden,
  getPendingStudents,
  approveStudent,
  rejectStudent,
} = require('../controllers/AuthController');

// Public
router.post('/register', register);
router.post('/login', login);

// Admin only
router.post('/create-warden', verifyToken, requireRole('admin'), createWarden);

// Admin + Warden
router.get('/pending', verifyToken, requireRole('admin', 'warden'), getPendingStudents);
router.put('/approve/:userId', verifyToken, requireRole('admin', 'warden'), approveStudent);
router.put('/reject/:userId', verifyToken, requireRole('admin', 'warden'), rejectStudent);

module.exports = router;