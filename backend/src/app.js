const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { testConnection, isPostgresConnected } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const maskSensitiveData = require('./middleware/maskSensitiveData');
const { validateCsrfToken } = require('./middleware/csrfProtection');
const { verifyAccessToken } = require('./utils/token');

// Security middlewares
const requestId = require('./middleware/requestId');

// Route imports
const authRoutes = require('./routes/authRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const kycRoutes = require('./routes/kycRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const cronRoutes = require('./routes/cronRoutes');

const app = express();

app.set('trust proxy', 1);

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true }
}));

app.use(requestId);

app.use(cookieParser());

app.use(hpp());

app.use(cors({
  origin: env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use(globalLimiter);

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

const transactionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many transaction requests. Please try again after 5 minutes.' }
});
app.use('/api/transactions/deposit', transactionLimiter);
app.use('/api/transactions/withdraw', transactionLimiter);

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many token refresh attempts. Please try again later.' }
});
app.use('/api/auth/refresh', refreshLimiter);

const csrfProtectedRoutes = ['/api/transactions', '/api/admin', '/api/users', '/api/kyc'];
app.use((req, res, next) => {
  if (csrfProtectedRoutes.some(route => req.path.startsWith(route)) && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'];
    let userId = req.user?.id;
    if (!userId) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = verifyAccessToken(token);
          userId = decoded.id;
        } catch (err) {
          // token invalid, leave userId undefined
        }
      }
    }
    if (!csrfToken || !userId || !validateCsrfToken(userId, csrfToken)) {
      return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token.' });
    }
  }
  next();
});


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

app.get('/api/marztest', async (req, res) => {
  try {
    const { testConnection } = require('./services/providers/marzInnovationsProvider');
    const env = require('./config/env');
    const result = await testConnection();
    return res.json({
      success: true,
      credentials_configured: !!(env.MARZ_INNOVATIONS_API_KEY && env.MARZ_INNOVATIONS_API_SECRET),
      api_key_set: !!env.MARZ_INNOVATIONS_API_KEY,
      api_secret_set: !!env.MARZ_INNOVATIONS_API_SECRET,
      base_url: env.MARZ_INNOVATIONS_BASE_URL || 'https://wallet.wearemarz.com/api/v1',
      callback_url: env.MARZPAY_CALLBACK_URL || 'https://kashwave-online-investment.vercel.app/api/webhooks/marz',
      ...result
    });
  } catch (err) {
    return res.status(500).json({ success: false, connected: false, reason: err.message });
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
app.use('/api/cron', cronRoutes);

app.use(maskSensitiveData);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Route not found.' });
});

// Global Error Handler
app.use(errorHandler);

// Start standalone server only when app.js is executed directly (not when required as a serverless function)
if (require.main === module) {
  testConnection().then(() => {
    const connected = isPostgresConnected();
    console.log(connected ? 'PostgreSQL Database Connected Successfully.' : 'Using in-memory Mock Store mode.');
    const { processROIPayouts } = require('./services/roiEngine');
    // Run initial check on startup & repeat every 60 seconds
    processROIPayouts().catch(err => console.error('[ROI STARTUP CRON ERROR]', err.message));
    setInterval(() => {
      processROIPayouts().catch(err => console.error('[ROI BACKGROUND TICKER ERROR]', err.message));
    }, 60000);

    app.listen(env.PORT, () => {
      console.log(`=======================================================`);
      console.log(`  KASHWAVE API Server running on port ${env.PORT}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`=======================================================`);
    });
  });
}

module.exports = app;
