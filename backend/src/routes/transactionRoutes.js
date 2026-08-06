const express = require('express');
const { body } = require('express-validator');
const TransactionController = require('../controllers/TransactionController');
const authenticateToken = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.post('/notify', (req, res) => {
  const { phone, amount, method, provider } = req.body;
  console.log(`[PAYMENT NOTIFICATION] Sending PIN request to ${phone} from ${provider || 'Marz Innovations'} for ${amount} via ${method}`);
  res.json({
    success: true,
    message: `PIN request sent to ${phone} from ${provider || 'Marz Innovations'}`,
    data: { phone, amount, method, provider: provider || 'Marz Innovations', status: 'sent' }
  });
});

router.get('/providers', (req, res) => {
  const env = require('../config/env');
  res.json({
    success: true,
    data: {
      providers: [
        { id: 'MTN Mobile Money', label: 'MTN Mobile Money', type: 'momo', desc: 'Secure MTN Mobile Money deposit' },
        { id: 'Airtel Money', label: 'Airtel Money', type: 'momo', desc: 'Secure Airtel Mobile Money deposit' },
        { id: 'Visa Card', label: 'Visa Card', type: 'card', desc: 'Debit / Credit card checkout' },
        { id: 'MasterCard', label: 'MasterCard', type: 'card', desc: 'Debit / Credit card checkout' },
        { id: 'Bank Transfer', label: 'Bank Transfer', type: 'bank', desc: 'Direct wire & online banking' },
        { id: 'Marz Innovations', label: 'Marz Innovations', type: 'manual', desc: 'WhatsApp/Email verified payments', badge: 'UG' }
      ],
      marz_innovations: {
        name: env.PAYMENT_PROVIDER_NAME || 'Marz Innovations',
        email: env.PAYMENT_PROVIDER_EMAIL || 'tumukwasibwereymond@gmail.com',
        phone: env.PAYMENT_PROVIDER_PHONE || '+256771178213'
      }
    }
  });
});

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
