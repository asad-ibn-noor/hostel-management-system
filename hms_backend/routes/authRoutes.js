const express = require('express');
const router = express.Router();

const {
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  refreshToken,
} = require('../controllers/AuthController');

// Public endpoints
router.post('/login', login);
router.post('/logout', logout);
router.post('/password-reset', requestPasswordReset);
router.put('/password-reset/:token', resetPassword);
router.post('/refresh', refreshToken);

module.exports = router;