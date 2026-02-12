const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  ip: String,
  userAgent: String,
  meta: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  collection: 'audit_logs'
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
