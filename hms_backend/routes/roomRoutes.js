const express = require('express');
const router = express.Router();
const {
  getRooms,
  getAvailableRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  allocateRoom,
  transferStudent,
  setMaintenance,
  deallocateRoom,
} = require('../controllers/RoomController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// specific routes before /:id
router.get('/available', requireRole('admin', 'warden', 'student'), getAvailableRooms);
router.post('/allocate', requireRole('admin', 'warden'), allocateRoom);
router.post('/deallocate', requireRole('admin', 'warden'), deallocateRoom);
router.put('/transfer', requireRole('admin', 'warden'), transferStudent);

router.get('/', requireRole('admin', 'warden'), getRooms);
router.get('/:id', requireRole('admin', 'warden'), getRoomById);
router.post('/', requireRole('admin'), createRoom);
router.put('/:id', requireRole('admin'), updateRoom);
router.delete('/:id', requireRole('admin'), deleteRoom);
router.put('/:id/maintenance', requireRole('admin'), setMaintenance);

module.exports = router;