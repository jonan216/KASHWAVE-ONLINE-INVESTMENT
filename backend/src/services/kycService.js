/**
 * KashWave KYC Verification Service
 * Manages document submission, secure storage, and admin review workflow.
 */

const path = require('path');
const fs = require('fs');
const { pool, mockStore, isPostgresConnected } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

// Secure upload directory — NOT in public/static folder
const KYC_UPLOAD_DIR = path.resolve(__dirname, '../../secure_uploads/kyc');

// Ensure upload directory exists
if (!fs.existsSync(KYC_UPLOAD_DIR)) {
  fs.mkdirSync(KYC_UPLOAD_DIR, { recursive: true });
}

/**
 * Submit KYC documents for a user
 */
const submitKYC = async ({ userId, nationalIdNumber, documentType, files }) => {
  if (isPostgresConnected() && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT id, verification_status FROM kyc_verification WHERE user_id = $1`,
        [userId]
      );
      if (existing.rows[0]?.verification_status === 'approved') {
        throw new Error('KYC_ALREADY_APPROVED');
      }

      const upsertQuery = `
        INSERT INTO kyc_verification
          (user_id, national_id_number, document_type, document_front_path,
           document_back_path, selfie_photo_path, verification_status, submitted_date)
        VALUES ($1,$2,$3,$4,$5,$6,'pending', NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          national_id_number = EXCLUDED.national_id_number,
          document_type = EXCLUDED.document_type,
          document_front_path = EXCLUDED.document_front_path,
          document_back_path = EXCLUDED.document_back_path,
          selfie_photo_path = EXCLUDED.selfie_photo_path,
          verification_status = 'pending',
          submitted_date = NOW(),
          updated_at = NOW()
        RETURNING *
      `;
      const result = await client.query(upsertQuery, [
        userId,
        nationalIdNumber,
        documentType,
        files.front || null,
        files.back || null,
        files.selfie || null
      ]);

      // Sync kyc_status on users table for fast checks
      await client.query(
        `UPDATE users SET kyc_status = 'pending' WHERE id = $1`, [userId]
      );

      await client.query('COMMIT');

      await writeAuditLog({
        userId,
        action: 'kyc_submitted',
        description: `KYC documents submitted — Type: ${documentType}`,
        resourceType: 'kyc_verification',
        resourceId: result.rows[0].id,
        severity: 'info'
      });

      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Mock fallback
  mockStore.kyc = mockStore.kyc || [];
  const entry = {
    id: Date.now(), user_id: userId, national_id_number: nationalIdNumber,
    document_type: documentType, verification_status: 'pending',
    submitted_date: new Date().toISOString()
  };
  mockStore.kyc = mockStore.kyc.filter(k => k.user_id !== userId);
  mockStore.kyc.push(entry);
  return entry;
};

/**
 * Admin: Review KYC — approve / reject / request resubmission
 */
const reviewKYC = async ({ kycId, adminId, decision, comment }) => {
  const validDecisions = ['approved', 'rejected', 'resubmission_required'];
  if (!validDecisions.includes(decision)) throw new Error('INVALID_KYC_DECISION');

  if (isPostgresConnected() && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE kyc_verification SET
           verification_status = $1,
           admin_comment = $2,
           reviewed_by = $3,
           approved_date = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
           updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [decision, comment, adminId, kycId]
      );
      if (!result.rows[0]) throw new Error('KYC_RECORD_NOT_FOUND');

      const kyc = result.rows[0];

      // Sync user kyc_status
      await client.query(
        `UPDATE users SET kyc_status = $1 WHERE id = $2`, [decision, kyc.user_id]
      );

      await client.query('COMMIT');

      await writeAuditLog({
        userId: adminId,
        action: `kyc_${decision}`,
        description: `Admin ${decision} KYC for user ${kyc.user_id}. Comment: ${comment || 'none'}`,
        resourceType: 'kyc_verification',
        resourceId: kycId,
        severity: decision === 'rejected' ? 'warning' : 'info'
      });

      return kyc;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return { id: kycId, verification_status: decision };
};

/**
 * Get KYC status for a user (used in withdrawal checks)
 */
const getKYCStatus = async (userId) => {
  if (isPostgresConnected() && pool) {
    const result = await pool.query(
      `SELECT verification_status FROM kyc_verification WHERE user_id = $1`, [userId]
    );
    return result.rows[0]?.verification_status || 'not_submitted';
  }
  const found = (mockStore.kyc || []).find(k => k.user_id === userId);
  return found?.verification_status || 'not_submitted';
};

module.exports = { submitKYC, reviewKYC, getKYCStatus, KYC_UPLOAD_DIR };
