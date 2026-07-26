const sequelize = require('../config/database');
const Room = require('./Room');
const User = require('./User');
const Student = require('./Student');


// User → Student: One-to-One (per SDD §2.2)
User.hasOne(Student, { foreignKey: 'user_id' });
Student.belongsTo(User, { foreignKey: 'user_id' });

// Room → Student (One room has many students)
Room.hasMany(Student, { foreignKey: 'room_id' });
Student.belongsTo(Room, { foreignKey: 'room_id' });

module.exports = { sequelize, User, Student, Room };