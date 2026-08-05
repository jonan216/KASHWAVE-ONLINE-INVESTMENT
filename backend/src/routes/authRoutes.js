const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const authenticateToken = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
    body('referred_by_code').optional().trim(),
    validate
  ],
  AuthController.register
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  AuthController.login
);

router.post('/refresh', AuthController.refreshToken);

router.get('/me', authenticateToken, AuthController.getMe);

router.post('/2fa/setup', authenticateToken, AuthController.setup2FA);

router.post(
  '/2fa/verify',
  [
    authenticateToken,
    body('secret').trim().notEmpty().withMessage('Secret is required'),
    body('token').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit 2FA token required'),
    validate
  ],
  AuthController.verify2FA
);

router.post(
  '/2fa/disable',
  [
    authenticateToken,
    body('token').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit 2FA token required'),
    validate
  ],
  AuthController.disable2FA
);

router.post(
  '/forgot-password',
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    validate
  ],
  AuthController.forgotPassword
);

router.post('/verify-email', AuthController.verifyEmail);

router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;
