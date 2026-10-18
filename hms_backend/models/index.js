const sequelize = require("../config/database");
const User = require("./User");
const Student = require("./Student");
const Room = require("./Room");
const Allocation = require("./Allocation");
const FeeStructure = require("./FeeStructure");
const PaymentAllocation = require('./PaymentAllocation');
const Invoice = require('./Invoice');
const Payment = require('./Payment');

// User <-> Student (1-to-1)
User.hasOne(Student, { foreignKey: "user_id", onDelete: "CASCADE" });
Student.belongsTo(User, { foreignKey: "user_id" });

// Student <-> Allocation (1-to-Many)
Student.hasMany(Allocation, { foreignKey: "student_id" });
Allocation.belongsTo(Student, { foreignKey: "student_id" });

// Room <-> Allocation (1-to-Many)
Room.hasMany(Allocation, { foreignKey: "room_id" });
Allocation.belongsTo(Room, { foreignKey: "room_id" });

// 1. Student <-> Invoice[cite: 6]
Student.hasMany(Invoice, { foreignKey: 'student_id', as: 'invoices' });
Invoice.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// 2. Allocation <-> Invoice[cite: 6]
Allocation.hasMany(Invoice, { foreignKey: 'allocation_id', as: 'invoices' });
Invoice.belongsTo(Allocation, { foreignKey: 'allocation_id', as: 'allocation' });

// 3. Student <-> Payment[cite: 6]
Student.hasMany(Payment, { foreignKey: 'student_id', as: 'payments' });
Payment.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// 4. User (Staff) <-> Payment[cite: 6]
User.hasMany(Payment, { foreignKey: 'received_by', as: 'received_payments' });
Payment.belongsTo(User, { foreignKey: 'received_by', as: 'receiver' });

// 5. Invoice <-> PaymentAllocation[cite: 6]
Invoice.hasMany(PaymentAllocation, { foreignKey: 'invoice_id', as: 'payment_allocations' });
PaymentAllocation.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// 6. Payment <-> PaymentAllocation[cite: 6]
Payment.hasMany(PaymentAllocation, { foreignKey: 'payment_id', as: 'allocations' });
PaymentAllocation.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });

// Optional: N:M Convenience associations for easy querying[cite: 6]
Payment.belongsToMany(Invoice, { through: PaymentAllocation, foreignKey: 'payment_id', otherKey: 'invoice_id', as: 'invoices' });
Invoice.belongsToMany(Payment, { through: PaymentAllocation, foreignKey: 'invoice_id', otherKey: 'payment_id', as: 'payments' });

module.exports = { 
  sequelize, 
  User, 
  Student, 
  Room, 
  Allocation,
  FeeStructure,
  PaymentAllocation,
  Invoice,
  Payment
};