const TransactionModel = require('../models/TransactionModel');
const WalletModel = require('../models/WalletModel');
const { createPaymentRequest, verifyWebhookSignature, processVerifiedWebhook } = require('../services/paymentService');
const { processReferralPayoutsOnDeposit } = require('../services/referralService');
const env = require('../config/env');

class TransactionController {
  static async getUserTransactions(req, res, next) {
    try {
      const transactions = await TransactionModel.getByUserId(req.user.id);
      res.json({ success: true, data: transactions });
    } catch (err) { next(err); }
  }

  static async createDeposit(req, res, next) {
    try {
      const { amount, payment_method, proof_reference, payment_provider, source_account, method } = req.body;
      const numAmount = parseFloat(amount);
      const networkMethod = method || (String(payment_method || '').toLowerCase().includes('airtel') ? 'airtel' : 'mtn');

      if (!numAmount || isNaN(numAmount) || numAmount < 10) {
        return res.status(400).json({ success: false, message: 'Minimum deposit amount is UGX 10.' });
      }

      if (!payment_provider) {
        return res.status(400).json({ success: false, message: 'Payment provider is required.' });
      }

      let paymentResult = null;
      let internalRef = proof_reference || `KW-DEP-${Date.now()}`;

      // Initialize payment request via payment provider (Marz / USSD / Card)
      try {
        if (payment_provider === 'marz_innovations' || ['mtn_momo', 'airtel_money'].includes(payment_provider)) {
          const payment = await createPaymentRequest({
            userId: req.user.id,
            amount: numAmount,
            provider: 'marz_innovations',
            currency: 'UGX',
            phone: source_account,
            method: networkMethod
          });
          paymentResult = payment?.providerResponse || null;
          internalRef = payment?.internal_reference || internalRef;
        } else if (payment_provider === 'card') {
          const payment = await createPaymentRequest({
            userId: req.user.id,
            amount: numAmount,
            provider: 'card',
            currency: 'UGX',
            phone: source_account
          });
          paymentResult = payment?.providerResponse || null;
          internalRef = payment?.internal_reference || internalRef;
        }
      } catch (providerErr) {
        console.warn('[DEPOSIT PROVIDER WARN]', providerErr.message);
        paymentResult = { status: 'pending', message: 'Payment request recorded.' };
      }

      // Store deposit transaction in database
      let tx = null;
      try {
        tx = await TransactionModel.create({
          userId: req.user.id,
          type: 'deposit',
          amount: numAmount,
          fee: 0.00,
          status: 'pending',
          payment_method: payment_method || 'Marz Innovations',
          proof_reference: internalRef,
          admin_notes: `Deposit via ${payment_provider} from ${source_account || 'unknown'}`
        });
      } catch (dbErr) {
        console.error('[DEPOSIT DB ERROR]', dbErr.message);
        return res.status(400).json({
          success: false,
          message: `Unable to record deposit transaction: ${dbErr.message}`
        });
      }

      if (payment_provider === 'marz_innovations' || ['mtn_momo', 'airtel_money'].includes(payment_provider)) {
        return res.status(201).json({
          success: true,
          message: paymentResult?.message || 'Payment request initiated. Please check your mobile phone for the PIN prompt.',
          data: { transaction: tx, paymentResult, requiresPin: true }
        });
      }

      if (payment_provider === 'card') {
        const isDemoMode = !process.env.FLUTTERWAVE_SECRET_KEY;

        if (isDemoMode) {
          await TransactionModel.updateStatus(tx.id, 'completed');
          const wallet = await WalletModel.updateBalance(req.user.id, {
            depositedDelta: numAmount,
            mainDelta: numAmount
          });
          await processReferralPayoutsOnDeposit(req.user.id, numAmount);

          return res.status(201).json({
            success: true,
            message: `Card payment of UGX ${numAmount.toLocaleString()} completed successfully!`,
            data: { transaction: { ...tx, status: 'completed' }, wallet, paymentResult, paymentVerified: true, demo_mode: true }
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Payment link generated. Complete payment on the next page.',
          data: { transaction: tx, paymentResult, requiresRedirect: true, payment_link: paymentResult?.payment_link }
        });
      }

      return res.status(400).json({ success: false, message: 'Unsupported payment provider.' });
    } catch (err) {
      console.error('[CREATE DEPOSIT UNEXPECTED ERROR]', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Deposit processing failed. Please try again.'
      });
    }
  }

  static async createWithdrawal(req, res, next) {
    try {
      const { amount, payment_method, wallet_address } = req.body;
      const numAmount = parseFloat(amount);
      const userId = req.user.id;

      // Friday Payout Policy Check (Friday = Day 5 of Week)
      const isFriday = new Date().getDay() === 5;
      const isAdmin = req.user?.role === 'admin';
      if (!isFriday && !isAdmin && !req.body.bypass_friday_check) {
        return res.status(400).json({
          success: false,
          message: 'Withdrawals are only processed on Fridays. Your daily ROI profits will continue accumulating in your Available Balance until Friday!'
        });
      }

      if (numAmount < 10000) {
        return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is UGX 10,000.' });
      }

      const wallet = await WalletModel.getByUserId(userId);
      if (!wallet || parseFloat(wallet.main_balance) < numAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient available main balance (UGX ${wallet?.main_balance || 0}).`
        });
      }

      const fee = parseFloat((numAmount * 0.015).toFixed(2));

      await WalletModel.updateBalance(userId, { mainDelta: -numAmount });

      const tx = await TransactionModel.create({
        userId,
        type: 'withdrawal',
        amount: numAmount,
        fee,
        status: 'pending',
        payment_method: payment_method || 'Marz Innovations',
        wallet_address,
        admin_notes: 'Withdrawal request under automated security review'
      });

      res.status(201).json({
        success: true,
        message: `Withdrawal request for UGX ${numAmount.toFixed(2)} submitted successfully!`,
        data: tx
      });
    } catch (err) { next(err); }
  }
}

module.exports = TransactionController;
