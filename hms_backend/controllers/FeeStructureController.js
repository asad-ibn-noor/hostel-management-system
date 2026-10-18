// controllers/FeeStructureController.js
const { FeeStructure } = require('../models');

// POST /api/v1/fees/structures
 async function createFeeStructure (req, res) {
  try {
    const { room_type, monthly_fee, effective_from, effective_to } = req.body;

    // Optional: Add validation here to ensure monthly_fee > 0 and effective_to > effective_from

    const feeStructure = await FeeStructure.create({
      room_type,
      monthly_fee,
      effective_from,
      effective_to
    });

    res.status(201).json({ message: "Fee structure created successfully", feeStructure });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: "A fee structure for this room type and start date already exists." });
    }
    res.status(500).json({ error: "Failed to create fee structure", details: error.message });
  }
};

// GET /api/v1/fees/structures
async function getFeeStructures (req, res) {
  try {
    const feeStructures = await FeeStructure.findAll({
      order: [['room_type', 'ASC'], ['effective_from', 'DESC']]
    });

    res.status(200).json(feeStructures);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch fee structures", details: error.message });
  }
};

// DELETE /api/v1/fees/structures/:id
 async function deleteFeeStructure(req, res) {
  try {
    const { id } = req.params;

    const feeStructure = await FeeStructure.findByPk(id);
    
    if (!feeStructure) {
      return res.status(404).json({ error: "Fee structure not found" });
    }

    await feeStructure.destroy();

    res.status(200).json({ message: "Fee structure deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete fee structure", details: error.message });
  }
};

module.exports = {
  createFeeStructure, getFeeStructures, deleteFeeStructure
};