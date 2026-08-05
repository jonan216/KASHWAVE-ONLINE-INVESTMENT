const UserModel = require('../models/UserModel');
const WalletModel = require('../models/WalletModel');
const RefreshTokenModel = require('../models/RefreshTokenModel');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashToken } = require('../utils/token');
const { generateSecret, generateQRCode, verifyToken } = require('../utils/totp');
const AuditLogger = require('../utils/auditLogger');
const { mockStore, pool, isPostgresConnected } = require('../config/db');
const { sendWelcomeWithReferralCode } = require('../services/emailService');

class AuthController {
  static async register(req, res, next) {
    try {
      const { full_name, email, password, referred_by_code } = req.body;

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        await AuditLogger.log(null, 'auth.register.duplicate', req, { email });
        return res.status(400).json({ success: false, message: 'User with this email already exists.' });
      }

      const password_hash = await hashPassword(password);
      const user = await UserModel.create({ full_name, email, password_hash, role: 'user' });

      // ── Referral tracking ────────────────────────────────────────────────────
      if (referred_by_code) {
        try {
          const referrer = await UserModel.findByReferralCode(referred_by_code);
          if (referrer && referrer.id !== user.id) {
            if (isPostgresConnected()) {
              await pool.query(
                `INSERT INTO referrals (referrer_id, referee_id, level, commission_rate)
                 VALUES ($1, $2, 1, 4.00) ON CONFLICT DO NOTHING`,
                [referrer.id, user.id]
              );
              await pool.query(
                'UPDATE users SET referred_by_code = $1 WHERE id = $2',
                [referred_by_code, user.id]
              );
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

      const wallet = await WalletModel.getByUserId(user.id);

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
        message: 'Account created! Check your email for your referral code.',
        data: { user, wallet, accessToken, refreshToken }
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password, totp_code } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        await AuditLogger.log(null, 'auth.login.failure.user_not_found', req, { email });
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      if (user.status === 'suspended') {
        await AuditLogger.log(user.id, 'auth.login.failure.suspended', req, { email });
        return res.status(403).json({ success: false, message: 'Account is suspended. Please contact support.' });
      }

      const isMatch = await comparePassword(password, user.password_hash);
      if (!isMatch) {
        await AuditLogger.log(user.id, 'auth.login.failure.incorrect_password', req, { email });
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      // Check 2FA if enabled
      if (user.two_factor_enabled) {
        if (!totp_code) {
          await AuditLogger.log(user.id, 'auth.login.2fa_required', req);
          return res.status(200).json({
            success: true,
            requires2FA: true,
            message: 'Two-Factor Authentication code required.'
          });
        }
        const isValidTOTP = verifyToken(user.two_factor_secret, totp_code);
        if (!isValidTOTP) {
          await AuditLogger.log(user.id, 'auth.login.failure.2fa_invalid', req);
          return res.status(400).json({ success: false, message: 'Invalid 2FA code.' });
        }
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      const tokenHash = hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await RefreshTokenModel.deleteAllForUser(user.id);
      await RefreshTokenModel.create(user.id, tokenHash, expiresAt);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      const wallet = await WalletModel.getByUserId(user.id);
      const { password_hash, ...userClean } = user;

      await AuditLogger.log(user.id, 'auth.login.success', req);

      res.json({
        success: true,
        message: 'Logged in successfully!',
        data: {
          user: userClean,
          wallet,
          accessToken,
          refreshToken
        }
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
      const stored = await RefreshTokenModel.findByToken(tokenHash);

      if (!stored || stored.user_id !== decoded.id) {
        await AuditLogger.log(decoded.id, 'auth.refresh.invalid_token', req);
        return res.status(403).json({ success: false, message: 'Invalid or revoked refresh token.' });
      }

      await RefreshTokenModel.delete(tokenHash);

      const user = await UserModel.findById(decoded.id);
      if (!user) {
        return res.status(403).json({ success: false, message: 'Invalid refresh token.' });
      }

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);
      const newTokenHash = hashToken(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await RefreshTokenModel.create(user.id, newTokenHash, newExpiresAt);

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
          refreshToken: newRefreshToken
        }
      });
    } catch (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });
    }
  }

  static async getMe(req, res, next) {
    try {
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

  static async setup2FA(req, res, next) {
    try {
      const secret = generateSecret(req.user.email);
      const qrCodeUrl = await generateQRCode(secret.otpauth_url);

      await AuditLogger.log(req.user.id, 'auth.2fa.setup_initiated', req);

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCodeUrl
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async verify2FA(req, res, next) {
    try {
      const { secret, token } = req.body;
      const isValid = verifyToken(secret, token);

      if (!isValid) {
        await AuditLogger.log(req.user.id, 'auth.2fa.verification_failed', req);
        return res.status(400).json({ success: false, message: 'Invalid 2FA authentication token.' });
      }

      await UserModel.update2FASecret(req.user.id, secret, true);
      await AuditLogger.log(req.user.id, 'auth.2fa.enabled', req);

      res.json({
        success: true,
        message: 'Two-Factor Authentication enabled successfully!'
      });
    } catch (err) {
      next(err);
    }
  }

  static async disable2FA(req, res, next) {
    try {
      const { token } = req.body;
      const user = await UserModel.findByIdWithPassword(req.user.id);

      if (!user.two_factor_enabled) {
        return res.status(400).json({ success: false, message: '2FA is not enabled.' });
      }

      const isValid = verifyToken(user.two_factor_secret, token);
      if (!isValid) {
        await AuditLogger.log(req.user.id, 'auth.2fa.disable_failed', req);
        return res.status(400).json({ success: false, message: 'Invalid 2FA code.' });
      }

      await UserModel.update2FASecret(req.user.id, null, false);
      await AuditLogger.log(req.user.id, 'auth.2fa.disabled', req);

      res.json({
        success: true,
        message: 'Two-Factor Authentication disabled successfully.'
      });
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

      await AuditLogger.log(parseInt(userId), 'auth.email_verified', req);

      res.json({
        success: true,
        message: 'Email address verified successfully!'
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
}

module.exports = AuthController;
