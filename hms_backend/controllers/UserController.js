const bcrypt = require('bcrypt');
const { sequelize, User, Student } = require('../models');

// Admin only — Creates Warden accounts (active immediately)
async function createWarden(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash, role: 'warden', is_active: true });

    return res.status(201).json({ message: 'Warden account created successfully.', userId: user.id });
  } catch (err) {
    console.error('Create Warden Error:', err);
    return res.status(500).json({ error: 'Warden creation failed.' });
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
};