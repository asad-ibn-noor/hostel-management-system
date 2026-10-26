// controllers/VisitorController.js
const { VisitorLog, Student, Staff } = require('../models');
const { Op } = require('sequelize');

// POST /api/v1/visitors - Record check-in
async function logEntry(req, res) {
  try {
    const { visitor_name, id_proof_type, id_proof_no, visiting_student_id, purpose } = req.body;

    if (!visitor_name || !id_proof_type || !id_proof_no || !visiting_student_id || !purpose) {
      return res.status(400).json({ error: "All required visitor fields must be provided." });
    }

    // Find the staff profile corresponding to the logged-in user
    const staff = await Staff.findOne({ where: { user_id: req.user.id } });
    if (!staff) {
      return res.status(403).json({ error: "Staff profile not found for the authenticated user." });
    }

    // Verify student exists
    const student = await Student.findByPk(visiting_student_id);
    if (!student) {
      return res.status(404).json({ error: "Visiting student not found." });
    }

    const visitorLog = await VisitorLog.create({
      visitor_name,
      id_proof_type,
      id_proof_no,
      visiting_student_id,
      purpose,
      logged_by: staff.id,
      check_in: new Date()
    });

    res.status(201).json({
      message: "Visitor check-in logged successfully.",
      visitorLog
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to log visitor entry", details: error.message });
  }
}

// PUT /api/v1/visitors/:id/checkout - Record check-out
async function logExit(req, res) {
  try {
    const { id } = req.params;

    const staff = await Staff.findOne({ where: { user_id: req.user.id } });
    if (!staff) {
      return res.status(403).json({ error: "Staff profile not found for the authenticated user." });
    }

    const visitorLog = await VisitorLog.findByPk(id);
    if (!visitorLog) {
      return res.status(404).json({ error: "Visitor log entry not found." });
    }

    if (visitorLog.check_out) {
      return res.status(409).json({ error: "Visitor is already checked out." });
    }

    await visitorLog.update({
      check_out: new Date(),
      checkout_by: staff.id
    });

    res.status(200).json({
      message: "Visitor check-out recorded successfully.",
      visitorLog
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to log visitor exit", details: error.message });
  }
}

// GET /api/v1/visitors/active - Get visitors currently inside
async function getActiveVisitors(req, res) {
  try {
    const activeVisitors = await VisitorLog.findAll({
      where: { check_out: null },
      include: [
        { model: Student, as: 'visitingStudent', attributes: ['id', 'full_name', 'student_id_no'] },
        { 
          model: Staff, 
          as: 'loggedByStaff', 
          attributes: ['id', 'employee_id_no', 'full_name', 'designation'] 
        }
      ],
      order: [['check_in', 'DESC']]
    });

    res.status(200).json(activeVisitors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active visitors", details: error.message });
  }
}

// GET /api/v1/visitors - Get paginated history with filters
async function getVisitorHistory(req, res) {
  try {
    const { startDate, endDate, student_id, visitor_name, id_proof_no, status, page = 1, limit = 10 } = req.query;
    const whereClause = {};

    if (visitor_name) {
      whereClause.visitor_name = { [Op.like]: `%${visitor_name}%` };
    }
    if (id_proof_no) {
      whereClause.id_proof_no = { [Op.like]: `%${id_proof_no}%` };
    }
    if (student_id) {
      whereClause.visiting_student_id = student_id;
    }

    if (status === 'active') {
      whereClause.check_out = null;
    } else if (status === 'checked_out') {
      whereClause.check_out = { [Op.not]: null };
    }

    if (startDate && endDate) {
      whereClause.check_in = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.check_in = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      whereClause.check_in = { [Op.lte]: new Date(endDate) };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await VisitorLog.findAndCountAll({
      where: whereClause,
      include: [
        { model: Student, as: 'visitingStudent', attributes: ['id', 'full_name', 'student_id_no'] },
        { 
          model: Staff, 
          as: 'loggedByStaff', 
          attributes: ['id', 'employee_id_no', 'full_name', 'designation'] 
        },
        { 
          model: Staff, 
          as: 'checkoutByStaff', 
          attributes: ['id', 'employee_id_no', 'full_name', 'designation'] 
        }
      ],
      order: [['check_in', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      visitors: rows
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch visitor history", details: error.message });
  }
}

module.exports = {
  logEntry,
  logExit,
  getActiveVisitors,
  getVisitorHistory
};