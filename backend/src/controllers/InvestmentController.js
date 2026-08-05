const PlanModel = require('../models/PlanModel');
const InvestmentModel = require('../models/InvestmentModel');
const WalletModel = require('../models/WalletModel');
const TransactionModel = require('../models/TransactionModel');

class InvestmentController {
  static async getPlans(req, res, next) {
    try {
      const plans = await PlanModel.getAllActive();
      res.json({ success: true, data: plans });
    } catch (err) {
      next(err);
    }
  }

  static async getUserInvestments(req, res, next) {
    try {
      const investments = await InvestmentModel.getByUserId(req.user.id);
      res.json({ success: true, data: investments });
    } catch (err) {
      next(err);
    }
  }

  static async createInvestment(req, res, next) {
    try {
      const { plan_id, amount } = req.body;
      const userId = req.user.id;
      const numAmount = parseFloat(amount);

      const plan = await PlanModel.findById(plan_id);
      if (!plan || plan.status !== 'active') {
        return res.status(404).json({ success: false, message: 'Investment plan not found or inactive.' });
      }

      if (numAmount < parseFloat(plan.min_investment) || numAmount > parseFloat(plan.max_investment)) {
        return res.status(400).json({
          success: false,
          message: `Investment amount must be between $${plan.min_investment} and $${plan.max_investment}.`
        });
      }

      const wallet = await WalletModel.getByUserId(userId);
      if (!wallet || parseFloat(wallet.main_balance) < numAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient main balance ($${wallet?.main_balance || 0}). Please make a deposit first.`
        });
      }

      // Calculate total expected ROI
      const totalPercentage = parseFloat(plan.daily_return_percent) * parseInt(plan.duration_days);
      const profit = (numAmount * totalPercentage) / 100;
      const expectedReturn = numAmount + profit;

      // 1. Deduct from main balance, add to investment balance
      const updatedWallet = await WalletModel.updateBalance(userId, {
        mainDelta: -numAmount,
        investmentDelta: numAmount
      });

      // 2. Create investment record
      const investment = await InvestmentModel.create({
        userId,
        planId: plan.id,
        investedAmount: numAmount,
        expectedReturn,
        durationDays: plan.duration_days
      });

      // 3. Log transaction
      await TransactionModel.create({
        userId,
        type: 'investment',
        amount: numAmount,
        status: 'completed',
        payment_method: 'Wallet Balance',
        admin_notes: `Invested in ${plan.title} (${plan.daily_return_percent}% daily for ${plan.duration_days} days)`
      });

      res.status(201).json({
        success: true,
        message: `Successfully invested $${numAmount.toFixed(2)} in ${plan.title}!`,
        data: { investment, wallet: updatedWallet }
      });
    } catch (err) {
      next(err);
    }
  }

  static async calculateReturn(req, res, next) {
    try {
      const { plan_id, amount } = req.query;
      const plan = await PlanModel.findById(plan_id);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Plan not found.' });
      }

      const numAmount = parseFloat(amount || plan.min_investment);
      const dailyReturn = (numAmount * parseFloat(plan.daily_return_percent)) / 100;
      const totalProfit = dailyReturn * parseInt(plan.duration_days);
      const totalPayout = numAmount + totalProfit;

      res.json({
        success: true,
        data: {
          investedAmount: numAmount,
          dailyReturn: parseFloat(dailyReturn.toFixed(2)),
          totalProfit: parseFloat(totalProfit.toFixed(2)),
          totalPayout: parseFloat(totalPayout.toFixed(2)),
          durationDays: plan.duration_days,
          dailyPercent: plan.daily_return_percent
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InvestmentController;
