const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  room_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  block: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  floor: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  current_occupancy: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  room_type: {
    type: DataTypes.ENUM('single', 'double', 'triple', 'quad'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('available', 'full', 'maintenance'),
    defaultValue: 'available',
  },
  monthly_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'rooms',
  timestamps: false,
});

module.exports = Room;