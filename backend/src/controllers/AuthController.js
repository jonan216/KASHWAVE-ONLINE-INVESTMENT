const UserModel = require('../models/UserModel');
const WalletModel = require('../models/WalletModel');
const TransactionModel = require('../models/TransactionModel');
const RefreshTokenModel = require('../models/RefreshTokenModel');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashToken } = require('../utils/token');
const AuditLogger = require('../utils/auditLogger');
const { mockStore, pool, isPostgresConnected } = require('../config/db');
const { sendWelcomeWithReferralCode } = require('../services/emailService');
const { creditReferralBonus } = require('../services/referralService');
const { recordFailedLogin, clearFailedLogins, isAccountLocked } = require('../middleware/accountLockout');
const { generateCsrfToken } = require('../middleware/csrfProtection');
const { processROIPayouts } = require('../services/roiEngine');
const env = require('../config/env');

class AuthController {
  static async creditWelcomeBonusIfEligible(userId) {
    const bonusAmount = env.WELCOME_BONUS_AMOUNT || 0;
    if (!bonusAmount || bonusAmount <= 0) return null;

    const user = await UserModel.findById(userId);
    if (!user || user.has_received_welcome_bonus) return null;

    const wallet = await WalletModel.updateBalance(userId, {
      mainDelta: bonusAmount,
      depositedDelta: bonusAmount
    });

    const referenceCode = `KW-WB-${Date.now()}-${Math.floor(Math.random() * 900000 + 100000)}`;
    if (isPostgresConnected()) {
      await pool.query(
        `INSERT INTO transactions (reference_code, user_id, type, amount, currency, status, payment_method, admin_notes)
         VALUES ($1, $2, 'welcome_bonus', $3, 'UGX', 'completed', 'System', 'Welcome bonus for new user')`,
        [referenceCode, userId, bonusAmount]
      );
      await pool.query('UPDATE users SET has_received_welcome_bonus = TRUE WHERE id = $1', [userId]);
    } else {
      if (!mockStore.transactions) mockStore.transactions = [];
      mockStore.transactions.push({
        id: Date.now(),
        reference_code: referenceCode,
        user_id: userId,
        type: 'welcome_bonus',
        amount: bonusAmount,
        currency: 'UGX',
        status: 'completed',
        payment_method: 'System',
        admin_notes: 'Welcome bonus for new user',
        created_at: new Date().toISOString()
      });
      const u = mockStore.users.find(u => u.id === userId);
      if (u) u.has_received_welcome_bonus = true;
    }

    return { wallet, bonusAmount, referenceCode };
  }

  static async register(req, res, next) {
    try {
      const { full_name, email, password, referred_by_code } = req.body;

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        await AuditLogger.log(null, 'auth.register.duplicate', req, { email });
        return res.status(400).json({ success: false, message: 'User with this email already exists.' });
      }

      const password_hash = await hashPassword(password);
      const user = await UserModel.create({ full_name, email, password_hash, role: 'user', referred_by_code });

      // ── Referral tracking ────────────────────────────────────────────────────
      if (referred_by_code) {
        try {
          const referrer = await UserModel.findByReferralCode(referred_by_code);
          if (referrer && referrer.id !== user.id) {
            if (isPostgresConnected()) {
              if (pool.constructor.name === 'HttpPool') {
                await pool.query(
                  `INSERT INTO referrals (referrer_id, referee_id, level, commission_rate)
                   VALUES ($1, $2, 1, 4.00)`,
                  [referrer.id, user.id]
                );
              } else {
                await pool.query(
                  `INSERT INTO referrals (referrer_id, referee_id, level, commission_rate)
                   VALUES ($1, $2, 1, 4.00) ON CONFLICT DO NOTHING`,
                  [referrer.id, user.id]
                );
              }
            } else {
              if (!mockStore.referrals) mockStore.referrals = [];
              mockStore.referrals.push({
                id: mockStore.referrals.length + 1,
                referrer_id: referrer.id,
                referee_id: user.id,
                level: 1,
                commission_rate: 4.00
              });
            }
            await AuditLogger.log(user.id, 'auth.register.referral_linked', req, { referrer_id: referrer.id });
          }
        } catch (refErr) {
          console.error('[REFERRAL] Referral link error (non-fatal):', refErr.message);
        }
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      const tokenHash = hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await RefreshTokenModel.deleteAllForUser(user.id);
      await RefreshTokenModel.create(user.id, tokenHash, expiresAt);

      // Generate CSRF token so user can make POST requests immediately after sign-up
      const csrfToken = await generateCsrfToken(user.id);

      const wallet = await WalletModel.getByUserId(user.id);

      const bonus = await AuthController.creditWelcomeBonusIfEligible(user.id);
      if (bonus) {
        wallet.main_balance = bonus.wallet.main_balance;
        wallet.total_deposited = bonus.wallet.total_deposited;
      }

      const origin = `${req.protocol}://${req.get('host')}`;
      const clientOrigin = process.env.CLIENT_ORIGIN && process.env.CLIENT_ORIGIN !== '*'
        ? process.env.CLIENT_ORIGIN
        : 'http://localhost:3000';
      const referralLink = `${clientOrigin}/register?ref=${user.referral_code}`;
      sendWelcomeWithReferralCode({
        to: email,
        name: full_name,
        referralCode: user.referral_code,
        referralLink
      }).catch(err => console.error('[EMAIL] Failed to send welcome email:', err.message));

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      await AuditLogger.log(user.id, 'auth.register.success', req, { email, referral_code: user.referral_code });

      res.status(201).json({
        success: true,
        message: bonus ? `Welcome! UGX ${bonus.bonusAmount.toLocaleString()} bonus has been added to your wallet.` : 'Account created! Check your email for your referral code.',
        data: { user, wallet, accessToken, refreshToken, csrfToken, welcome_bonus: bonus ? { amount: bonus.bonusAmount, reference: bonus.referenceCode } : null }
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const lockResult = await isAccountLocked(email);
      if (lockResult) {
        await AuditLogger.log(null, 'auth.login.failure.locked', req, { email });
        return res.status(423).json({ success: false, message: `Account locked due to too many failed attempts. Try again after ${lockResult.toLocaleTimeString()}.` });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        await recordFailedLogin(email);
        await AuditLogger.log(null, 'auth.login.failure.user_not_found', req, { email });
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      if (user.status === 'suspended') {
        await AuditLogger.log(user.id, 'auth.login.failure.suspended', req, { email });
        return res.status(403).json({ success: false, message: 'Account is suspended. Please contact support.' });
      }

      const isMatch = await comparePassword(password, user.password_hash);
      if (!isMatch) {
        await recordFailedLogin(email);
        await AuditLogger.log(user.id, 'auth.login.failure.incorrect_password', req, { email });
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      await clearFailedLogins(email);

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      const tokenHash = hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await RefreshTokenModel.deleteAllForUser(user.id);
      await RefreshTokenModel.create(user.id, tokenHash, expiresAt);

      const csrfToken = await generateCsrfToken(user.id);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      const wallet = await WalletModel.getByUserId(user.id);

      const bonus = await AuthController.creditWelcomeBonusIfEligible(user.id);
      if (bonus) {
        wallet.main_balance = bonus.wallet.main_balance;
        wallet.total_deposited = bonus.wallet.total_deposited;
      }

      const { password_hash, ...userClean } = user;

      let referralBonus = null;
      if (user.referred_by_code && isPostgresConnected() && pool) {
        try {
          const referrer = await UserModel.findByReferralCode(user.referred_by_code);
          if (referrer && referrer.id !== user.id) {
            const existingBonus = await pool.query(
              `SELECT id FROM transactions WHERE user_id = $1 AND type = 'referral_bonus' AND admin_notes LIKE $2 LIMIT 1`,
              [referrer.id, `%${user.id}%`]
            );
            if (existingBonus.rows.length === 0) {
              referralBonus = await creditReferralBonus(referrer.id, user.id);
            }
          }
        } catch (refErr) {
          console.warn('[LOGIN REFERRAL BONUS] Non-fatal error:', refErr.message);
        }
      }

      await AuditLogger.log(user.id, 'auth.login.success', req);

      let responseData = {
        user: userClean,
        wallet,
        accessToken,
        refreshToken,
        csrfToken,
        welcome_bonus: bonus ? { amount: bonus.bonusAmount, reference: bonus.referenceCode } : null
      };

      if (referralBonus) {
        responseData.referral_bonus = {
          amount: referralBonus.bonusAmount,
          reference: referralBonus.referenceCode,
          message: `Your referrer has received a UGX ${referralBonus.bonusAmount} bonus!`
        };
      }

      res.json({
        success: true,
        message: referralBonus
          ? `Welcome! Your referrer earned UGX ${referralBonus.bonusAmount}. ${bonus ? `You also received a UGX ${bonus.bonusAmount} welcome bonus!` : ''}`
          : bonus
            ? `Welcome back! UGX ${bonus.bonusAmount.toLocaleString()} welcome bonus has been added to your wallet.`
            : 'Logged in successfully!',
        data: responseData
      });
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token is required.' });
      }

      const decoded = verifyRefreshToken(refreshToken);
      const tokenHash = hashToken(refreshToken);

      const newRefreshToken = await rotateRefreshToken(refreshToken);
      if (!newRefreshToken) {
        await AuditLogger.log(decoded.id, 'auth.refresh.invalid_token', req);
        return res.status(403).json({ success: false, message: 'Invalid or revoked refresh token.' });
      }

      const newTokenHash = hashToken(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const user = await UserModel.findById(decoded.id);

      if (!user) {
        return res.status(403).json({ success: false, message: 'Invalid refresh token.' });
      }

      const newAccessToken = generateAccessToken(user);
      const newCsrfToken = await generateCsrfToken(user.id);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          csrfToken: newCsrfToken
        }
      });
    } catch (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });
    }
  }

  static async getMe(req, res, next) {
    try {
      try { await processROIPayouts(); } catch (_) {}
      const user = await UserModel.findById(req.user.id);
      const wallet = await WalletModel.getByUserId(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      res.json({
        success: true,
        data: { user, wallet }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getReferrals(req, res, next) {
    try {
      const referrals = await UserModel.getReferredUsers(req.user.id);
      res.json({ success: true, data: referrals });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const user = await UserModel.findByEmail(email);

      await AuditLogger.log(user ? user.id : null, 'auth.forgot_password_requested', req, { email });

      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been dispatched.'
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyEmail(req, res, next) {
    try {
      const { code, userId } = req.body;
      if (!code || !userId) {
        return res.status(400).json({ success: false, message: 'Verification details missing.' });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      if (user.is_email_verified) {
        return res.json({ success: true, message: 'Email address is already verified.' });
      }

      let valid = false;
      if (isPostgresConnected() && pool) {
        const result = await pool.query(
          `SELECT * FROM email_verification_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW() LIMIT 1`,
          [userId, code]
        );
        valid = result.rows.length > 0;
        if (valid) {
          await pool.query('UPDATE users SET is_email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
          await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
        }
      } else {
        const token = mockStore.email_verification_tokens?.find(t => t.user_id === userId && t.token === code && new Date(t.expires_at) > new Date());
        if (token) {
          const u = mockStore.users.find(u => u.id === userId);
          if (u) u.is_email_verified = true;
          mockStore.email_verification_tokens = mockStore.email_verification_tokens.filter(t => t.user_id !== userId);
          valid = true;
        }
      }

      if (!valid) {
        await AuditLogger.log(userId, 'auth.email_verification_failed', req);
        return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
      }

      await AuditLogger.log(userId, 'auth.email_verified', req);
      res.json({
        success: true,
        message: 'Email address verified successfully!'
      });
    } catch (err) {
      next(err);
    }
  }

  static async requestEmailVerification(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email address is required.' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({ success: false, message: 'No account found with this email.' });
      }

      if (user.is_email_verified) {
        return res.json({ success: true, message: 'Email is already verified.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      if (isPostgresConnected() && pool) {
        await pool.query(
          `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
          [user.id, code, expiresAt]
        );
      } else {
        mockStore.email_verification_tokens = mockStore.email_verification_tokens || [];
        mockStore.email_verification_tokens.push({ user_id: user.id, token: code, expires_at: expiresAt.toISOString() });
      }

      const emailService = require('../services/emailService');
      await emailService.sendEmail({
        to: email,
        subject: 'Verify Your Email - KashWave',
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`
      });

      res.json({
        success: true,
        message: 'Verification code sent to your email.'
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await RefreshTokenModel.delete(tokenHash);
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      if (req.user) {
        await AuditLogger.log(req.user.id, 'auth.logout', req);
      }
      res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async getCsrfToken(req, res, next) {
    try {
      const csrfToken = await generateCsrfToken(req.user.id);
      res.json({ success: true, csrfToken });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
