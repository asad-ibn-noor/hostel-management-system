const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Student } = require('../models');

async function register(req, res) {
  try {
    const { email, password, role, full_name, student_id_no, gender, contact, emergency_contact, admission_date } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password, and role are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash, role });

    if (role === 'student') {
      await Student.create({
        user_id: user.id,
        student_id_no,
        full_name,
        gender,
        contact,
        emergency_contact,
        admission_date,
      });
    }

    return res.status(201).json({ message: 'User registered', userId: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

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

module.exports = { register, login };