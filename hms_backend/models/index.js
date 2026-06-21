const sequelize = require('../config/database');
const User = require('./User');
const Student = require('./Student');

// User → Student: One-to-One (per SDD §2.2)
User.hasOne(Student, { foreignKey: 'user_id' });
Student.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { sequelize, User, Student };