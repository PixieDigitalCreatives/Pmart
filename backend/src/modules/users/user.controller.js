'use strict';

const { User } = require('../auth/auth.model');
const { AuthService } = require('../auth/auth.service');
const { z } = require('../../utils/validation');
const { conflict } = require('../../utils/http-error');

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100).optional(),
  email: z
    .union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email address').max(254)])
    .optional()
});

class UserController {
  static async getProfile(req, res) {
    res.json({ success: true, data: AuthService.toPublicUser(req.user) });
  }

  /** Lets any signed-in user update their display name and email. Phone changes are not self-service. */
  static async updateProfile(req, res) {
    const { name, email } = updateProfileSchema.parse(req.body);
    const update = {};
    const unset = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) {
      if (email === '') {
        unset.email = 1;
      } else {
        if (await User.exists({ email, _id: { $ne: req.user._id } })) {
          throw conflict('This email is already used by another account', 'EMAIL_TAKEN');
        }
        update.email = email;
        if (email !== req.user.email) update.emailVerified = false;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { ...(Object.keys(update).length ? { $set: update } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: AuthService.toPublicUser(user) });
  }
}

module.exports = { UserController };
