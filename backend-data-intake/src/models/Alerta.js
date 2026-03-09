const mongoose = require('mongoose');

const alertaSchema = new mongoose.Schema({
  idAlert: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'membresia_vencida',
      'membresia_por_vencer',
      'pago_pendiente',
      'pago_vencido',
      'inactividad',
      'cumpleanos',
      'seguimiento',
      'sistema',
      'kpi_rendimiento',   // ← NUEVO: alertas automáticas por KPIs
      'otro'
    ],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media',
    index: true
  },
  status: {
    type: String,
    enum: ['pendiente', 'en_proceso', 'resuelta', 'descartada'],
    default: 'pendiente',
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  idMember: { type: String, index: true },
  memberName: String,
  idBranch: { type: String, index: true },
  branchName: String,
  alertData: {
    membershipEndDate: Date,
    daysUntilExpiration: Number,
    paymentAmount: Number,
    paymentDueDate: Date,
    daysOverdue: Number,
    idSale: String,
    lastVisit: Date,
    daysInactive: Number,
    birthDate: Date,
    age: Number,
    customData: mongoose.Schema.Types.Mixed
  },
  suggestedActions: [String],
  notes: String,
  internalNotes: String,
  assignedTo: String,
  assignedToName: String,
  assignedAt: Date,
  resolvedAt: Date,
  resolvedBy: String,
  resolvedByName: String,
  resolutionNotes: String,
  notificationSent: { type: Boolean, default: false },
  notificationSentAt: Date,
  notificationMethod: String,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  source: { type: String, default: 'system', index: true },
  automatic: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'alertas'
});

alertaSchema.index({ status: 1, priority: -1, createdAt: -1 });
alertaSchema.index({ type: 1, status: 1, createdAt: -1 });
alertaSchema.index({ idBranch: 1, status: 1, createdAt: -1 });
alertaSchema.index({ idMember: 1, createdAt: -1 });
alertaSchema.index({ assignedTo: 1, status: 1 });

alertaSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

alertaSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

alertaSchema.methods.assignTo = function(userId, userName) {
  this.assignedTo = userId;
  this.assignedToName = userName;
  this.assignedAt = new Date();
  this.status = 'en_proceso';
};

alertaSchema.methods.resolve = function(userId, userName, notes) {
  this.status = 'resuelta';
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  this.resolvedByName = userName;
  this.resolutionNotes = notes;
};

module.exports = mongoose.model('Alerta', alertaSchema);
