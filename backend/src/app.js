const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { testConnection, isPostgresConnected } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const kycRoutes = require('./routes/kycRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

app.set('trust proxy', 1);

// Disable x-powered-by header (done by helmet too, but good practice)
app.disable('x-powered-by');

// Enforce HTTP Security Headers via Helmet
app.use(helmet());

// Cookie Parser for JWT storage in httpOnly secure cookies
app.use(cookieParser());

// Prevent HTTP Parameter Pollution (HPP)
app.use(hpp());

// Global CORS Configuration
app.use(cors({
  origin: env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Payload Body size limit to prevent Denial of Service (DoS) attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Global Security rate limiter (300 requests / 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use(globalLimiter);

// Specific Auth Brute-force rate limiter (10 requests / 10 minutes for registration/login/forgot password)
const authBruteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 10 minutes.' }
});

app.use('/api/auth/login', authBruteLimiter);
app.use('/api/auth/register', authBruteLimiter);
app.use('/api/auth/forgot-password', authBruteLimiter);


// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'KASHWAVE ONLINE INVESTMENT PLATFORM',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/dbtest', async (req, res) => {
  try {
    const { pool, isPostgresConnected } = require('./config/db');
    if (!pool) return res.json({ connected: false, reason: 'no_pool' });
    const client = await pool.connect();
    const r = await client.query('SELECT NOW()');
    client.release();
    res.json({ connected: true, time: r.rows[0].now, isPostgresConnected });
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Route not found.' });
});

// Global Error Handler
app.use(errorHandler);

// Always test DB connection, start server only locally
testConnection().then(() => {
  const connected = isPostgresConnected();
  console.log(connected ? 'PostgreSQL Database Connected Successfully.' : 'Using in-memory Mock Store mode.');
  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(env.PORT, () => {
      console.log(`=======================================================`);
      console.log(`  KASHWAVE API Server running on port ${env.PORT}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`=======================================================`);
    });
  }
});

module.exports = app;
