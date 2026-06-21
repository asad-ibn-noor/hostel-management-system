const { sequelize } = require('./models');

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync(); // creates tables if they don't exist
    console.log('✅ Tables synced (users, students)');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main();