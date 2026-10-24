// models/Staff.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Staff = sequelize.define("Staff", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  employee_id_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING(50), // e.g., "Chief Warden", "Assistant Warden", "Maintenance Supervisor"
    allowNull: true,
  },
  contact: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("active", "inactive"),
    defaultValue: "active",
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "staff",
  timestamps: false,
});

module.exports = Staff;