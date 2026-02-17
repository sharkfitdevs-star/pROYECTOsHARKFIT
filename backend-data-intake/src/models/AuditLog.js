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

// Índices adicionales para búsquedas rápidas
// `createdAt` ya tiene `index: true` en el campo — evitar índice duplicado
auditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
