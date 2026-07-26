const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Student } = require('../models');

// Public — students only, account starts as pending
async function register(req, res) {
  try {
    const { email, password, full_name, student_id_no, gender, contact, emergency_contact, admission_date } = req.body;
    const role = 'student'; // hardcoded, client cannot override

    if (!email || !password || !full_name || !student_id_no) {
      return res.status(400).json({ error: 'email, password, full_name and student_id_no are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash, role, status: 'pending' });

    await Student.create({
      user_id: user.id,
      student_id_no,
      full_name,
      gender,
      contact,
      emergency_contact,
      admission_date,
    });

    return res.status(201).json({ message: 'Registration submitted, awaiting approval', userId: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

// Public — all roles
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Block login if account not active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: user.status === 'pending'
          ? 'Your account is pending approval'
          : 'Your account has been rejected'
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    user.last_login = new Date();
    await user.save();

    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
}

// Admin only — creates warden accounts (active immediately, no approval needed)
async function createWarden(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash, role: 'warden', status: 'active' });

    return res.status(201).json({ message: 'Warden account created', userId: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Warden creation failed' });
  }
}

// Admin + Warden — view pending student registrations
async function getPendingStudents(req, res) {
  try {
    const pending = await User.findAll({
      where: { role: 'student', status: 'pending' },
      include: [{ model: Student }],
    });
    return res.json(pending);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch pending students' });
  }
}

// Admin + Warden — approve a pending student
async function approveStudent(req, res) {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (user.status !== 'pending') {
      return res.status(400).json({ error: `Account is already ${user.status}` });
    }

    await user.update({ status: 'active' });
    return res.json({ message: 'Student account approved successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Approval failed' });
  }
}

// Admin + Warden — reject a pending student
async function rejectStudent(req, res) {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (user.status !== 'pending') {
      return res.status(400).json({ error: `Account is already ${user.status}` });
    }

    await user.update({ status: 'rejected' });
    return res.json({ message: 'Student account rejected' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Rejection failed' });
  }
}

module.exports = { register, login, createWarden, getPendingStudents, approveStudent, rejectStudent };