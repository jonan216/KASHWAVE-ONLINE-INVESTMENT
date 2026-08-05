/**
 * KashWave Email Notification Service
 * Uses Nodemailer with SMTP. SendGrid drop-in compatible.
 * All templates are premium branded HTML.
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');

// Create transporter (works with Gmail, SendGrid SMTP, Mailgun, etc.)
const createTransporter = () => {
  if (env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: parseInt(env.EMAIL_PORT || '587'),
      secure: env.EMAIL_PORT === '465',
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS
      }
    });
  }
  // Fallback: log emails to console in dev mode
  return null;
};

// ─── Branded HTML email wrapper ─────────────────────────────────────────────
const wrapHtml = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F8F4E8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F4E8;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(16,37,66,0.09);">
        <!-- Header -->
        <tr>
          <td style="background:#102542;padding:32px 40px;text-align:center;">
            <span style="font-size:28px;font-weight:900;color:#D4AF37;letter-spacing:2px;">KASHWAVE</span>
            <p style="margin:4px 0 0;color:#F8F4E8;font-size:11px;letter-spacing:3px;opacity:0.7;">INVESTMENT PLATFORM</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px;">${bodyHtml}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F8F4E8;padding:24px 40px;text-align:center;border-top:1px solid #e8e2d5;">
            <p style="font-size:11px;color:#102542;opacity:0.5;margin:0;">
              © ${new Date().getFullYear()} KashWave Online Investment Platform. All rights reserved.<br/>
              This is an automated security email. Do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── Email Senders ────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[EMAIL DEV LOG] To: ${to} | Subject: ${subject}`);
    return { messageId: 'dev-console-only' };
  }
  const info = await transporter.sendMail({
    from: `"KashWave Platform" <${env.EMAIL_USER}>`,
    to, subject, html
  });
  return info;
};

const sendWelcomeEmail = async ({ to, name, verificationUrl }) =>
  sendEmail({
    to, subject: 'Welcome to KashWave Investment Platform 🎉',
    html: wrapHtml('Welcome to KashWave', `
      <h2 style="color:#102542;font-size:22px;margin-bottom:8px;">Welcome, ${name}! 👋</h2>
      <p style="color:#555;line-height:1.7;">Your KashWave investment account is ready. Start earning <strong style="color:#D4AF37;">5% daily returns</strong> with Uganda's most trusted investment platform.</p>
      ${verificationUrl ? `<a href="${verificationUrl}" style="display:inline-block;margin:20px 0;padding:14px 32px;background:#D4AF37;color:#102542;font-weight:900;border-radius:10px;text-decoration:none;">Verify Email Address</a>` : ''}
      <p style="color:#888;font-size:13px;">If you did not create this account, please ignore this email.</p>
    `)
  });

const sendDepositConfirmation = async ({ to, name, amount, reference, currency = 'UGX' }) =>
  sendEmail({
    to, subject: `Deposit Received — ${currency} ${Number(amount).toLocaleString()} | KashWave`,
    html: wrapHtml('Deposit Confirmation', `
      <h2 style="color:#16A34A;">✅ Deposit Confirmed</h2>
      <p style="color:#555;">Hi <strong>${name}</strong>, your deposit has been received and is pending admin verification.</p>
      <table style="width:100%;margin:20px 0;background:#F8F4E8;border-radius:10px;padding:16px;">
        <tr><td style="color:#888;font-size:12px;">Amount</td><td style="font-weight:900;color:#102542;font-size:18px;">${currency} ${Number(amount).toLocaleString()}</td></tr>
        <tr><td style="color:#888;font-size:12px;">Reference</td><td style="font-family:monospace;color:#D4AF37;">${reference}</td></tr>
        <tr><td style="color:#888;font-size:12px;">Status</td><td><span style="background:#F59E0B;color:#fff;padding:2px 10px;border-radius:999px;font-size:12px;">Pending Review</span></td></tr>
      </table>
      <p style="color:#888;font-size:13px;">Your wallet will be credited once our team verifies the payment. This typically takes 15–60 minutes.</p>
    `)
  });

const sendWithdrawalStatusEmail = async ({ to, name, amount, reference, status, currency = 'UGX', reason }) => {
  const statusConfig = {
    approved: { emoji: '✅', label: 'Approved', color: '#16A34A' },
    rejected: { emoji: '❌', label: 'Rejected', color: '#DC2626' },
    processing: { emoji: '⏳', label: 'Processing', color: '#F59E0B' },
    completed: { emoji: '🎉', label: 'Completed', color: '#16A34A' }
  };
  const cfg = statusConfig[status] || { emoji: 'ℹ️', label: status, color: '#102542' };
  return sendEmail({
    to, subject: `Withdrawal ${cfg.label} — ${currency} ${Number(amount).toLocaleString()} | KashWave`,
    html: wrapHtml('Withdrawal Update', `
      <h2 style="color:${cfg.color};">${cfg.emoji} Withdrawal ${cfg.label}</h2>
      <p style="color:#555;">Hi <strong>${name}</strong>, your withdrawal request status has been updated.</p>
      <table style="width:100%;margin:20px 0;background:#F8F4E8;border-radius:10px;padding:16px;">
        <tr><td style="color:#888;font-size:12px;">Amount</td><td style="font-weight:900;color:#102542;">${currency} ${Number(amount).toLocaleString()}</td></tr>
        <tr><td style="color:#888;font-size:12px;">Reference</td><td style="font-family:monospace;color:#D4AF37;">${reference}</td></tr>
        <tr><td style="color:#888;font-size:12px;">Status</td><td style="color:${cfg.color};font-weight:700;">${cfg.label}</td></tr>
        ${reason ? `<tr><td style="color:#888;font-size:12px;">Note</td><td style="color:#555;">${reason}</td></tr>` : ''}
      </table>
    `)
  });
};

const sendInvestmentConfirmation = async ({ to, name, planTitle, amount, expectedReturn, maturityDate, currency = 'UGX' }) =>
  sendEmail({
    to, subject: `Investment Activated — ${planTitle} | KashWave`,
    html: wrapHtml('Investment Confirmation', `
      <h2 style="color:#102542;">📈 Investment Activated!</h2>
      <p>Hi <strong>${name}</strong>, your capital is now locked and earning <strong style="color:#D4AF37;">5% daily returns (Mon–Fri)</strong>.</p>
      <table style="width:100%;margin:20px 0;background:#F8F4E8;border-radius:10px;padding:16px;">
        <tr><td style="color:#888;font-size:12px;">Plan</td><td style="font-weight:700;color:#102542;">${planTitle}</td></tr>
        <tr><td style="color:#888;font-size:12px;">Invested</td><td style="font-weight:900;color:#D4AF37;">${currency} ${Number(amount).toLocaleString()}</td></tr>
        <tr><td style="color:#888;font-size:12px;">Expected Return</td><td style="font-weight:900;color:#16A34A;">${currency} ${Number(expectedReturn).toLocaleString()}</td></tr>
        <tr><td style="color:#888;font-size:12px;">Maturity Date</td><td style="color:#102542;">${maturityDate}</td></tr>
      </table>
    `)
  });

const sendPasswordResetEmail = async ({ to, name, resetUrl }) =>
  sendEmail({
    to, subject: 'Password Reset Request | KashWave',
    html: wrapHtml('Password Reset', `
      <h2 style="color:#102542;">🔐 Password Reset</h2>
      <p>Hi <strong>${name}</strong>, we received a request to reset your KashWave password.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:14px 32px;background:#102542;color:#D4AF37;font-weight:900;border-radius:10px;text-decoration:none;">Reset My Password</a>
      <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email — your account is safe.</p>
    `)
  });

const sendSecurityAlert = async ({ to, name, action, ipAddress, device }) =>
  sendEmail({
    to, subject: '⚠️ Security Alert — New Login Detected | KashWave',
    html: wrapHtml('Security Alert', `
      <h2 style="color:#DC2626;">⚠️ Security Alert</h2>
      <p>Hi <strong>${name}</strong>, a <strong>${action}</strong> was just performed on your KashWave account.</p>
      <table style="width:100%;margin:20px 0;background:#FEF2F2;border-radius:10px;padding:16px;">
        <tr><td style="color:#888;font-size:12px;">Action</td><td style="color:#DC2626;font-weight:700;">${action}</td></tr>
        <tr><td style="color:#888;font-size:12px;">IP Address</td><td style="font-family:monospace;">${ipAddress || 'Unknown'}</td></tr>
        <tr><td style="color:#888;font-size:12px;">Device</td><td>${device || 'Unknown'}</td></tr>
      </table>
      <p style="color:#888;font-size:13px;">If this wasn't you, change your password immediately and contact support.</p>
    `)
  });

const sendWelcomeWithReferralCode = async ({ to, name, referralCode, referralLink }) =>
  sendEmail({
    to, subject: '🎉 Welcome to KashWave — Your Referral Code Inside!',
    html: wrapHtml('Welcome to KashWave', `
      <h2 style="color:#102542;font-size:22px;margin-bottom:8px;">Welcome, ${name}! 👋</h2>
      <p style="color:#555;line-height:1.7;">Your KashWave account is active. Start earning <strong style="color:#D4AF37;">5% daily returns</strong> with Uganda's most trusted investment platform.</p>

      <div style="margin:28px 0;background:#102542;border-radius:14px;padding:28px;text-align:center;">
        <p style="color:#F8F4E8;opacity:0.6;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;">Your Unique Referral Code</p>
        <p style="color:#D4AF37;font-size:32px;font-weight:900;letter-spacing:6px;margin:0;">${referralCode}</p>
      </div>

      <p style="color:#555;font-size:13px;line-height:1.7;">Share this code or your personal referral link and earn commissions on every deposit your network makes:</p>

      <div style="background:#F8F4E8;border-radius:10px;padding:14px 18px;margin:16px 0;word-break:break-all;">
        <p style="color:#888;font-size:11px;margin:0 0 4px;">Your Referral Link</p>
        <a href="${referralLink}" style="color:#102542;font-weight:700;font-size:13px;">${referralLink}</a>
      </div>

      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:10px;background:#D4AF37;color:#102542;font-weight:900;border-radius:8px 0 0 8px;text-align:center;font-size:13px;">Level 1<br/><span style="font-size:20px;">4%</span></td>
          <td style="padding:10px;background:#102542;color:#D4AF37;font-weight:900;text-align:center;font-size:13px;">Level 2<br/><span style="font-size:20px;">3%</span></td>
          <td style="padding:10px;background:#16A34A;color:#fff;font-weight:900;border-radius:0 8px 8px 0;text-align:center;font-size:13px;">Level 3<br/><span style="font-size:20px;">2%</span></td>
        </tr>
        <tr>
          <td style="padding:6px;text-align:center;font-size:11px;color:#888;">Direct Referrals</td>
          <td style="padding:6px;text-align:center;font-size:11px;color:#888;">2nd Generation</td>
          <td style="padding:6px;text-align:center;font-size:11px;color:#888;">3rd Generation</td>
        </tr>
      </table>

      <a href="${referralLink}" style="display:inline-block;margin:10px 0;padding:14px 32px;background:#D4AF37;color:#102542;font-weight:900;border-radius:10px;text-decoration:none;">Start Inviting Investors →</a>
      <p style="color:#aaa;font-size:12px;margin-top:16px;">Log in any time at <a href="${referralLink.split('/register')[0]}/login" style="color:#102542;">kashwave.com</a> to track your referral earnings.</p>
    `)
  });

module.exports = {
  sendWelcomeEmail,
  sendWelcomeWithReferralCode,
  sendDepositConfirmation,
  sendWithdrawalStatusEmail,
  sendInvestmentConfirmation,
  sendPasswordResetEmail,
  sendSecurityAlert
};
