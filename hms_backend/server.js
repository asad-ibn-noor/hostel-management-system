require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Required for React frontend
const { sequelize } = require('./models');

// Route imports (ensure these files actually exist before uncommenting)
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const studentRoutes =  require('./routes/studentRoutes');
const userRoutes = require('./routes/userRoutes')
const feeRoutes = require('./routes/feeRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const visitorRoutes = require('./routes/visitorRoutes');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/fees', feeRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/visitors', visitorRoutes);


const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // alter: true safely updates existing tables to match your new v1.2 models
    await sequelize.sync({});
    console.log('✅ Tables synced');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Catch port conflicts
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Error: Port ${PORT} is already in use.`);
      } else {
        console.error('❌ Server failed to start:', err);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
}

main();