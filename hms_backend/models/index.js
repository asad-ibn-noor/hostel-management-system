const sequelize = require("../config/database");
const User = require("./User");
const Student = require("./Student");
const Room = require("./Room");
const Allocation = require("./Allocation");

// User <-> Student (1-to-1)
User.hasOne(Student, { foreignKey: "user_id", onDelete: "CASCADE" });
Student.belongsTo(User, { foreignKey: "user_id" });

// Student <-> Allocation (1-to-Many)
Student.hasMany(Allocation, { foreignKey: "student_id" });
Allocation.belongsTo(Student, { foreignKey: "student_id" });

// Room <-> Allocation (1-to-Many)
Room.hasMany(Allocation, { foreignKey: "room_id" });
Allocation.belongsTo(Room, { foreignKey: "room_id" });

module.exports = { 
  sequelize, 
  User, 
  Student, 
  Room, 
  Allocation 
};