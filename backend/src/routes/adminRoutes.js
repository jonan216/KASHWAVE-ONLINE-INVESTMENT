const express = require('express');
const { body } = require('express-validator');
const AdminController = require('../controllers/AdminController');
const authenticateToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/rbacMiddleware');
const validate = require('../middleware/validateMiddleware');
const { auditMiddleware } = require('../middleware/auditLogger');

const router = express.Router();

// All admin routes require valid JWT + admin role + audit middleware
router.use(authenticateToken, requireRole('admin'), auditMiddleware);

// ─── Dashboard ──────────────────────────────────────────────────────────────
router.get('/stats', AdminController.getStats);

// ─── Transactions ───────────────────────────────────────────────────────────
router.get('/transactions', AdminController.getAllTransactions);
router.put('/transactions/:id/approve', AdminController.approveTransaction);
router.put('/transactions/:id/reject', AdminController.rejectTransaction);

// ─── User Management ────────────────────────────────────────────────────────
router.get('/users', AdminController.getAllUsers);
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

// ─── ROI Payout Engine Trigger ────────────────────────────────────────────────
router.post('/roi/run-payouts', AdminController.triggerROIPayouts);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', AdminController.getAuditLogs);

module.exports = router;

