const { testConnection } = require('../src/services/providers/marzInnovationsProvider');
const env = require('../src/config/env');

module.exports = async (req, res) => {
  try {
    const result = await testConnection();
    res.json({
      success: true,
      credentials_configured: !!(env.MARZ_INNOVATIONS_API_KEY && env.MARZ_INNOVATIONS_API_SECRET),
      api_key_set: !!env.MARZ_INNOVATIONS_API_KEY,
      api_secret_set: !!env.MARZ_INNOVATIONS_API_SECRET,
      base_url: env.MARZ_INNOVATIONS_BASE_URL || 'https://wallet.wearemarz.com/api/v1',
      callback_url: env.MARZPAY_CALLBACK_URL || 'https://kashwave-online-investment.vercel.app/api/webhooks/marz',
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, connected: false, reason: err.message });
  }
};
