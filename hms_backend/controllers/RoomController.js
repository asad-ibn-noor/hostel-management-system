const { Room, Student } = require('../models');

// GET /api/v1/rooms — all rooms with occupancy and filters (admin/warden)
async function getRooms(req, res) {
  try {
    const { status, block, floor } = req.query;
    const where = {};
    if (status) where.status = status;
    if (block) where.block = block;
    if (floor) where.floor = floor;

    const rooms = await Room.findAll({
      where,
      include: [{
        model: Student,
        attributes: ['id', 'full_name', 'student_id_no'],
      }],
      order: [['block', 'ASC'], ['room_number', 'ASC']],
    });
    return res.json(rooms);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
}

// GET /api/v1/rooms/available — available rooms (all roles)
async function getAvailableRooms(req, res) {
  try {
    const rooms = await Room.findAll({
      where: { status: 'available' },
    });
    return res.json(rooms);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch available rooms' });
  }
}

// GET /api/v1/rooms/:id — room detail with current occupants (admin/warden)
async function getRoomById(req, res) {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [{
        model: Student,
        attributes: ['id', 'full_name', 'student_id_no', 'contact'],
      }],
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.json(room);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch room' });
  }
}

// POST /api/v1/rooms — create a room (admin only)
async function createRoom(req, res) {
  try {
    const { room_number, block, floor, capacity, room_type, monthly_fee } = req.body;

    if (!room_number || !block || !floor || !capacity || !room_type || !monthly_fee) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await Room.findOne({ where: { room_number } });
    if (existing) {
      return res.status(409).json({ error: 'Room number already exists' });
    }

    const room = await Room.create({
      room_number,
      block,
      floor,
      capacity,
      room_type,
      monthly_fee,
      status: 'available',
      current_occupancy: 0,
    });

    return res.status(201).json({ message: 'Room created', room });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create room' });
  }
}

// PUT /api/v1/rooms/:id — update room metadata (admin only)
async function updateRoom(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const { block, floor, capacity, room_type, monthly_fee } = req.body;
    await room.update({ block, floor, capacity, room_type, monthly_fee });

    return res.json({ message: 'Room updated', room });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update room' });
  }
}

// DELETE /api/v1/rooms/:id — soft delete if unoccupied (admin only)
async function deleteRoom(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.current_occupancy > 0) {
      return res.status(400).json({ error: 'Cannot delete a room with occupants' });
    }

    await room.destroy();
    return res.json({ message: 'Room deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete room' });
  }
}

// POST /api/v1/rooms/allocate — assign student to room (admin/warden)
async function allocateRoom(req, res) {
  try {
    const { student_id, room_id } = req.body;

    if (!student_id || !room_id) {
      return res.status(400).json({ error: 'student_id and room_id are required' });
    }

    const student = await Student.findByPk(student_id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (student.room_id) return res.status(400).json({ error: 'Student is already allocated a room' });

    const room = await Room.findByPk(room_id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status === 'maintenance') return res.status(400).json({ error: 'Room is under maintenance' });
    if (room.current_occupancy >= room.capacity) return res.status(400).json({ error: 'Room is at full capacity' });

    const new_occupancy = room.current_occupancy + 1;
    const new_status = new_occupancy >= room.capacity ? 'full' : 'available';

    await student.update({ room_id: room.id });
    await room.update({ current_occupancy: new_occupancy, status: new_status });

    return res.json({
      message: `Room ${room.room_number} allocated to ${student.full_name}`,
      room_number: room.room_number,
      student: student.full_name,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Room allocation failed' });
  }
}

// PUT /api/v1/rooms/transfer — move student between rooms (admin/warden)
async function transferStudent(req, res) {
  try {
    const { student_id, new_room_id } = req.body;

    if (!student_id || !new_room_id) {
      return res.status(400).json({ error: 'student_id and new_room_id are required' });
    }

    const student = await Student.findByPk(student_id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.room_id) return res.status(400).json({ error: 'Student has no current room to transfer from' });
    if (student.room_id === parseInt(new_room_id)) return res.status(400).json({ error: 'Student is already in this room' });

    const newRoom = await Room.findByPk(new_room_id);
    if (!newRoom) return res.status(404).json({ error: 'New room not found' });
    if (newRoom.status === 'maintenance') return res.status(400).json({ error: 'New room is under maintenance' });
    if (newRoom.current_occupancy >= newRoom.capacity) return res.status(400).json({ error: 'New room is at full capacity' });

    // Free old room
    const oldRoom = await Room.findByPk(student.room_id);
    const old_occupancy = Math.max(0, oldRoom.current_occupancy - 1);
    await oldRoom.update({
      current_occupancy: old_occupancy,
      status: old_occupancy === 0 ? 'available' : oldRoom.status,
    });

    // Assign new room
    const new_occupancy = newRoom.current_occupancy + 1;
    const new_status = new_occupancy >= newRoom.capacity ? 'full' : 'available';
    await newRoom.update({ current_occupancy: new_occupancy, status: new_status });

    await student.update({ room_id: newRoom.id });

    return res.json({
      message: `${student.full_name} transferred from ${oldRoom.room_number} to ${newRoom.room_number}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Transfer failed' });
  }
}

// PUT /api/v1/rooms/:id/maintenance — toggle maintenance status (admin only)
async function setMaintenance(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.current_occupancy > 0) {
      return res.status(400).json({ error: 'Cannot set maintenance on an occupied room' });
    }

    const newStatus = room.status === 'maintenance' ? 'available' : 'maintenance';
    await room.update({ status: newStatus });

    return res.json({
      message: `Room ${room.room_number} is now ${newStatus}`,
      status: newStatus,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update maintenance status' });
  }
}

// POST /api/v1/rooms/deallocate — remove student from room (admin/warden)
async function deallocateRoom(req, res) {
  try {
    const { student_id } = req.body;

    const student = await Student.findByPk(student_id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.room_id) return res.status(400).json({ error: 'Student has no room allocated' });

    const room = await Room.findByPk(student.room_id);
    const new_occupancy = Math.max(0, room.current_occupancy - 1);

    await student.update({ room_id: null });
    await room.update({
      current_occupancy: new_occupancy,
      status: new_occupancy === 0 ? 'available' : room.status,
    });

    return res.json({ message: `${student.full_name} deallocated from room ${room.room_number}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Deallocation failed' });
  }
}

module.exports = {
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
};