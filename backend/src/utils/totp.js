const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

function generateSecret(email) {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `KASHWAVE PLATFORM (${email})`,
    issuer: 'Kashwave Online Investment'
  });
  return secret;
}

async function generateQRCode(otpauthUrl) {
  return await QRCode.toDataURL(otpauthUrl);
}

function verifyToken(secret, token) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // allow clock drift window
  });
}

module.exports = {
  generateSecret,
  generateQRCode,
  verifyToken
};
