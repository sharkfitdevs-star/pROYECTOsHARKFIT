const mongoose = require('mongoose');
const { Schema } = mongoose;

const apiIntegrationSchema = new Schema({
  // tenantId indexed via schema.index(...) below (unique)
  tenantId: { type: String, required: true },
  dns: { type: String, required: true },
  // new descriptive fields for audit & listing
  name: { type: String },
  endpointsCount: { type: Number, default: 0 },
  encryptedToken: { type: String },
  encryptionIv: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  lastSyncAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'api_integrations',
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.encryptedToken;
      delete ret.encryptionIv;
      delete ret.__v;
      return ret;
    }
  }
});

apiIntegrationSchema.index({ tenantId: 1 }, { unique: true });

module.exports = mongoose.models.ApiIntegration || mongoose.model('ApiIntegration', apiIntegrationSchema);
