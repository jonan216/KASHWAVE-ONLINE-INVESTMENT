const TransactionModel = require('../models/TransactionModel');
const WalletModel = require('../models/WalletModel');
const { createPaymentRequest } = require('../services/paymentService');

class TransactionController {
  static async getUserTransactions(req, res, next) {
    try {
      const transactions = await TransactionModel.getByUserId(req.user.id);
      res.json({ success: true, data: transactions });
    } catch (err) { next(err); }
  }

  static async createDeposit(req, res, next) {
    try {
      const { amount, payment_method, proof_reference, payment_provider } = req.body;
      const numAmount = parseFloat(amount);

      if (numAmount < 10) {
        return res.status(400).json({ success: false, message: 'Minimum deposit amount is $10.00.' });
      }

      const tx = await TransactionModel.create({
        userId: req.user.id,
        type: 'deposit',
        amount: numAmount,
        fee: 0.00,
        status: 'pending',
        payment_method: payment_method || 'Marz Innovations',
        proof_reference: proof_reference || `TXID_${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
        admin_notes: 'Deposit pending admin verification'
      });

      let paymentInstructions = null;
      if (payment_provider && ['manual', 'mtn_momo', 'airtel_money'].includes(payment_provider)) {
        const payment = await createPaymentRequest({
          userId: req.user.id,
          amount: numAmount,
          provider: payment_provider
        });
        paymentInstructions = payment.providerResponse || null;
      }

      res.status(201).json({
        success: true,
        message: paymentInstructions
          ? `Deposit request submitted! Follow the payment instructions to complete.`
          : `Deposit request submitted successfully! Funds will reflect once confirmed.`,
        data: { transaction: tx, paymentInstructions: paymentInstructions || undefined }
      });
    } catch (err) { next(err); }
  }

  static async createWithdrawal(req, res, next) {
    try {
      const { amount, payment_method, wallet_address } = req.body;
      const numAmount = parseFloat(amount);
      const userId = req.user.id;

      if (numAmount < 20) {
        return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is $20.00.' });
      }

      const wallet = await WalletModel.getByUserId(userId);
      if (!wallet || parseFloat(wallet.main_balance) < numAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient available main balance ($${wallet?.main_balance || 0}).`
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
        payment_method: payment_method || 'USDT (TRC20)',
        wallet_address,
        admin_notes: 'Withdrawal request under automated security review'
      });

      res.status(201).json({
        success: true,
        message: `Withdrawal request for $${numAmount.toFixed(2)} submitted successfully!`,
        data: tx
      });
    } catch (err) { next(err); }
  }
}

module.exports = TransactionController;
