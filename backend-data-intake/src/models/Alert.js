const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  runId: { type: String, index: true },
  source: { type: String, index: true },
  type: {
    type: String,
    enum: [
      'payable_overdue',
      'membership_expiring',
      'membership_expired',
      // keep generic for future
      'other'
    ],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
    index: true
  },
  message: { type: String },
  clientExternalId: { type: String, index: true },
  clientName: String,
  amount: Number,
  dueDate: Date,
  membershipEndDate: Date,
  createdAt: { type: Date, default: Date.now, index: -1 }
}, {
  collection: 'export_alerts'
});

alertSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Alert', alertSchema);
