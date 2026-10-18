const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PaymentAllocation = sequelize.define("PaymentAllocation", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  payment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount_applied: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  }
}, {
  tableName: "payment_allocations",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ["payment_id", "invoice_id"]
    }
  ]
});

module.exports = PaymentAllocation;