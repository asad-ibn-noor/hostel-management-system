const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  registerStudent,
  getAllStudents,
  searchStudents,
  getStudentById,
  updateStudent,
  checkoutStudent
} = require('../controllers/StudentController');

// Public endpoint (Registration)
router.post('/', registerStudent);

// Protected endpoints
router.use(verifyToken);

// Read operations (Admin, Warden)
router.get('/', requireRole('admin', 'warden'), getAllStudents);
router.get('/search', requireRole('admin', 'warden'), searchStudents);
router.get('/:id', requireRole('admin', 'warden'), getStudentById);

// Update and Action operations (Admin, Warden)
router.put('/:id', requireRole('admin', 'warden'), updateStudent);
router.put('/:id/checkout', requireRole('admin', 'warden'), checkoutStudent);

module.exports = router;