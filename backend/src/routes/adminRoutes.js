const express = require('express');
const { body } = require('express-validator');
const AdminController = require('../controllers/AdminController');
const authenticateToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/rbacMiddleware');
const validate = require('../middleware/validateMiddleware');
const { auditMiddleware } = require('../middleware/auditLogger');

const router = express.Router();

// ─── MarzPay Gateway Health Check (Public monitoring endpoint) ───────────────
router.get('/marzpay/health', async (req, res) => {
  try {
    const { testConnection } = require('../services/providers/marzInnovationsProvider');
    const env = require('../config/env');
    const result = await testConnection();
    return res.json({
      success: true,
      credentials_configured: !!(env.MARZ_INNOVATIONS_API_KEY && env.MARZ_INNOVATIONS_API_SECRET),
      api_key_set: !!env.MARZ_INNOVATIONS_API_KEY,
      api_secret_set: !!env.MARZ_INNOVATIONS_API_SECRET,
      base_url: env.MARZ_INNOVATIONS_BASE_URL || 'https://wallet.wearemarz.com/api/v1',
      callback_url: env.MARZPAY_CALLBACK_URL || 'https://kashwave-online-investment.vercel.app/api/webhooks/marz',
      ...result
    });
  } catch (err) {
    return res.status(500).json({ success: false, connected: false, reason: err.message });
  }
});

// All admin routes below require valid JWT + admin role + audit middleware
router.use(authenticateToken, requireRole('admin'), auditMiddleware);

// ─── Dashboard ──────────────────────────────────────────────────────────────
router.get('/stats', AdminController.getStats);

// ─── Transactions ───────────────────────────────────────────────────────────
router.get('/transactions', AdminController.getAllTransactions);
router.put('/transactions/:id/approve', AdminController.approveTransaction);
router.put('/transactions/:id/reject', AdminController.rejectTransaction);

// ─── Investor Investments ───────────────────────────────────────────────────
router.get('/investments', AdminController.getAllInvestments);

// ─── User Management ────────────────────────────────────────────────────────
router.get('/users', AdminController.getAllUsers);
router.delete('/users/purge-test-accounts', AdminController.purgeTestAccounts);
router.delete('/users/:id', AdminController.deleteUser);
router.put('/users/:id/status', AdminController.updateUserStatus);
router.get('/users/:id/audit-logs', AdminController.getUserAuditLogs);

// ─── KYC Review Workflow ─────────────────────────────────────────────────────
router.get('/kyc', AdminController.getAllKYCSubmissions);
router.get('/kyc/:id', AdminController.getKYCDetail);
router.put('/kyc/:id/review', [
  body('decision').isIn(['approved', 'rejected', 'resubmission_required']).withMessage('Valid decision required'),
  validate
], AdminController.reviewKYCSubmission);

// ─── Investment Plan Management (Full CRUD) ──────────────────────────────────
router.get('/plans', AdminController.getAllPlans);
router.post('/plans', [
  body('title').notEmpty().withMessage('Title is required'),
  body('daily_return_percent').isFloat({ min: 0.1 }).withMessage('Valid daily ROI percentage required'),
  body('duration_days').isInt({ min: 1 }).withMessage('Valid duration in days required'),
  body('min_investment').isFloat({ min: 1 }).withMessage('Valid minimum investment required'),
  body('max_investment').isFloat({ min: 1 }).withMessage('Valid maximum investment required'),
  validate
], AdminController.createPlan);
router.put('/plans/:id', AdminController.updatePlan);
router.patch('/plans/:id/status', AdminController.togglePlanStatus);
router.delete('/plans/:id', AdminController.deletePlan);

// ─── ROI Settings Engine ─────────────────────────────────────────────────────
router.get('/roi-settings', AdminController.getAllROISettings);
router.post('/roi-settings', [
  body('investment_plan_id').isInt({ min: 1 }).withMessage('Valid plan ID required'),
  body('profit_percentage').isFloat({ min: 0.001 }).withMessage('Valid profit percentage required'),
  body('calculation_type').isIn(['daily', 'weekly', 'monthly', 'fixed_maturity']).withMessage('Valid calculation type required'),
  body('duration').isInt({ min: 1 }).withMessage('Valid duration in days required'),
  validate
], AdminController.createROISetting);
router.put('/roi-settings/:id', AdminController.updateROISetting);
router.patch('/roi-settings/:id/toggle', AdminController.toggleROISetting);

// ─── ROI Payout Engine Trigger & Profit Ledger Approvals ──────────────────────
router.post('/roi/run-payouts', AdminController.triggerROIPayouts);
router.get('/investment-profits', AdminController.getInvestmentProfitLedger);
router.put('/investment-profits/:id/approve', AdminController.approveInvestmentProfit);
router.put('/investment-profits/approve-all', AdminController.approveAllInvestmentProfits);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', AdminController.getAuditLogs);

module.exports = router;

