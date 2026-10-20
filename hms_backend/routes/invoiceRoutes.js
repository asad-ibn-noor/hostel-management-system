// routes/invoiceRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { generateInvoices, getInvoices } = require('../controllers/InvoiceController.js');

router.use(verifyToken);

// Generate monthly invoices (Admin only)[cite: 7]
router.post('/generate', requireRole('admin'), generateInvoices);
router.get('/', requireRole('admin', 'warden', 'student'), getInvoices);


module.exports = router;