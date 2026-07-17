const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { requireAuth } = require('./middleware/auth');
const { requireAdmin } = require('./middleware/admin');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const dropRoutes = require('./routes/drop.routes');
const dropAdminRoutes = require('./routes/drop.admin.routes');
const productRoutes = require('./routes/product.routes');
const productAdminRoutes = require('./routes/product.admin.routes');
const collectionRoutes = require('./routes/collection.routes');
const collectionAdminRoutes = require('./routes/collection.admin.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const orderAdminRoutes = require('./routes/order.admin.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const waitlistRoutes = require('./routes/waitlist.routes');
const messageRoutes = require('./routes/message.routes');
const settingsRoutes = require('./routes/settings.routes');
const siteStatusRoutes = require('./routes/siteStatus.routes');

const app = express();



// Security
app.use(helmet());
app.use(compression());

// CORS
const allowedOrigins = [
  'https://faithoverfearrw.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:8080',
  ...(process.env.CORS_ORIGIN ? String(process.env.CORS_ORIGIN).split(',').map(s => s.trim()).filter(Boolean) : []),
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const uploadRoutes = require('./routes/upload.routes');

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/drops', dropRoutes);
app.use('/api/products', productRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/contact', messageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/site-status', siteStatusRoutes);


// Upload routes (admin only)
app.use('/api/upload', requireAuth, requireAdmin, uploadRoutes);

// Admin routes for drops and products
app.use('/api/admin/drops', requireAuth, requireAdmin, dropAdminRoutes);
app.use('/api/admin/products', requireAuth, requireAdmin, productAdminRoutes);
app.use('/api/admin/collections', requireAuth, requireAdmin, collectionAdminRoutes);

// Admin notification routes
const notificationAdminRoutes = require('./routes/notification.admin.routes');
app.use('/api/admin/notifications', requireAuth, requireAdmin, notificationAdminRoutes);

// Admin message routes
app.use('/api/admin/messages', requireAuth, requireAdmin, messageRoutes);

// Authenticated routes
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);

// Admin-only routes
app.use('/api/admin/orders', requireAuth, requireAdmin, orderAdminRoutes);
app.use('/api/admin/payments', requireAuth, requireAdmin, paymentRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, error: 'Not Found', path: req.path }));

// Error handler (placed after routes)
app.use(errorHandler);

// Debug: manual route listing (Express 5 removed app._router)
app.get('/__routes', (req, res) => {
  const routes = [];
  // We collect routes from the registered middleware stack
  app._router?.stack?.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => m !== '_constructor')
        .map((m) => m.toUpperCase());
      routes.push({
        method: methods.join(','),
        path: layer.route.path,
      });
    } else if (layer.name === 'router' && layer.handle?.stack) {
      layer.handle.stack.forEach((sub) => {
        if (sub.route) {
          const methods = Object.keys(sub.route.methods)
            .filter((m) => m !== '_constructor')
            .map((m) => m.toUpperCase());
          routes.push({
            method: methods.join(','),
            path: layer.handle?.url || '' + sub.route.path,
          });
        }
      });
    }
  });

  // Fallback: if _router is undefined (Express 5), we return our known routes
  if (!app._router) {
    return res.status(200).json({
      express_version: require('express/package.json').version,
      note: 'Express 5 removed app._router. Showing registered routes from known route files.',
      routes: [
        { method: 'GET', path: '/health' },
        { method: 'POST', path: '/api/auth/register' },
        { method: 'POST', path: '/api/auth/login' },
        { method: 'POST', path: '/api/auth/google' },
        { method: 'GET', path: '/api/auth/me' },
        { method: 'GET', path: '/api/drops/active' },
        { method: 'GET', path: '/api/drops' },
        { method: 'GET', path: '/api/drops/:slug' },
        { method: 'POST', path: '/api/admin/drops' },
        { method: 'PUT', path: '/api/admin/drops/:id' },
        { method: 'POST', path: '/api/admin/drops/:id/activate' },
        { method: 'GET', path: '/api/products' },
        { method: 'GET', path: '/api/products/:slug' },
        { method: 'GET', path: '/api/collections' },
        { method: 'GET', path: '/api/collections/:slug' },
        { method: 'POST', path: '/api/admin/collections' },
        { method: 'PUT', path: '/api/admin/collections/:id' },
        { method: 'DELETE', path: '/api/admin/collections/:id' },
        { method: 'POST', path: '/api/admin/collections/:id/products' },
        { method: 'DELETE', path: '/api/admin/collections/:id/products/:productId' },
        { method: 'POST', path: '/api/admin/products' },
        { method: 'PUT', path: '/api/admin/products/:id' },
        { method: 'DELETE', path: '/api/admin/products/:id' },
        { method: 'GET', path: '/api/cart' },
        { method: 'POST', path: '/api/cart/items' },
        { method: 'PUT', path: '/api/cart/items/:variantId' },
        { method: 'DELETE', path: '/api/cart/items/:variantId' },
        { method: 'DELETE', path: '/api/cart' },
        { method: 'POST', path: '/api/orders' },
        { method: 'GET', path: '/api/orders/my' },
        { method: 'GET', path: '/api/orders/:id' },
        { method: 'GET', path: '/api/admin/orders' },
        { method: 'PUT', path: '/api/admin/orders/:id/status' },
        { method: 'POST', path: '/api/admin/orders/:id/cancel' },
        { method: 'POST', path: '/api/admin/payments/verify' },
        { method: 'GET', path: '/api/notifications' },
        { method: 'GET', path: '/api/notifications/unread-count' },
        { method: 'PUT', path: '/api/notifications/read-all' },
        { method: 'PUT', path: '/api/notifications/:id/read' },
        { method: 'POST', path: '/api/waitlist' },
        { method: 'GET', path: '/api/waitlist' },
      ],
    });
  }

  res.status(200).json({ express_version: require('express/package.json').version, routes });
});

module.exports = { app };
