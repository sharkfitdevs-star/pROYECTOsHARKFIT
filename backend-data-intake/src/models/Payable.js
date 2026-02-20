const mongoose = require('mongoose');

const payableSchema = new mongoose.Schema({
  externalId: { type: String, required: true, index: true },
  clientExternalId: { type: String, index: true },
  amountDue: Number,
  dueDate: Date,
  status: String,
  source: { type: String, index: true },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'payables'
});

payableSchema.index({ source: 1, externalId: 1 }, { unique: true });

payableSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

payableSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Payable', payableSchema);