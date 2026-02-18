const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  company: { type: String },
  message: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  processedAt: Date,
  createdAt: { type: Date, default: Date.now }
}, {
  collection: 'access_requests'
});

accessRequestSchema.index({ email: 1 });

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
