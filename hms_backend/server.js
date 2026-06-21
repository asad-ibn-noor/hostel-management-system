require('dotenv').config({ quiet: true });
const express = require('express');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    await sequelize.sync();
    console.log('✅ Tables synced');

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main();