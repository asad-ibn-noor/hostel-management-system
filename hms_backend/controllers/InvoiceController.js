// controllers/invoiceController.js
const { Invoice, Allocation, Room, FeeStructure, Student } = require('../models');
const { Op } = require('sequelize');

async function generateInvoices(req, res) {
  try {
    const { target_month } = req.body; // e.g., "2026-10-01" (Must be the 1st of the month)

    if (!target_month || new Date(target_month).getDate() !== 1) {
      return res.status(400).json({ error: "target_month must be the first day of the month (e.g., YYYY-MM-01)" });
    }

    const monthStart = new Date(target_month);
    
    // Find all active allocations for this month
    const activeAllocations = await Allocation.findAll({
      where: {
        status: 'active' // Modify based on how you track active occupancies
      },
      include: [
        { model: Student},
        { model: Room }
      ]
    });

    let generatedCount = 0;
    let skippedCount = 0;

    for (const allocation of activeAllocations) {
      // Find the active fee structure for this room type at this date
      const feeStructure = await FeeStructure.findOne({
        where: {
          room_type: allocation.Room.room_type,
          effective_from: { [Op.lte]: monthStart },
          [Op.or]: [
            { effective_to: { [Op.gte]: monthStart } },
            { effective_to: null }
          ]
        },
        order: [['effective_from', 'DESC']]
      });

      if (!feeStructure) {
        continue; // Skip if no pricing exists for this room type
      }

      const invoiceNumber = `INV-${allocation.student_id}-${monthStart.getTime()}`;

      try {
        // Attempt to insert the invoice. The unique key on (student_id, billing_month)
        // ensures we never double-bill a student for the same month[cite: 2, 5].
        await Invoice.create({
          invoice_number: invoiceNumber,
          student_id: allocation.student_id,
          allocation_id: allocation.id,
          billing_month: target_month,
          issue_date: new Date(),
          due_date: new Date(new Date(target_month).setDate(10)), // Due on the 10th[cite: 1]
          total_amount: feeStructure.monthly_fee,
          paid_amount: 0.00,
          status: 'unpaid'
        });
        generatedCount++;
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          skippedCount++; // Invoice already exists, handle gracefully[cite: 5]
        } else {
          throw error;
        }
      }
    }

    res.status(200).json({
      message: "Billing cycle complete",
      generated: generatedCount,
      skipped_due_to_existing: skippedCount
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to generate invoices", details: error.message });
  }
};

module.exports = {generateInvoices}