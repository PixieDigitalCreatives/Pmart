'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const SessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    family: { type: String, required: true, index: true },
    userAgent: { type: String, default: '', maxlength: 500 },
    ip: { type: String, default: '', maxlength: 100 },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    isRevoked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

SessionSchema.index({ user: 1, isRevoked: 1, expiresAt: 1 });

const Session = mongoose.model('Session', SessionSchema);

module.exports = { Session };

