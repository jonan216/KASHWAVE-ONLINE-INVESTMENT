const express = require('express');
const { body } = require('express-validator');
const TransactionController = require('../controllers/TransactionController');
const authenticateToken = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/', TransactionController.getUserTransactions);

router.post(
  '/deposit',
  [
    body('amount').isFloat({ min: 10 }).withMessage('Minimum deposit is $10.00'),
    body('payment_method').notEmpty().withMessage('Payment method required'),
    validate
  ],
  TransactionController.createDeposit
);

router.post(
  '/withdraw',
  [
    body('amount').isFloat({ min: 20 }).withMessage('Minimum withdrawal is $20.00'),
    body('wallet_address').notEmpty().withMessage('Destination wallet address required'),
    validate
  ],
  TransactionController.createWithdrawal
);

module.exports = router;
