const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');

// 1. Load environment variables
require('dotenv').config({
  path: path.join(__dirname, '../.env')
});

// 2. Configure required DNS
dns.setServers(['1.1.1.1', '8.8.8.8']);

// 3. Create Express application
const app = express();

// 4. Configure CORS
app.use(cors());

// 5. Configure express.json()
app.use(express.json());

// 6. Configure request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 7. Register routes
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);

// 8. Register GET / health route
app.get('/', (req, res) => {
  res.json({
    message: 'KhanaHub API is running successfully'
  });
});

const PORT = process.env.PORT || 5000;

const mongooseOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 1,
  retryWrites: true,
  w: 'majority'
};

let isConnecting = false;

// Register connection event listeners once
mongoose.connection.on('connected', () => {
  console.log('✅ [MongoDB] Active connection established.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  [MongoDB] Lost connection to database. Auto-reconnecting in 3s...');
  setTimeout(() => {
    if (mongoose.connection.readyState === 0 && !isConnecting) {
      connectToDatabase();
    }
  }, 3000);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ [MongoDB] Connection error:', err.message);
});

// Async database connection function exclusively for MongoDB Atlas
async function connectToDatabase() {
  if (mongoose.connection.readyState === 1 || isConnecting) {
    return;
  }

  isConnecting = true;
  const primaryUri = process.env.MONGODB_URI;

  if (!primaryUri) {
    console.error('❌ [MongoDB] Error: MONGODB_URI is not defined in .env');
    isConnecting = false;
    return;
  }

  try {
    console.log('[MongoDB] Connecting to MongoDB Atlas Cloud Database...');
    await mongoose.connect(primaryUri, mongooseOptions);
    console.log('✅ [MongoDB] Connected successfully to Atlas Cluster (KhanaHub)!');
    isConnecting = false;
  } catch (atlasErr) {
    console.error('❌ [MongoDB] Atlas Connection Error:', atlasErr.message);
    console.warn('🔄 [MongoDB] Retrying Atlas connection in 5 seconds...');
    isConnecting = false;
    setTimeout(connectToDatabase, 5000);
  }
}

function startServer() {
  app.listen(PORT, () => {
    console.log('\n================================');
    console.log('🚀 KhanaHub Backend Running');
    console.log('================================');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/`);
    console.log(`🔗 API:    http://localhost:${PORT}/api/auth`);
    console.log('================================\n');

    // Initiate MongoDB connection
    connectToDatabase();
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please close the other process or change PORT in .env`);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();