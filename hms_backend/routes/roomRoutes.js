const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getAllRooms,
  getAvailableRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  allocateStudent,
  transferStudent,
  setMaintenance
} = require('../controllers/RoomController');

// All room routes require authentication
router.use(verifyToken);

// Room Viewing
router.get('/', requireRole('admin', 'warden'), getAllRooms);
router.get('/availablerooms', requireRole('admin', 'warden', 'student'), getAvailableRooms);
router.get('/:id', requireRole('admin', 'warden'), getRoomById);

// Room CRUD (Admin only for creation/deletion)
router.post('/', requireRole('admin'), createRoom);
router.put('/:id', requireRole('admin', 'warden'), updateRoom);
router.delete('/:id', requireRole('admin'), deleteRoom);
router.patch('/:id/maintenance', requireRole('admin', 'warden'), setMaintenance);

// Allocations & Transfers
router.post('/:id/allocate', requireRole('admin', 'warden'), allocateStudent);
router.put('/transfer', requireRole('admin', 'warden'), transferStudent);

module.exports = router;