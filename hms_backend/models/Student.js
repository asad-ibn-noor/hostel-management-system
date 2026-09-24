const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Student = sequelize.define("Student", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  student_id_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  gender: {
    type: DataTypes.ENUM("male", "female", "other"),
    allowNull: false,
  },
  contact: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  emergency_contact_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  emergency_contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  admission_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("active", "checked_out"),
    defaultValue: "active",
  },
}, {
  tableName: "students",
  timestamps: true,
  paranoid: true, // Enables soft deletes (deleted_at)
  createdAt: "created_at",
  updatedAt: "updated_at",
  deletedAt: "deleted_at",
});

module.exports = Student;