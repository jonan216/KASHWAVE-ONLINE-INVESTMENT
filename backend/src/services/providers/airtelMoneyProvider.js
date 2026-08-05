/**
 * Airtel Money Provider Stub
 * Ready for live Airtel Money Uganda API integration
 */
const initPayment = async ({ amount, currency, phone, reference }) => {
  return {
    provider: 'airtel_money',
    reference,
    ussd_code: `*185*9*${amount}*${reference}#`,
    message: 'Dial the USSD code to complete payment',
    status: 'pending'
  };
};
const verifyPayment = async (reference) => ({ verified: false, reference });
module.exports = { initPayment, verifyPayment };
