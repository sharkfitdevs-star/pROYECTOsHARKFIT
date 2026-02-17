const mongoose = require('mongoose');

const emailTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
    // index: true
  },
  type: {
    type: String,
    enum: ['verify_email', 'reset_password'],
    required: true
    // index: true
  },
  tokenHash: {
    type: String,
    required: true
    // index: true
  },
  expiresAt: {
    type: Date,
    required: true
    // index: true
  },
  usedAt: Date
}, {
  timestamps: true,
  collection: 'email_tokens'
});

emailTokenSchema.index({ userId: 1, type: 1, expiresAt: 1 });

module.exports = mongoose.model('EmailToken', emailTokenSchema);
