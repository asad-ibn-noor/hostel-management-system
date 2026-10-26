// models/VisitorLog.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const VisitorLog = sequelize.define("VisitorLog", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  visitor_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  id_proof_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  id_proof_no: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  visiting_student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  purpose: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  check_in: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  check_out: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  logged_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  checkout_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: "visitor_logs",
  timestamps: false,
  indexes: [
    { fields: ['check_out'] },
    { fields: ['check_in'] },
    { fields: ['visiting_student_id'] }
  ],
});

module.exports = VisitorLog;