const mongoose = require('mongoose');
const { Schema } = mongoose;

const accessLogSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  evoEntryId: { type: String, index: true },
  memberId: { type: String, index: true },
  accessTime: Date,
  location: String,
  createdAt: { type: Date, default: Date.now }
}, {
  collection: 'access_logs',
  timestamps: false
});

accessLogSchema.index({ tenantId: 1, evoEntryId: 1 }, { unique: true, partialFilterExpression: { evoEntryId: { $exists: true } } });

module.exports = mongoose.models.AccessLog || mongoose.model('AccessLog', accessLogSchema);
