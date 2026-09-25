const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Student } = require('../models');
// const nodemailer = require('nodemailer'); // Uncomment when SMTP is configured in .env

// POST /api/v1/auth/login - Validates credentials, issues JWT token
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: Student, required: false }],
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    user.last_login = new Date();
    await user.save();

    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
}

// POST /api/v1/auth/logout - Client-side token invalidation
async function logout(req, res) {
  // Since we are using stateless JWTs, true invalidation happens by the client deleting the token.
  // We return a 200 OK to confirm the client should proceed with destroying the token locally.
  return res.json({ message: 'Logged out successfully. Please remove token from client storage.' });
}

// POST /api/v1/auth/password-reset - Generates time-limited reset token, sends email
async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Return 200 even if user doesn't exist to prevent email enumeration attacks
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.reset_token = resetToken;
    user.reset_token_expiry = new Date(Date.now() + 3600000); // 1 hour expiration
    await user.save();

    // TODO: Integrate nodemailer to actually email the token/link to the user
    // console.log(`Reset Token for ${email}: ${resetToken}`);

    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Password Reset Request Error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
}

// PUT /api/v1/auth/password-reset/:token - Validates token expiry, updates password hash
async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ error: 'New password is required.' });
    }

    const user = await User.findOne({ where: { reset_token: token } });

    if (!user || user.reset_token_expiry < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    user.password_hash = await bcrypt.hash(new_password, 10);
    user.reset_token = null;
    user.reset_token_expiry = null;
    await user.save();

    return res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Password Reset Error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
}

// POST /api/v1/auth/refresh - Issues new JWT if current token is valid
async function refreshToken(req, res) {
  try {
    // Expecting token in body or authorization header
    const oldToken = req.body.token || req.headers.authorization?.split(' ')[1];
    if (!oldToken) return res.status(401).json({ error: 'Token is required.' });

    // Verify token ignoring expiration to allow refreshing recently expired tokens
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Optional: add logic here to reject tokens that have been expired for too long (e.g., > 7 days)

    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User no longer valid or active.' });
    }

    const newToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    return res.json({ token: newToken });
  } catch (err) {
    console.error('Token Refresh Error:', err);
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

module.exports = {
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  refreshToken,
};