const mongoose = require('mongoose');
const { Schema } = mongoose;

const apiIntegrationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  dns: { type: String, required: true },
  encryptedToken: { type: String },
  encryptionIv: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  lastSyncAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'api_integrations',
  timestamps: true
});

apiIntegrationSchema.index({ tenantId: 1 }, { unique: true });

module.exports = mongoose.models.ApiIntegration || mongoose.model('ApiIntegration', apiIntegrationSchema);
