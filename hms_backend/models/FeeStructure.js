// models/FeeStructure.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FeeStructure = sequelize.define("FeeStructure", {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    room_type: { 
      type: DataTypes.ENUM('single', 'double', 'triple'), 
      allowNull: false 
    },
    monthly_fee: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false 
    },
    effective_from: { 
      type: DataTypes.DATEONLY, 
      allowNull: false 
    },
    effective_to: { 
      type: DataTypes.DATEONLY, 
      allowNull: true 
    }
  }, {
    tableName: 'fee_structures',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['room_type', 'effective_from'],
        name: 'uq_fee_start'
      }
    ]
  });

  return FeeStructure;
};