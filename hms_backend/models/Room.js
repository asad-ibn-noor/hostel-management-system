const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Room = sequelize.define("Room", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  room_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  block: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  floor: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  room_type: {
    type: DataTypes.ENUM("single", "double", "triple"),
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_maintenance: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: "rooms",
  timestamps: true,
  paranoid: true, // Enables soft deletes (deleted_at)
  createdAt: "created_at",
  updatedAt: "updated_at",
  deletedAt: "deleted_at",
  indexes: [
    {
      unique: true,
      fields: ["block", "room_number"],
      name: "unique_block_room"
    }
  ]
});

module.exports = Room;