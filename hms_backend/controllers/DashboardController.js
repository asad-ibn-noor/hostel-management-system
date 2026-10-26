// controllers/DashboardController.js
const { VisitorLog, Room, Allocation, Payment, Invoice, sequelize } = require('../models');
const { Op } = require('sequelize'); 

// GET /api/v1/dashboard/occupancy
async function getOccupancyStats(req, res) {
  try {
    // 1. Fetch all rooms and include only their 'active' allocations
    const rooms = await Room.findAll({
      include: [{ 
        model: Allocation, 
        where: { status: 'active' }, 
        required: false, 
        attributes: ['id'] 
      }]
    });

    // 2. Initialize tracking variables for the per-block breakdown[cite: 2]
    const blockStats = {};
    let totalSystemCapacity = 0;
    let totalSystemOccupied = 0;

    // 3. Loop through rooms and aggregate capacities and occupancies per block
    rooms.forEach(room => {
      const block = room.block;
      const capacity = room.capacity;
      const occupied = room.Allocations ? room.Allocations.length : 0;

      // Create the block entry if it doesn't exist yet
      if (!blockStats[block]) {
        blockStats[block] = {
          block_name: block,
          total_capacity: 0,
          occupied_beds: 0,
          available_beds: 0
        };
      }

      // Add current room's stats to its specific block
      blockStats[block].total_capacity += capacity;
      blockStats[block].occupied_beds += occupied;
      blockStats[block].available_beds += (capacity - occupied);

      // Add to overall system totals
      totalSystemCapacity += capacity;
      totalSystemOccupied += occupied;
    });

    // 4. Format the final output
    const overallOccupancyRate = totalSystemCapacity === 0 
      ? 0 
      : Math.round((totalSystemOccupied / totalSystemCapacity) * 100);

    res.status(200).json({
      message: "Occupancy stats with per-block breakdown",
      overall: {
        total_capacity: totalSystemCapacity,
        total_occupied: totalSystemOccupied,
        total_available: totalSystemCapacity - totalSystemOccupied,
        occupancy_rate: `${overallOccupancyRate}%`
      },
      breakdown: Object.values(blockStats) // Converts the blockStats object into an array
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch occupancy stats", details: error.message });
  }
}

// GET /api/v1/dashboard/payments
async function getPaymentStats(req, res) {
  try {
    // 1. Calculate Total Revenue (Actual cash in hand from completed payments)
    const totalRevenue = await Payment.sum('amount', {
      where: { status: 'completed' }
    }) || 0;

    // 2. Calculate Pending Dues accurately from Invoices
    // Summing (total_amount - paid_amount) for active bills
    const [duesData] = await Invoice.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.literal('total_amount - paid_amount')), 'total_pending']
      ],
      where: {
        status: {
          [Op.in]: ['unpaid', 'partial']
        }
      },
      raw: true
    });
    
    const pendingDues = duesData.total_pending || 0;

    // 3. Monthly Revenue Trend (Last 12 months of completed payments)
    const monthlyTrend = await Payment.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('payment_date'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenue']
      ],
      where: {
        status: 'completed',
        payment_date: {
          [Op.not]: null
        }
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('payment_date'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('payment_date'), '%Y-%m'), 'ASC']],
      limit: 12
    });

    res.status(200).json({
      message: "Revenue, dues, and monthly trend",
      total_revenue: parseFloat(totalRevenue),
      pending_dues: parseFloat(pendingDues),
      monthly_trend: monthlyTrend.map(trend => ({
        month: trend.month || trend.dataValues.month,
        revenue: parseFloat(trend.revenue || trend.dataValues.revenue)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment stats", details: error.message });
  }
}

// GET /api/v1/dashboard/visitors
async function getVisitorStats(req, res) {
  try {
    // 1. Daily visitor counts (Last 7 days)[cite: 2]
    const dailyCounts = await VisitorLog.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('check_in')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'visitor_count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('check_in'))],
      order: [[sequelize.fn('DATE', sequelize.col('check_in')), 'DESC']],
      limit: 7
    });

    // 2. Peak Hours (Most frequent visit times)[cite: 2]
    const peakHours = await VisitorLog.findAll({
      attributes: [
        [sequelize.fn('HOUR', sequelize.col('check_in')), 'hour_of_day'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'visit_count']
      ],
      group: [sequelize.fn('HOUR', sequelize.col('check_in'))],
      order: [[sequelize.literal('visit_count'), 'DESC']],
      limit: 5
    });

    res.status(200).json({
      message: "Daily visitor counts and peak hours",
      dailyCounts,
      peakHours
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch visitor stats", details: error.message });
  }
}

// Make sure you have these imported at the top of your controller:
// const { VisitorLog, Room, Allocation, Payment, Invoice, sequelize } = require('../models');
// const { Op } = require('sequelize');

// GET /api/v1/dashboard/export
async function exportReport(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- 1. Gather Occupancy Stats ---
    const rooms = await Room.findAll({
      include: [{ model: Allocation, where: { status: 'active' }, required: false, attributes: ['id'] }]
    });
    let totalCapacity = 0;
    let totalOccupied = 0;
    rooms.forEach(room => {
      totalCapacity += room.capacity;
      totalOccupied += room.Allocations ? room.Allocations.length : 0;
    });

    // --- 2. Gather Financial Stats ---
    const totalRevenue = await Payment.sum('amount', { where: { status: 'completed' } }) || 0;
    
    const [duesData] = await Invoice.findAll({
      attributes: [[sequelize.fn('SUM', sequelize.literal('total_amount - paid_amount')), 'total_pending']],
      where: { status: { [Op.in]: ['unpaid', 'partial'] } },
      raw: true
    });
    const pendingDues = duesData.total_pending || 0;

    // --- 3. Gather Visitor Stats ---
    const activeVisitors = await VisitorLog.count({ where: { check_out: null } });
    const visitorsToday = await VisitorLog.count({
      where: { check_in: { [Op.gte]: today } }
    });

    // --- 4. Construct CSV Data ---
    // Define rows as an array of objects
    const reportData = [
      { Category: 'Occupancy', Metric: 'Total Bed Capacity', Value: totalCapacity },
      { Category: 'Occupancy', Metric: 'Occupied Beds', Value: totalOccupied },
      { Category: 'Occupancy', Metric: 'Available Beds', Value: totalCapacity - totalOccupied },
      { Category: 'Finance', Metric: 'Total Revenue Collected', Value: totalRevenue },
      { Category: 'Finance', Metric: 'Total Pending Dues', Value: pendingDues },
      { Category: 'Visitors', Metric: 'Active Visitors Inside', Value: activeVisitors },
      { Category: 'Visitors', Metric: 'Total Visitors Today', Value: visitorsToday }
    ];

    // Convert array of objects to CSV string
    const csvHeaders = "Category,Metric,Value\n";
    const csvRows = reportData.map(row => `"${row.Category}","${row.Metric}","${row.Value}"`).join("\n");
    const finalCsv = csvHeaders + csvRows;

    // --- 5. Send CSV Response ---
    // Generate a dynamic filename with today's date
    const dateString = new Date().toISOString().split('T')[0]; // e.g., 2026-10-26
    const fileName = `Hostel_Dashboard_Report_${dateString}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    res.status(200).send(finalCsv);

  } catch (error) {
    res.status(500).json({ error: "Failed to export report", details: error.message });
  }
}

module.exports = {
    getOccupancyStats,
    getVisitorStats,
    getPaymentStats,
    exportReport
}