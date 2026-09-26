const { sequelize, Room, Allocation, Student } = require('../models');

// --- ROOM MANAGEMENT ---

async function createRoom(req, res) {
  try {
    const { room_number, block, floor, room_type, capacity } = req.body;
    if (!room_number || !block || !floor || !room_type || !capacity) {
      return res.status(400).json({ error: 'All room fields are required.' });
    }
    const room = await Room.create({ room_number, block, floor, room_type, capacity });
    return res.status(201).json({ message: 'Room created successfully.', room });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: `Room ${req.body.room_number} already exists in Block ${req.body.block}.` });
    }
    return res.status(500).json({ error: 'Failed to create room.' });
  }
}

async function getAllRooms(req, res) {
  try {
    const rooms = await Room.findAll({
      include: [{ model: Allocation, where: { status: 'active' }, required: false, attributes: ['id'] }]
    });
    const formattedRooms = rooms.map(room => {
      const roomData = room.toJSON();
      roomData.current_occupancy = roomData.Allocations ? roomData.Allocations.length : 0;
      delete roomData.Allocations;
      return roomData;
    });
    return res.json(formattedRooms);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
}

// Admin, Warden, Student — Get only rooms with available beds
async function getAvailableRooms(req, res) {
  try {
    const rooms = await Room.findAll({
      where: { is_maintenance: false },
      include: [
        { model: Allocation, where: { status: 'active' }, required: false, attributes: ['id'] }
      ]
    });

    const availableRooms = rooms.map(room => {
      const roomData = room.toJSON();
      roomData.current_occupancy = roomData.Allocations ? roomData.Allocations.length : 0;
      delete roomData.Allocations;
      return roomData;
    }).filter(room => room.current_occupancy < room.capacity);

    return res.json(availableRooms);
  } catch (err) {
    console.error('Fetch Available Rooms Error:', err);
    return res.status(500).json({ error: 'Failed to fetch available rooms.' });
  }
}


async function getRoomById(req, res) {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [{
        model: Allocation, 
        where: { status: 'active' }, 
        required: false,
        include: [{ model: Student, attributes: ['id', 'full_name', 'student_id_no'] }]
      }]
    });
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const roomData = room.toJSON();
    roomData.current_occupancy = roomData.Allocations ? roomData.Allocations.length : 0;
    return res.json(roomData);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch room details.' });
  }
}

async function updateRoom(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    await room.update(req.body);
    return res.json({ message: 'Room updated successfully.', room });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Update failed: Block + Room Number must be unique.' });
    }
    return res.status(500).json({ error: 'Failed to update room.' });
  }
}

async function deleteRoom(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const activeAllocations = await Allocation.count({ where: { room_id: room.id, status: 'active' } });
    if (activeAllocations > 0) {
      return res.status(400).json({ error: 'Cannot delete a room with active students.' });
    }

    await room.destroy();
    return res.json({ message: 'Room deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete room.' });
  }
}

// --- ALLOCATION MANAGEMENT ---

// Admin, Warden — Allocate a student to a room
async function allocateStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { student_id } = req.body;
    const room_id = req.params.id;

    const room = await Room.findByPk(room_id, { transaction });
    if (!room || room.is_maintenance) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Room is invalid or under maintenance.' });
    }

    const currentOccupancy = await Allocation.count({ where: { room_id, status: 'active' }, transaction });
    if (currentOccupancy >= room.capacity) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Room is at full capacity.' });
    }

    const existingAllocation = await Allocation.findOne({ where: { student_id, status: 'active' }, transaction });
    if (existingAllocation) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Student is already assigned to a room.' });
    }

    const allocation = await Allocation.create({ student_id, room_id, status: 'active' }, { transaction });
    await transaction.commit();
    return res.status(201).json({ message: 'Student allocated successfully.', allocation });
  } catch (err) {
    await transaction.rollback();
    return res.status(500).json({ error: 'Failed to allocate student.' });
  }
}

// Admin, Warden — Transfer a student to a new room
async function transferStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { student_id, new_room_id, notes } = req.body;

    const currentAllocation = await Allocation.findOne({ where: { student_id, status: 'active' }, transaction });
    if (!currentAllocation) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Student does not have an active room allocation.' });
    }

    if (currentAllocation.room_id == new_room_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Student is already in this room.' });
    }

    const newRoom = await Room.findByPk(new_room_id, { transaction });
    const currentOccupancy = await Allocation.count({ where: { room_id: new_room_id, status: 'active' }, transaction });
    
    if (!newRoom || newRoom.is_maintenance || currentOccupancy >= newRoom.capacity) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Target room is invalid, under maintenance, or full.' });
    }

    await currentAllocation.update({ status: 'transferred', vacated_at: new Date(), notes }, { transaction });
    const newAllocation = await Allocation.create({ student_id, room_id: new_room_id, status: 'active' }, { transaction });

    await transaction.commit();
    return res.json({ message: 'Student transferred successfully.', allocation: newAllocation });
  } catch (err) {
    await transaction.rollback();
    return res.status(500).json({ error: 'Failed to transfer student.' });
  }
}

// Admin, Warden — Toggle room maintenance status
async function setMaintenance(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const { is_maintenance } = req.body;
    if (typeof is_maintenance !== 'boolean') {
      return res.status(400).json({ error: 'is_maintenance status must be a boolean (true/false).' });
    }

    // Prevent maintenance mode if the room is currently occupied
    if (is_maintenance) {
      const activeAllocations = await Allocation.count({ 
        where: { room_id: room.id, status: 'active' } 
      });
      if (activeAllocations > 0) {
        return res.status(400).json({ error: 'Cannot set room to maintenance while it is occupied. Transfer students first.' });
      }
    }

    await room.update({ is_maintenance });
    return res.json({ message: `Room maintenance status updated to ${is_maintenance}.`, room });
  } catch (err) {
    console.error('Maintenance Update Error:', err);
    return res.status(500).json({ error: 'Failed to update maintenance status.' });
  }
}

module.exports = {
  createRoom, getAllRooms, getAvailableRooms, getRoomById, updateRoom, deleteRoom,
  allocateStudent, transferStudent, setMaintenance
};