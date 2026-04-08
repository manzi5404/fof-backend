// server.js
require('dotenv').config(); // Must be first

const express = require('express');
const cors = require('cors');
const cookieParser = require('./middleware/cookieParser');
const path = require('path');

const pool = require('./db/connection'); // Single require
const { initializeDatabase } = require('./db/init');

const app = express();
const timestamp = () => new Date().toISOString();
const log = (...args) => console.log(`[${timestamp()}]`, ...args);
const logError = (...args) => console.error(`[${timestamp()}]`, ...args);

log('🚀 server.js loaded');

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/drops', require('./routes/dropRoutes'));
app.use('/api/store-config', require('./controllers/storeConfigController').getStoreConfig);
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/announcement', require('./routes/announcementRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));

// Contact message route
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    await pool.query(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject, message]
    );
    res.status(200).json({ success: true, message: 'Message received!' });
    log('✅ Message saved');
  } catch (error) {
    logError('❌ Database Error:', error);
    res.status(500).json({ success: false, error: 'Database save failed' });
  }
});

// Protected Routes
const { protect } = require('./middleware/authMiddleware');
app.use('/api/orders', protect, require('./routes/orderRoutes'));
app.use('/api/upload', protect, require('./routes/upload'));

// Admin Routes
app.use('/api/admin', require('./routes/adminRoutes'));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, error: 'Not Found', path: req.path }));

// Error handler
app.use(require('./middleware/errorHandler'));

// Start server
const PORT = process.env.PORT || 5000;
async function startServer() {
  try {
    await initializeDatabase();
    log('✅ Database initialized');
    app.listen(PORT, '0.0.0.0', () => log(`✅ API listening on 0.0.0.0:${PORT}`));
  } catch (err) {
    logError('❌ Server startup failed:', err);
  }
}

startServer();