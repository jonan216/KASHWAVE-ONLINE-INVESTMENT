const express = require('express');
const { processROIPayouts } = require('../services/roiEngine');

const router = express.Router();

/**
 * Automated Cron Endpoint for 24-Hour ROI Distribution
 * Invoked automatically by Vercel Cron or external schedulers.
 */
router.all('/process-roi', async (req, res) => {
  try {
    const result = await processROIPayouts();
    res.json({
      success: true,
      message: 'Automated 24-Hour ROI Payout run executed successfully.',
      timestamp: new Date().toISOString(),
      data: result
    });
  } catch (err) {
    console.error('[CRON ROI ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
