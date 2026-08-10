const TransactionModel = require('../models/TransactionModel');
const WalletModel = require('../models/WalletModel');
const UserModel = require('../models/UserModel');
const PlanModel = require('../models/PlanModel');
const InvestmentModel = require('../models/InvestmentModel');
const { pool, mockStore, isPostgresConnected } = require('../config/db');
const { reviewKYC, getKYCStatus } = require('../services/kycService');
const { processROIPayouts } = require('../services/roiEngine');
const { sendWithdrawalStatusEmail } = require('../services/emailService');
const { processReferralPayoutsOnDeposit } = require('../services/referralService');

class AdminController {
  static async getStats(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
      }
      const allUsers       = await UserModel.getAllUsers();
      const allTransactions = await TransactionModel.getAll();
      const allInvestments = await InvestmentModel.getAll();

      const pendingDeposits    = allTransactions.filter(t => t.type === 'deposit'    && t.status === 'pending');
      const pendingWithdrawals = allTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
      const activeInvestments  = allInvestments.filter(i => i.status === 'active');

      const totalVolume = allTransactions
        .filter(t => t.status === 'completed' || t.status === 'approved')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const platformEarnings = allTransactions
        .filter(t => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.fee || 0), 0);

      res.json({
        success: true,
        data: {
          totalUsers: allUsers.length,
          totalVolume: parseFloat(totalVolume.toFixed(2)),
          platformEarnings: parseFloat(platformEarnings.toFixed(2)),
          pendingDepositsCount: pendingDeposits.length,
          pendingWithdrawalsCount: pendingWithdrawals.length,
          activeInvestmentsCount: activeInvestments.length,
          pendingDepositsAmount:    pendingDeposits.reduce((s, t) => s + parseFloat(t.amount), 0),
          pendingWithdrawalsAmount: pendingWithdrawals.reduce((s, t) => s + parseFloat(t.amount), 0)
        }
      });
    } catch (err) { next(err); }
  }

  // ─── Transactions ─────────────────────────────────────────────────────────
  static async getAllTransactions(req, res, next) {
    try {
      const transactions = await TransactionModel.getAll();
      res.json({ success: true, data: transactions });
    } catch (err) { next(err); }
  }

  static async approveTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const { admin_notes } = req.body;

      const tx = await TransactionModel.findById(id);
      if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });
      if (tx.status !== 'pending') return res.status(400).json({ success: false, message: `Transaction is already ${tx.status}.` });

      if (tx.type === 'deposit') {
        await WalletModel.updateBalance(tx.user_id, { mainDelta: parseFloat(tx.amount), depositedDelta: parseFloat(tx.amount) });
        await processReferralPayoutsOnDeposit(tx.user_id, parseFloat(tx.amount));
      } else if (tx.type === 'withdrawal') {
        await WalletModel.updateBalance(tx.user_id, { withdrawnDelta: parseFloat(tx.amount) });
      }

      const updatedTx = await TransactionModel.updateStatus(id, 'approved', admin_notes || 'Approved by Administrator');
      await req.audit('transaction_approved', { userId: req.user.id, description: `Approved tx ${tx.reference_code}`, resourceType: 'transaction', resourceId: parseInt(id), severity: 'info' });

      res.json({ success: true, message: `Transaction ${tx.reference_code} approved successfully!`, data: updatedTx });
    } catch (err) { next(err); }
  }

  static async rejectTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const { admin_notes } = req.body;

      const tx = await TransactionModel.findById(id);
      if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });
      if (tx.status !== 'pending') return res.status(400).json({ success: false, message: `Transaction is already ${tx.status}.` });

      if (tx.type === 'withdrawal') {
        await WalletModel.updateBalance(tx.user_id, { mainDelta: parseFloat(tx.amount) });
      }

      const updatedTx = await TransactionModel.updateStatus(id, 'rejected', admin_notes || 'Rejected by Administrator');
      await req.audit('transaction_rejected', { userId: req.user.id, description: `Rejected tx ${tx.reference_code}`, resourceType: 'transaction', resourceId: parseInt(id), severity: 'warning' });

      res.json({ success: true, message: `Transaction ${tx.reference_code} rejected.`, data: updatedTx });
    } catch (err) { next(err); }
  }

  // ─── Investments ──────────────────────────────────────────────────────────
  static async getAllInvestments(req, res, next) {
    try {
      const investments = await InvestmentModel.getAll();
      res.json({ success: true, data: investments });
    } catch (err) { next(err); }
  }

  static async purgeTestAccounts(req, res, next) {
    try {
      const result = await UserModel.purgeTestAccounts();
      await req.audit('test_accounts_purged', {
        userId: req.user.id,
        description: `Purged ${result.count} test user account(s).`,
        severity: 'warning'
      });
      res.json({
        success: true,
        message: `Successfully purged ${result.count} test account(s) from the system.`,
        data: result
      });
    } catch (err) { next(err); }
  }

  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      if (userId === req.user.id) {
        return res.status(400).json({ success: false, message: 'You cannot delete your own administrator account.' });
      }

      let deletedUser = null;
      let deleteError = null;

      try {
        deletedUser = await UserModel.deleteUserById(userId);
      } catch (err) {
        deleteError = err.message;
        console.error('[ADMIN DELETE USER ERROR]', err.message, err.stack);
      }

      if (deleteError && !deletedUser) {
        return res.status(500).json({
          success: false,
          message: `Failed to delete user: ${deleteError}`
        });
      }

      if (!deletedUser) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
      }

      // Log audit (non-blocking — never let this fail the response)
      try {
        await req.audit('user_deleted_by_admin', {
          userId: req.user.id,
          description: `Admin deleted user ID ${userId} (${deletedUser.email || deletedUser.full_name || 'unknown'})`,
          severity: 'warning'
        });
      } catch (_) {}

      return res.json({
        success: true,
        message: `User account has been permanently deleted from the system.`
      });
    } catch (err) {
      console.error('[DELETE USER UNEXPECTED]', err);
      return res.status(500).json({ success: false, message: `Delete failed: ${err.message}` });
    }
  }

  // ─── User Management ──────────────────────────────────────────────────────
  static async getAllUsers(req, res, next) {
    try {
      const users = await UserModel.getAllUsers();
      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  }

  static async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value.' });
      }
      await UserModel.updateUserStatus(id, status);
      await req.audit(`user_status_${status}`, { userId: req.user.id, resourceType: 'user', resourceId: parseInt(id), severity: status === 'suspended' ? 'warning' : 'info' });
      res.json({ success: true, message: `User status updated to ${status}.` });
    } catch (err) { next(err); }
  }

  static async getUserAuditLogs(req, res, next) {
    try {
      const { id } = req.params;
      let logs = [];
      if (isPostgresConnected() && pool) {
        const result = await pool.query(
          `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [id]
        );
        logs = result.rows;
      } else {
        logs = (mockStore.audit_logs || []).filter(l => l.user_id === parseInt(id));
      }
      res.json({ success: true, data: logs });
    } catch (err) { next(err); }
  }

  // ─── KYC Review Workflow ──────────────────────────────────────────────────
  static async getAllKYCSubmissions(req, res, next) {
    try {
      let submissions = [];
      const { status } = req.query;
      if (isPostgresConnected() && pool) {
        const query = status
          ? `SELECT k.*, u.full_name, u.email FROM kyc_verification k JOIN users u ON k.user_id = u.id WHERE k.verification_status = $1 ORDER BY k.submitted_date DESC`
          : `SELECT k.*, u.full_name, u.email FROM kyc_verification k JOIN users u ON k.user_id = u.id ORDER BY k.submitted_date DESC`;
        const result = await pool.query(query, status ? [status] : []);
        submissions = result.rows;
      } else {
        submissions = mockStore.kyc || [];
      }
      res.json({ success: true, data: submissions });
    } catch (err) { next(err); }
  }

  static async getKYCDetail(req, res, next) {
    try {
      const { id } = req.params;
      let kyc = null;
      if (isPostgresConnected() && pool) {
        const result = await pool.query(
          `SELECT k.*, u.full_name, u.email, u.phone_number FROM kyc_verification k JOIN users u ON k.user_id = u.id WHERE k.id = $1`, [id]
        );
        kyc = result.rows[0];
      } else {
        kyc = (mockStore.kyc || []).find(k => k.id === parseInt(id));
      }
      if (!kyc) return res.status(404).json({ success: false, message: 'KYC record not found.' });
      res.json({ success: true, data: kyc });
    } catch (err) { next(err); }
  }

  static async reviewKYCSubmission(req, res, next) {
    try {
      const { id } = req.params;
      const { decision, comment } = req.body;
      const result = await reviewKYC({ kycId: parseInt(id), adminId: req.user.id, decision, comment });
      await req.audit(`kyc_${decision}`, { userId: req.user.id, resourceType: 'kyc_verification', resourceId: parseInt(id), severity: decision === 'rejected' ? 'warning' : 'info' });
      res.json({ success: true, message: `KYC ${decision} successfully.`, data: result });
    } catch (err) { next(err); }
  }

  // ─── Investment Plan Management ───────────────────────────────────────────
  static async getAllPlans(req, res, next) {
    try {
      const plans = await PlanModel.getAll();
      res.json({ success: true, data: plans });
    } catch (err) { next(err); }
  }

  static async createPlan(req, res, next) {
    try {
      const plan = await PlanModel.create(req.body);
      await req.audit('plan_created', { userId: req.user.id, resourceType: 'investment_plan', newValue: req.body, severity: 'info' });
      res.status(201).json({ success: true, message: 'Investment plan created successfully!', data: plan });
    } catch (err) { next(err); }
  }

  static async updatePlan(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await PlanModel.update(id, req.body);
      await req.audit('plan_updated', { userId: req.user.id, resourceType: 'investment_plan', resourceId: parseInt(id), newValue: req.body, severity: 'info' });
      res.json({ success: true, message: 'Investment plan updated successfully!', data: plan });
    } catch (err) { next(err); }
  }

  static async togglePlanStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['active', 'inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be active or inactive.' });
      const plan = await PlanModel.update(id, { status });
      res.json({ success: true, message: `Plan ${status}.`, data: plan });
    } catch (err) { next(err); }
  }

  static async deletePlan(req, res, next) {
    try {
      const { id } = req.params;
      if (isPostgresConnected() && pool) {
        await pool.query(`UPDATE investment_plans SET status = 'inactive' WHERE id = $1`, [id]);
      } else {
        const plan = (mockStore.plans || []).find(p => p.id === parseInt(id));
        if (plan) plan.status = 'inactive';
      }
      await req.audit('plan_deactivated', { userId: req.user.id, resourceType: 'investment_plan', resourceId: parseInt(id), severity: 'warning' });
      res.json({ success: true, message: 'Investment plan deactivated.' });
    } catch (err) { next(err); }
  }

  // ─── ROI Settings Engine ──────────────────────────────────────────────────
  static async getAllROISettings(req, res, next) {
    try {
      let settings = [];
      if (isPostgresConnected() && pool) {
        const result = await pool.query(
          `SELECT r.*, ip.title as plan_title FROM roi_settings r JOIN investment_plans ip ON r.investment_plan_id = ip.id ORDER BY r.created_at DESC`
        );
        settings = result.rows;
      } else {
        settings = mockStore.roi_settings || [];
      }
      res.json({ success: true, data: settings });
    } catch (err) { next(err); }
  }

  static async createROISetting(req, res, next) {
    try {
      const { investment_plan_id, profit_percentage, calculation_type, duration } = req.body;
      let setting = null;
      if (isPostgresConnected() && pool) {
        const result = await pool.query(
          `INSERT INTO roi_settings (investment_plan_id, profit_percentage, calculation_type, duration, created_by)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [investment_plan_id, profit_percentage, calculation_type, duration, req.user.id]
        );
        setting = result.rows[0];
      } else {
        setting = { id: Date.now(), investment_plan_id, profit_percentage, calculation_type, duration, active_status: true };
        mockStore.roi_settings = mockStore.roi_settings || [];
        mockStore.roi_settings.push(setting);
      }
      await req.audit('roi_setting_created', { userId: req.user.id, resourceType: 'roi_settings', newValue: req.body, severity: 'info' });
      res.status(201).json({ success: true, message: 'ROI rule created successfully!', data: setting });
    } catch (err) { next(err); }
  }

  static async updateROISetting(req, res, next) {
    try {
      const { id } = req.params;
      const { profit_percentage, calculation_type, duration } = req.body;
      let setting = null;
      if (isPostgresConnected() && pool) {
        const result = await pool.query(
          `UPDATE roi_settings SET profit_percentage=$1, calculation_type=$2, duration=$3, updated_at=NOW()
           WHERE id=$4 RETURNING *`,
          [profit_percentage, calculation_type, duration, id]
        );
        setting = result.rows[0];
      }
      await req.audit('roi_setting_updated', { userId: req.user.id, resourceType: 'roi_settings', resourceId: parseInt(id), newValue: req.body, severity: 'info' });
      res.json({ success: true, message: 'ROI rule updated.', data: setting });
    } catch (err) { next(err); }
  }

  static async toggleROISetting(req, res, next) {
    try {
      const { id } = req.params;
      let setting = null;
      if (isPostgresConnected() && pool) {
        const result = await pool.query(
          `UPDATE roi_settings SET active_status = NOT active_status, updated_at = NOW() WHERE id = $1 RETURNING *`, [id]
        );
        setting = result.rows[0];
      }
      await req.audit('roi_setting_toggled', { userId: req.user.id, resourceType: 'roi_settings', resourceId: parseInt(id), severity: 'info' });
      res.json({ success: true, message: `ROI rule ${setting?.active_status ? 'activated' : 'deactivated'}.`, data: setting });
    } catch (err) { next(err); }
  }

  static async triggerROIPayouts(req, res, next) {
    try {
      const result = await processROIPayouts();
      await req.audit('roi_payout_manual_trigger', { userId: req.user.id, description: `Admin manually triggered ROI payout run. Processed: ${result.processedCount}`, severity: 'info' });
      res.json({ success: true, message: `ROI payouts complete. Processed ${result.processedCount} investments.`, data: result });
    } catch (err) { next(err); }
  }

  // ─── Audit Logs ──────────────────────────────────────────────────────────
  static async getAuditLogs(req, res, next) {
    try {
      const { severity, action, limit = 100 } = req.query;
      let logs = [];
      if (isPostgresConnected() && pool) {
        let query = `SELECT a.*, u.full_name, u.email FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1`;
        const params = [];
        if (severity) { params.push(severity); query += ` AND a.severity = $${params.length}`; }
        if (action)   { params.push(`%${action}%`); query += ` AND a.action ILIKE $${params.length}`; }
        params.push(parseInt(limit));
        query += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;
        const result = await pool.query(query, params);
        logs = result.rows;
      } else {
        logs = (mockStore.audit_logs || []).slice(0, parseInt(limit));
      }
      res.json({ success: true, data: logs });
    } catch (err) { next(err); }
  }
}

module.exports = AdminController;
