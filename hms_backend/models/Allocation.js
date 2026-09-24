const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Allocation = sequelize.define("Allocation", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("active", "transferred", "checked_out"),
    defaultValue: "active",
  },
  assigned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  vacated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: "allocations",
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ["student_id", "status"],
      where: {
        status: "active"
      },
      name: "idx_one_active_allocation_per_student"
    }
  ]
});

module.exports = Allocation;