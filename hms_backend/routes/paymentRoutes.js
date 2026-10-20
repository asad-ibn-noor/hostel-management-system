// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { recordPayment, getPayments, getPaymentById } = require('../controllers/PaymentController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// Record payment
router.post('/', requireRole('admin', 'warden'), recordPayment);

// View all payments
router.get('/', requireRole('admin', 'warden', 'student'), getPayments);

// View payment details / receipt data
router.get('/:id', requireRole('admin', 'warden', 'student'), getPaymentById);

module.exports = router;