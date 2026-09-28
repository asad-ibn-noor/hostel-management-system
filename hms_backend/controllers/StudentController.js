const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { sequelize, User, Student, Allocation, Room } = require('../models');


// POST /api/v1/students - Creates User + Student record (Strictly pending, no allocations)
async function registerStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const {
      email, password, full_name, student_id_no, gender,
      contact, emergency_contact_name, emergency_contact_phone, admission_date
    } = req.body; // Notice room_id is completely ignored even if sent

    if (!email || !password || !full_name || !student_id_no || !emergency_contact_name || !emergency_contact_phone) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Missing required registration fields.' });
    }

    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const existingStudent = await Student.findOne({ where: { student_id_no }, transaction });
    if (existingStudent) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Student ID number is already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Create User (starts as inactive/pending)
    const user = await User.create(
      { email, password_hash, role: 'student', is_active: false },
      { transaction }
    );

    // Create Student profile (starts as pending)
    const student = await Student.create(
      {
        user_id: user.id, 
        student_id_no, 
        full_name, 
        gender, 
        contact,
        emergency_contact_name, 
        emergency_contact_phone,
        admission_date: admission_date || new Date(),
        status: 'pending', 
      },
      { transaction }
    );

    await transaction.commit();
    return res.status(201).json({ message: 'Student registered successfully. Awaiting approval.', student });
  } catch (err) {
    await transaction.rollback();
    console.error('Registration Error:', err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
}

// GET /api/v1/students - Returns paginated student list with filters
async function getAllStudents(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Student.findAndCountAll({
      limit,
      offset,
      include: [
        { model: User, attributes: ['email', 'is_active'] },
        { model: Allocation, where: { status: 'active' }, required: false, include: [Room] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      students: rows
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch students.' });
  }
}

// GET /api/v1/students/search - Full-text search by name, ID number, or block
async function searchStudents(req, res) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query "q" is required.' });

    const students = await Student.findAll({
      include: [
        {
          model: Allocation,
          where: { status: 'active' },
          required: false,
          include: [{ model: Room, attributes: ['block', 'room_number'] }]
        }
      ],
      where: {
        [Op.or]: [
          { full_name: { [Op.like]: `%${q}%` } },
          { student_id_no: { [Op.like]: `%${q}%` } },
          { '$Allocations.Room.block$': { [Op.like]: `%${q}%` } }
        ]
      }
    });

    return res.json(students);
  } catch (err) {
    console.error('Search Error:', err);
    return res.status(500).json({ error: 'Failed to search students.' });
  }
}

// GET /api/v1/students/:id - Returns full profile and allocation history
async function getStudentById(req, res) {
  try {
    const student = await Student.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['email', 'is_active'] },
        { model: Allocation, include: [Room] } // Fetching all allocations for history
      ]
    });

    if (!student) return res.status(404).json({ error: 'Student not found.' });
    return res.json(student);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch student details.' });
  }
}

// PUT /api/v1/students/:id - Updates student record
async function updateStudent(req, res) {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    await student.update(req.body);
    return res.json({ message: 'Student updated successfully.', student });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update student.' });
  }
}

// PUT /api/v1/students/:id/checkout - Sets status to checked-out, vacates active room
async function checkoutStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const student = await Student.findByPk(req.params.id, { transaction });
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Update student status
    await student.update({ status: 'checked_out' }, { transaction });

    // Vacate active room allocation
    const activeAllocation = await Allocation.findOne({
      where: { student_id: student.id, status: 'active' },
      transaction
    });

    if (activeAllocation) {
      await activeAllocation.update({ 
        status: 'checked_out', 
        vacated_at: new Date() 
      }, { transaction });
    }

    await transaction.commit();
    return res.json({ message: 'Student checked out successfully.' });
  } catch (err) {
    await transaction.rollback();
    console.error('Checkout Error:', err);
    return res.status(500).json({ error: 'Failed to checkout student.' });
  }
}

module.exports = {
  registerStudent,
  getAllStudents,
  searchStudents,
  getStudentById,
  updateStudent,
  checkoutStudent
};