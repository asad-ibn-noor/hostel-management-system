const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  payment_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payment_method: {
    type: DataTypes.ENUM("cash", "bank_transfer", "online"),
    allowNull: false,
  },
  transaction_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  idempotency_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "completed", "failed", "reversed"),
    allowNull: false,
    defaultValue: "pending",
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  received_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  notes: {
    type: DataTypes.STRING(255),
    allowNull: true,
  }
}, {
  tableName: "payments",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Payment;