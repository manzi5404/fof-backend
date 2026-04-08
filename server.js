// server.js
require('dotenv').config(); // Must be first

const express = require('express');
const cors = require('cors');
const cookieParser = require('./middleware/cookieParser');
const { protect } = require('./middleware/authMiddleware');
const checkStoreMode = require('./middleware/storeModeMiddleware');
const errorHandler = require('./middleware/errorHandler');

const {pool} = require('./db/connection');
const { initializeDatabase } = require('./db/init');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const dropRoutes = require('./routes/dropRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/adminRoutes');
const storeConfigController = require('./controllers/storeConfigController');

const app = express();
const timestamp = () => new Date().toISOString();
const log = (...args) => console.log(`[${timestamp()}]`, ...args);
const logError = (...args) => console.error(`[${timestamp()}]`, ...args);

log('🚀 server.js loaded');

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration - Allow only Netlify frontend
const allowedOrigins = [
    'https://faithoverfearrw.netlify.app'
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(cookieParser);
app.use(checkStoreMode);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/drops', dropRoutes);
app.get('/api/store-config', storeConfigController.getStoreConfig);
app.use('/api/settings', settingsRoutes);
app.use('/api/announcement', announcementRoutes);
app.use('/api/reservations', reservationRoutes);

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
app.use('/api/orders', protect, orderRoutes);
app.use('/api/upload', protect, uploadRoutes);

// Admin Routes
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, error: 'Not Found', path: req.path }));

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
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
