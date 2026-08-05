const express = require('express');
const { body } = require('express-validator');
const InvestmentController = require('../controllers/InvestmentController');
const authenticateToken = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.get('/plans', InvestmentController.getPlans);
router.get('/calculate', InvestmentController.calculateReturn);

router.get('/my-investments', authenticateToken, InvestmentController.getUserInvestments);

router.post(
  '/invest',
  [
    authenticateToken,
    body('plan_id').notEmpty().withMessage('Plan ID is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Valid investment amount is required'),
    validate
  ],
  InvestmentController.createInvestment
);

module.exports = router;
