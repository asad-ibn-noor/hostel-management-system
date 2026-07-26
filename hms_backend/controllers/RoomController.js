const { Room, Student } = require('../models');

// GET /api/v1/rooms — get all rooms (admin/warden)
async function getAllRooms(req, res) {
  try {
    const rooms = await Room.findAll({
      include: [{
        model: Student,
        attributes: ['id', 'full_name', 'student_id_no'],
      }],
    });
    return res.json(rooms);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
}

// GET /api/v1/rooms/available — get available rooms (all roles)
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

// PUT /api/v1/rooms/:id — update room details (admin only)
async function updateRoom(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const { block, floor, capacity, room_type, monthly_fee, status } = req.body;
    await room.update({ block, floor, capacity, room_type, monthly_fee, status });

    return res.json({ message: 'Room updated', room });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update room' });
  }
}

// DELETE /api/v1/rooms/:id — delete a room (admin only)
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

// POST /api/v1/rooms/allocate — allocate a room to a student (admin/warden)
async function allocateRoom(req, res) {
  try {
    const { student_id, room_id } = req.body;

    if (!student_id || !room_id) {
      return res.status(400).json({ error: 'student_id and room_id are required' });
    }

    // Check student exists and isn't already allocated
    const student = await Student.findByPk(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (student.room_id) {
      return res.status(400).json({ error: 'Student is already allocated a room' });
    }

    // Check room exists and has space
    const room = await Room.findByPk(room_id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.status !== 'available') {
      return res.status(400).json({ error: `Room is ${room.status}` });
    }
    if (room.current_occupancy >= room.capacity) {
      return res.status(400).json({ error: 'Room is at full capacity' });
    }

    // Allocate
    const new_occupancy = room.current_occupancy + 1;
    const new_status = new_occupancy >= room.capacity ? 'full' : 'available';

    await student.update({ room_id: room.id });
    await room.update({
      current_occupancy: new_occupancy,
      status: new_status,
    });

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

// POST /api/v1/rooms/deallocate — remove student from room (admin/warden)
async function deallocateRoom(req, res) {
  try {
    const { student_id } = req.body;

    const student = await Student.findByPk(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (!student.room_id) {
      return res.status(400).json({ error: 'Student has no room allocated' });
    }

    const room = await Room.findByPk(student.room_id);
    const new_occupancy = Math.max(0, room.current_occupancy - 1);

    await student.update({ room_id: null });
    await room.update({
      current_occupancy: new_occupancy,
      status: new_occupancy === 0 ? 'available' : room.status,
    });

    return res.json({ message: `Student ${student.full_name} deallocated from room ${room.room_number}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Deallocation failed' });
  }
}

module.exports = {
  getAllRooms,
  getAvailableRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  allocateRoom,
  deallocateRoom,
};