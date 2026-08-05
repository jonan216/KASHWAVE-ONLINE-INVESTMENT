const express = require('express');
const { body } = require('express-validator');
const UserController = require('../controllers/UserController');
const authenticateToken = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', UserController.getProfile);

router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    validate
  ],
  UserController.changePassword
);

module.exports = router;
