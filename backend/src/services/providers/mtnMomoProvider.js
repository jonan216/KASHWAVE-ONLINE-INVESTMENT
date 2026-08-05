/**
 * MTN Mobile Money Provider Stub
 * Ready for live MTN MoMo API integration (sandbox: sandbox.momodeveloper.mtn.com)
 */
const initPayment = async ({ amount, currency, phone, reference }) => {
  // TODO: Integrate with MTN MoMo Collections API
  // POST https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay
  return {
    provider: 'mtn_momo',
    reference,
    ussd_code: `*165*3*${amount}*${reference}#`,
    message: 'Dial the USSD code to complete payment',
    status: 'pending'
  };
};
const verifyPayment = async (reference) => ({ verified: false, reference });
module.exports = { initPayment, verifyPayment };
