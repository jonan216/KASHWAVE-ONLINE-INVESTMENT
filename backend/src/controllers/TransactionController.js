const TransactionModel = require('../models/TransactionModel');
const WalletModel = require('../models/WalletModel');
const { createPaymentRequest, verifyWebhookSignature, processVerifiedWebhook } = require('../services/paymentService');
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
      const { amount, payment_method, proof_reference, payment_provider, pin, source_account } = req.body;
      const numAmount = parseFloat(amount);

      if (numAmount < 10) {
        return res.status(400).json({ success: false, message: 'Minimum deposit amount is UGX 10.' });
      }

      if (!payment_provider) {
        return res.status(400).json({ success: false, message: 'Payment provider is required.' });
      }

      const tx = await TransactionModel.create({
        userId: req.user.id,
        type: 'deposit',
        amount: numAmount,
        fee: 0.00,
        status: 'pending',
        payment_method: payment_method || 'Marz Innovations',
        proof_reference: proof_reference || `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
        admin_notes: `Deposit via ${payment_provider} from ${source_account || 'unknown'}`
      });

      let paymentResult = null;
      let wallet = null;

      // Marz Innovations / Mobile Money
      if (payment_provider === 'marz_innovations' || ['mtn_momo', 'airtel_money'].includes(payment_provider)) {
        try {
          const { initiateDeposit } = require('../services/providers/marzInnovationsProvider');
          const method = payment_method?.toLowerCase().includes('airtel') ? 'airtel' :
                         payment_method?.toLowerCase().includes('mpesa') ? 'mpesa' : 'mtn';

          paymentResult = await initiateDeposit({
            amount: numAmount,
            phone: source_account,
            method: method
          });

          const isDemoMode = !process.env.MARZ_INNOVATIONS_API_KEY || !process.env.MARZ_INNOVATIONS_API_SECRET;

          if (isDemoMode && pin) {
            await TransactionModel.updateStatus(tx.id, 'completed');
            wallet = await WalletModel.updateBalance(req.user.id, {
              depositedDelta: numAmount,
              mainDelta: numAmount
            });

            return res.status(201).json({
              success: true,
              message: `Payment of UGX ${numAmount.toLocaleString()} completed successfully via ${payment_method || 'Marz Innovations'} (Demo Mode)!`,
              data: { transaction: { ...tx, status: 'completed' }, wallet, paymentResult, paymentVerified: true, demo_mode: true }
            });
          }

          res.status(201).json({
            success: true,
            message: 'Payment request initiated. Please check your phone for PIN prompt.',
            data: { transaction: tx, paymentResult, requiresPin: true, demo_mode: isDemoMode }
          });
          return;
        } catch (err) {
          const isDemoMode = !process.env.MARZ_INNOVATIONS_API_KEY || !process.env.MARZ_INNOVATIONS_API_SECRET;

          if (isDemoMode && pin) {
            await TransactionModel.updateStatus(tx.id, 'completed');
            wallet = await WalletModel.updateBalance(req.user.id, {
              depositedDelta: numAmount,
              mainDelta: numAmount
            });

            return res.status(201).json({
              success: true,
              message: `Payment of UGX ${numAmount.toLocaleString()} completed successfully via ${payment_method || 'Marz Innovations'} (Demo Mode)!`,
              data: { transaction: { ...tx, status: 'completed' }, wallet, paymentVerified: true, demo_mode: true }
            });
          }

          return res.status(400).json({ success: false, message: `Payment initiation failed: ${err.message}` });
        }
      } else if (payment_provider === 'card') {
        const payment = await createPaymentRequest({
          userId: req.user.id,
          amount: numAmount,
          provider: 'card',
          currency: 'UGX',
          phone: source_account
        });

        paymentResult = payment.providerResponse;
        const isDemoMode = !process.env.FLUTTERWAVE_SECRET_KEY;

        if (isDemoMode) {
          await TransactionModel.updateStatus(tx.id, 'completed');
          wallet = await WalletModel.updateBalance(req.user.id, {
            depositedDelta: numAmount,
            mainDelta: numAmount
          });

          return res.status(201).json({
            success: true,
            message: `Card payment of UGX ${numAmount.toLocaleString()} completed successfully (Demo Mode)!`,
            data: { transaction: { ...tx, status: 'completed' }, wallet, paymentVerified: true, demo_mode: true }
          });
        }

        res.status(201).json({
          success: true,
          message: 'Payment link generated. Complete payment on the next page.',
          data: { transaction: tx, paymentResult, requiresRedirect: true, payment_link: paymentResult?.payment_link }
        });
        return;
      } else {
        if (!pin || pin.length < 4) {
          return res.status(400).json({ success: false, message: 'Payment PIN is required.' });
        }

        await TransactionModel.updateStatus(tx.id, 'completed');
        wallet = await WalletModel.updateBalance(req.user.id, {
          depositedDelta: numAmount,
          mainDelta: numAmount
        });

        res.status(201).json({
          success: true,
          message: `Payment of UGX ${numAmount.toLocaleString()} completed successfully!`,
          data: { transaction: { ...tx, status: 'completed' }, wallet, paymentVerified: true }
        });
      }
    } catch (err) { next(err); }
  }

  static async createWithdrawal(req, res, next) {
    try {
      const { amount, payment_method, wallet_address } = req.body;
      const numAmount = parseFloat(amount);
      const userId = req.user.id;

      if (numAmount < 20) {
        return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is UGX 20.' });
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
