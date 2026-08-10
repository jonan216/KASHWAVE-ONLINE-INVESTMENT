const UserModel = require('../models/UserModel');
const WalletModel = require('../models/WalletModel');
const { processROIPayouts } = require('../services/roiEngine');
const { hashPassword, comparePassword } = require('../utils/hash');

class UserController {
  static async getProfile(req, res, next) {
    try {
      try { await processROIPayouts(); } catch (_) {}
      const user = await UserModel.findById(req.user.id);
      const wallet = await WalletModel.getByUserId(req.user.id);
      res.json({ success: true, data: { user, wallet } });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await UserModel.findByIdWithPassword(req.user.id);

      const isMatch = await comparePassword(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password does not match.' });
      }

      const newHash = await hashPassword(newPassword);
      await UserModel.updatePassword(req.user.id, newHash);

      res.json({
        success: true,
        message: 'Password updated successfully!'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
