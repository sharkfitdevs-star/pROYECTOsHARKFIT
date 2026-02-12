const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true
  },
  refreshTokenHash: {
    type: String,
    required: true,
    index: true
  },
  userAgent: String,
  ip: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  revokedAt: Date,
  rotatedAt: Date,
  rotatedFrom: String
}, {
  timestamps: false,
  collection: 'sessions'
});

sessionSchema.index({ userId: 1, expiresAt: 1 });

module.exports = mongoose.model('Session', sessionSchema);
