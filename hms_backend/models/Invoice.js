const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Invoice = sequelize.define("Invoice", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  allocation_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  billing_month: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  paid_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  status: {
    type: DataTypes.ENUM("unpaid", "partial", "paid", "void"),
    allowNull: false,
    defaultValue: "unpaid",
  },
}, {
  tableName: "invoices",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [
    {
      unique: true,
      fields: ["student_id", "billing_month"],
    }
  ]
});

module.exports = Invoice;