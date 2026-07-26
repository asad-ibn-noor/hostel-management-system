const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getAllRooms,
  getAvailableRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  allocateRoom,
  deallocateRoom,
} = require('../controllers/RoomController');

// All room routes require login
router.use(verifyToken);

router.get('/', requireRole('admin', 'warden'), getAllRooms);
router.get('/available', requireRole('admin', 'warden', 'student'), getAvailableRooms);
router.post('/', requireRole('admin'), createRoom);
router.put('/:id', requireRole('admin'), updateRoom);
router.delete('/:id', requireRole('admin'), deleteRoom);
router.post('/allocate', requireRole('admin', 'warden'), allocateRoom);
router.post('/deallocate', requireRole('admin', 'warden'), deallocateRoom);

module.exports = router;