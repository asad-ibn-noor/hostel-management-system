// controllers/PaymentController.js
const { Payment, Invoice, Student, PaymentAllocation, sequelize } = require('../models');

async function recordPayment(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const {
      invoice_id,
      student_id,
      amount,
      payment_method,
      transaction_reference,
      idempotency_key,
      notes
    } = req.body;

    if (!invoice_id || !student_id || !amount || !payment_method || !idempotency_key) {
      await transaction.rollback();
      return res.status(400).json({ error: "Missing required fields" });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: "Payment amount must be greater than 0" });
    }

    const existingPayment = await Payment.findOne({
      where: { idempotency_key },
      transaction
    });

    if (existingPayment) {
      await transaction.rollback();
      return res.status(409).json({
        message: "Payment with this idempotency key has already been processed",
        payment: existingPayment
      });
    }

    const invoice = await Invoice.findByPk(invoice_id, { transaction });

    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (invoice.status === 'paid') {
      await transaction.rollback();
      return res.status(400).json({ error: "Invoice is already fully paid" });
    }

    const totalAmount = parseFloat(invoice.total_amount);
    const currentPaidAmount = parseFloat(invoice.paid_amount);
    const remainingBalance = parseFloat((totalAmount - currentPaidAmount).toFixed(2));

    if (paymentAmount > remainingBalance) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Payment amount (${paymentAmount}) exceeds remaining invoice balance (${remainingBalance})`
      });
    }

    const paymentNumber = `PAY-${Date.now()}`;
    const payment = await Payment.create({
      payment_number: paymentNumber,
      student_id,
      amount: paymentAmount,
      payment_method,
      transaction_reference: transaction_reference || null,
      idempotency_key,
      status: 'completed',
      payment_date: new Date(),
      received_by: req.user ? req.user.id : null,
      notes: notes || null
    }, { transaction });

    await PaymentAllocation.create({
      payment_id: payment.id,
      invoice_id: invoice.id,
      amount_applied: paymentAmount
    }, { transaction });

    const newPaidAmount = parseFloat((currentPaidAmount + paymentAmount).toFixed(2));
    const newStatus = newPaidAmount >= totalAmount ? 'paid' : 'partial';

    await invoice.update({
      paid_amount: newPaidAmount,
      status: newStatus
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      message: "Payment recorded successfully",
      payment_number: payment.payment_number,
      invoice_id: invoice.id,
      applied_amount: paymentAmount,
      new_invoice_status: newStatus,
      remaining_balance: parseFloat((totalAmount - newPaidAmount).toFixed(2))
    });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: "Failed to process payment", details: error.message });
  }
}

// GET /api/v1/payments
async function getPayments(req, res) {
  try {
    const { student_id, payment_method } = req.query;
    const whereClause = {};

    // Ownership check: If logged in as a student, enforce their student_id
    if (req.user.role === 'student') {
      const student = await Student.findOne({ where: { user_id: req.user.id } });
      if (!student) {
        return res.status(404).json({ error: "Student record not found for this user account" });
      }
      whereClause.student_id = student.id;
    } else if (student_id) {
      whereClause.student_id = student_id;
    }

    if (payment_method) whereClause.payment_method = payment_method;

    const payments = await Payment.findAll({
      where: whereClause,
      include: [
        { model: Student, as: 'student' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payments", details: error.message });
  }
}

// GET /api/v1/payments/:id
async function getPaymentById(req, res) {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { model: Student, as: 'student' },
        { model: Invoice, through: { attributes: ['amount_applied'] } }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment details", details: error.message });
  }
}

module.exports = {
  recordPayment,
  getPayments,
  getPaymentById
};