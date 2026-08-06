/**
 * KYC Routes — User-facing KYC submission workflow
 * Requires authentication. Admin review is handled via /admin/kyc
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middleware/authMiddleware');
const { auditMiddleware } = require('../middleware/auditLogger');
const { submitKYC, getKYCStatus, KYC_UPLOAD_DIR } = require('../services/kycService');

const router = express.Router();
router.use(authenticateToken, auditMiddleware);

const ALLOWED_MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_SELFIE_SIZE = 2 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, KYC_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `kyc_${req.user.id}_${file.fieldname}_${Date.now()}${ext}`);
  }
});

async function validateKYCFile(req, file, cb) {
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    const expectedMime = ALLOWED_MIME_TYPES[ext];
    if (!expectedMime) {
      return cb(new Error('Only JPG, PNG, and PDF documents are accepted.'));
    }

    if (file.size > MAX_FILE_SIZE) {
      return cb(new Error('File exceeds maximum size of 5MB.'));
    }

    if (file.fieldname === 'selfie' && file.size > MAX_SELFIE_SIZE) {
      return cb(new Error('Selfie photo must be under 2MB.'));
    }

    const { fromStream } = await import('file-type');
    const stream = fs.createReadStream(file.path);
    const detected = await fromStream(stream, { expectedType: [expectedMime] });

    if (!detected || detected.ext !== ext.replace('.', '') || detected.mime !== expectedMime) {
      fs.unlink(file.path, () => {});
      return cb(new Error('File type mismatch. Please upload a valid JPG, PNG, or PDF.'));
    }

    cb(null, true);
  } catch (err) {
    if (fs.existsSync(file.path)) {
      fs.unlink(file.path, () => {});
    }
    cb(new Error('Invalid or corrupted file. Please upload a valid document.'));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: validateKYCFile
});

// GET /api/kyc/status — get current user's KYC status
router.get('/status', async (req, res, next) => {
  try {
    const status = await getKYCStatus(req.user.id);
    res.json({ success: true, data: { kyc_status: status } });
  } catch (err) { next(err); }
});

// POST /api/kyc/submit — submit KYC documents
router.post(
  '/submit',
  upload.fields([
    { name: 'document_front', maxCount: 1 },
    { name: 'document_back',  maxCount: 1 },
    { name: 'selfie',         maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const { national_id_number, document_type } = req.body;
      const files = {
        front:  req.files?.document_front?.[0]?.path || null,
        back:   req.files?.document_back?.[0]?.path  || null,
        selfie: req.files?.selfie?.[0]?.path          || null
      };

      if (!files.front || !files.selfie) {
        return res.status(400).json({ success: false, message: 'Front document and selfie photo are required.' });
      }

      const kyc = await submitKYC({
        userId: req.user.id,
        nationalIdNumber: national_id_number,
        documentType: document_type || 'national_id',
        files
      });

      await req.audit('kyc_submitted', {
        description: `User submitted KYC — type: ${document_type}`,
        resourceType: 'kyc_verification',
        severity: 'info'
      });

      res.status(201).json({
        success: true,
        message: 'KYC documents submitted successfully! Our team will review within 24 hours.',
        data: { id: kyc.id, verification_status: kyc.verification_status }
      });
    } catch (err) { next(err); }
  }
);

module.exports = router;
