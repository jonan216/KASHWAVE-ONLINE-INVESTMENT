/**
 * Marz Innovations — Manual Payment Provider
 * Uganda-based mobile money & bank transfer processor.
 * Credentials loaded from environment variables for security.
 * Contact: tumukwasibwereymond@gmail.com | +256 771 178213
 */
const env = require('../../config/env');

const initPayment = async ({ amount, currency = 'UGX', reference, phone }) => {
  const providerName = env.PAYMENT_PROVIDER_NAME || 'Marz Innovations';
  const contactEmail = env.PAYMENT_PROVIDER_EMAIL || 'tumukwasibwereymond@gmail.com';
  const contactPhone = env.PAYMENT_PROVIDER_PHONE || '+256771178213';

  return {
    provider: providerName,
    reference,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    amount: Number(amount),
    currency,
    instructions: [
      `${providerName} Payment Instructions:`,
      `Transfer ${currency} ${Number(amount).toLocaleString()} to Marz Innovations:`,
      `Mobile Money: Send to ${contactPhone} (Marz Innovations)`,
      `Bank Transfer: Contact ${contactEmail} for bank details`,
      `Use Reference: ${reference}`,
      `After payment, submit your transaction ID in the deposit form.`
    ].join('\n'),
    status: 'pending'
  };
};

const verifyPayment = async (reference) => ({
  verified: false,
  reference,
  provider: env.PAYMENT_PROVIDER_NAME || 'Marz Innovations'
});

module.exports = { initPayment, verifyPayment };
