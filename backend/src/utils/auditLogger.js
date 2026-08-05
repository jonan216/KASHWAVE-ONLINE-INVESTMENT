const { pool, mockStore, isPostgresConnected } = require('../config/db');

class AuditLogger {
  /**
   * Log an audit event
   * @param {number|null} userId - The user ID associated with the event
   * @param {string} action - The action being performed (e.g., 'auth.login.success')
   * @param {Object} req - Express request object to extract IP & user-agent
   * @param {string|null} details - Custom JSON or text details of the audit action
   */
  static async log(userId, action, req, details = null) {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    const userAgent = req ? req.headers['user-agent'] : null;
    const detailsStr = details ? (typeof details === 'object' ? JSON.stringify(details) : details) : null;

    try {
      if (isPostgresConnected()) {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, action, ipAddress, userAgent, detailsStr]
        );
      } else {
        if (!mockStore.audit_logs) {
          mockStore.audit_logs = [];
        }
        mockStore.audit_logs.push({
          id: mockStore.audit_logs.length + 1,
          user_id: userId,
          action,
          ip_address: ipAddress,
          user_agent: userAgent,
          details: detailsStr,
          created_at: new Date().toISOString()
        });
      }
      console.log(`[AUDIT LOG] Action: ${action} | User: ${userId} | IP: ${ipAddress}`);
    } catch (err) {
      // Prevent throwing error to ensure core app execution is not disrupted by logging failure
      console.error('[AUDIT LOG ERROR]', err.message);
    }
  }
}

module.exports = AuditLogger;
