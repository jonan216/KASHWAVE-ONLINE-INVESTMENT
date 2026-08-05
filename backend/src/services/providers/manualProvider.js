/**
 * Marz Innovations — Manual Payment Provider
 * For bank transfers and admin-verified payments.
 * Credentials loaded from environment variables.
 * Contact: tumukwasibwereymond@gmail.com | +256 790 193349
 */
const env = require('../../config/env');

const initPayment = async ({ amount, currency = 'UGX', reference }) => {
  return {
    provider: env.PAYMENT_PROVIDER_NAME || 'manual',
    reference,
    contact_email: env.PAYMENT_PROVIDER_EMAIL || 'tumukwasibwereymond@gmail.com',
    contact_phone: env.PAYMENT_PROVIDER_PHONE || '+256790193349',
    instructions: [
      `Transfer ${currency} ${Number(amount).toLocaleString()} to Marz Innovations:`,
      `Mobile Money: Send to ${env.PAYMENT_PROVIDER_PHONE || '0790193349'} (Marz Innovations)`,
      `Bank Transfer: Contact ${env.PAYMENT_PROVIDER_EMAIL || 'tumukwasibwereymond@gmail.com'} for bank details`,
      `Use Reference: ${reference}`,
      `After payment, upload your receipt/proof in the deposit form.`
    ].join('\n'),
    status: 'pending'
  };
};

const verifyPayment = async (reference) => ({ verified: false, reference, provider: 'manual' });
module.exports = { initPayment, verifyPayment };

