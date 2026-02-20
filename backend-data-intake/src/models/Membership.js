const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  externalId: { type: String, required: true, index: true },
  clientExternalId: { type: String, index: true },
  status: { type: String, enum: ['active','cancelled'], default: 'active' },
  startDate: Date,
  endDate: Date,
  source: { type: String, index: true },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'memberships'
});

membershipSchema.index({ source: 1, externalId: 1 }, { unique: true });

membershipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

membershipSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Membership', membershipSchema);