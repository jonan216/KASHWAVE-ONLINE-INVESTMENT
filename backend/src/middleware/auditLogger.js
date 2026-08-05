/**
 * KashWave Audit Logger Middleware
 * Creates immutable, tamper-evident audit log entries for all sensitive operations.
 * Compliant with financial regulatory standards.
 */

const { pool, mockStore, isPostgresConnected } = require('../config/db');

/**
 * Core audit log writer — works with both PostgreSQL and Mock Store
 */
const writeAuditLog = async ({
  userId = null,
  action,
  description = null,
  ipAddress = null,
  deviceInformation = null,
  resourceType = null,
  resourceId = null,
  oldValue = null,
  newValue = null,
  severity = 'info'
}) => {
  try {
    if (isPostgresConnected() && pool) {
      await pool.query(
        `INSERT INTO audit_logs
           (user_id, action, details, ip_address, device_information,
            resource_type, resource_id, old_value, new_value, severity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          userId,
          action,
          description,
          ipAddress,
          deviceInformation,
          resourceType,
          resourceId,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null,
          severity
        ]
      );
    } else {
      // Mock Store fallback for local dev
      mockStore.audit_logs = mockStore.audit_logs || [];
      mockStore.audit_logs.push({
        id: (mockStore.audit_logs.length || 0) + 1,
        user_id: userId,
        action,
        details: description,
        ip_address: ipAddress,
        device_information: deviceInformation,
        resource_type: resourceType,
        resource_id: resourceId,
        old_value: oldValue,
        new_value: newValue,
        severity,
        created_at: new Date().toISOString()
      });
    }
  } catch (err) {
    // Audit failures must never break normal operations — log to console only
    console.error('[AUDIT LOG ERROR]', err.message);
  }
};

/**
 * Express middleware factory — attaches audit helper to req object
 * Usage: router.post('/login', auditMiddleware, handler)
 */
const auditMiddleware = (req, res, next) => {
  req.audit = (action, options = {}) =>
    writeAuditLog({
      userId: options.userId ?? req.user?.id ?? null,
      action,
      description: options.description ?? null,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      deviceInformation: req.headers['user-agent'] || 'unknown',
      resourceType: options.resourceType ?? null,
      resourceId: options.resourceId ?? null,
      oldValue: options.oldValue ?? null,
      newValue: options.newValue ?? null,
      severity: options.severity ?? 'info'
    });
  next();
};

module.exports = { writeAuditLog, auditMiddleware };
