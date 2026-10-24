const bcrypt = require('bcrypt');
const { sequelize, User, Student, Staff } = require('../models');

// Admin only — Creates Warden account and linked Staff profile
async function createWarden(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const { email, password, employee_id_no, full_name, designation, contact } = req.body;

    // 1. Validate required fields
    if (!email || !password || !employee_id_no || !full_name) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Email, password, employee_id_no, and full_name are required.'
      });
    }

    // 2. Check for existing email
    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    // 3. Check for existing Employee ID
    const existingStaff = await Staff.findOne({ where: { employee_id_no }, transaction });
    if (existingStaff) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Employee ID number is already registered.' });
    }

    // 4. Create User account
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password_hash,
      role: 'warden',
      is_active: true
    }, { transaction });

    // 5. Create Staff profile record
    const staff = await Staff.create({
      user_id: user.id,
      employee_id_no,
      full_name,
      designation: designation || 'Warden',
      contact: contact || null,
      status: 'active'
    }, { transaction });

    // Commit both operations
    await transaction.commit();

    return res.status(201).json({
      message: 'Warden account and staff profile created successfully.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      staff: {
        id: staff.id,
        employee_id_no: staff.employee_id_no,
        full_name: staff.full_name,
        designation: staff.designation,
        contact: staff.contact
      }
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Create Warden Error:', err);
    return res.status(500).json({ error: 'Warden creation failed.', details: err.message });
  }
}

// Admin only — Deletes a Warden account and its associated Staff profile
async function deleteWarden(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params; // Target Warden User ID

    // 1. Fetch user within transaction
    const user = await User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Warden user account not found.' });
    }

    // 2. Role Guard: Ensure we only delete warden accounts
    if (user.role !== 'warden') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Target account is not a warden. Cannot perform warden deletion on this user.' 
      });
    }

    // 3. Delete user (CASCADE automatically deletes linked Staff row)
    await user.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({
      message: 'Warden account and associated staff profile deleted successfully.'
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Delete Warden Error:', err);
    return res.status(500).json({ 
      error: 'Warden deletion failed.', 
      details: err.message 
    });
  }
}

// Admin + Warden — View pending student registrations
async function getPendingStudents(req, res) {
  try {
    const pending = await User.findAll({
      where: { role: 'student', is_active: false },
      attributes: { exclude: ['password_hash'] },
      include: [{ 
        model: Student,
        where: { status: 'pending' } 
      }],
    });
    return res.json(pending);
  } catch (err) {
    console.error('Fetch Pending Error:', err);
    return res.status(500).json({ error: 'Failed to fetch pending registrations.' });
  }
}

// Admin + Warden — Approve student registration
async function approveStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.userId, { 
      include: [Student],
      transaction 
    });

    if (!user || user.role !== 'student') {
      await transaction.rollback();
      return res.status(404).json({ error: 'Student account not found.' });
    }
    if (user.is_active) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Account is already active.' });
    }

    // Activate the user login
    await user.update({ is_active: true }, { transaction });

    // Activate the student profile for room allocation
    if (user.Student) {
      await user.Student.update({ status: 'active' }, { transaction });
    }

    await transaction.commit();
    return res.json({ message: 'Student account approved successfully. They can now log in and be assigned a room.' });
  } catch (err) {
    await transaction.rollback();
    console.error('Approve Student Error:', err);
    return res.status(500).json({ error: 'Failed to approve student.' });
  }
}

// Admin + Warden — Reject student registration (deletes records)
async function rejectStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.userId, { transaction });
    
    if (!user || user.role !== 'student') {
      await transaction.rollback();
      return res.status(404).json({ error: 'Student account not found.' });
    }
    if (user.is_active) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot reject an active student account.' });
    }

    // Delete associated student profile first, then the user
    await Student.destroy({ where: { user_id: user.id }, transaction, force: true });
    await user.destroy({ transaction, force: true });

    await transaction.commit();
    return res.json({ message: 'Student registration rejected and removed.' });
  } catch (err) {
    await transaction.rollback();
    console.error('Reject Student Error:', err);
    return res.status(500).json({ error: 'Failed to reject student registration.' });
  }
}

module.exports = {
  createWarden,
  getPendingStudents,
  approveStudent,
  rejectStudent,
  deleteWarden
};