const mongoose = require('mongoose');

const alertaSchema = new mongoose.Schema({
  // Identificación
  idAlert: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Tipo de alerta
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
      'otro'
    ],
    required: true,
    index: true 
  },
  
  // Prioridad
  priority: { 
    type: String, 
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media',
    index: true 
  },
  
  // Estado
  status: { 
    type: String, 
    enum: ['pendiente', 'en_proceso', 'resuelta', 'descartada'],
    default: 'pendiente',
    index: true 
  },
  
  // Título y descripción
  title: { 
    type: String, 
    required: true 
  },
  description: String,
  
  // Cliente relacionado
  idMember: { 
    type: String,
    index: true 
  },
  memberName: String,
  
  // Sucursal
  idBranch: { 
    type: String,
    index: true 
  },
  branchName: String,
  
  // Datos específicos según tipo de alerta
  alertData: {
    // Para membresías
    membershipEndDate: Date,
    daysUntilExpiration: Number,
    
    // Para pagos
    paymentAmount: Number,
    paymentDueDate: Date,
    daysOverdue: Number,
    idSale: String,
    
    // Para inactividad
    lastVisit: Date,
    daysInactive: Number,
    
    // Para cumpleaños
    birthDate: Date,
    age: Number,
    
    // Datos adicionales
    customData: mongoose.Schema.Types.Mixed
  },
  
  // Acciones sugeridas
  suggestedActions: [String],
  
  // Notas y seguimiento
  notes: String,
  internalNotes: String,
  
  // Asignación
  assignedTo: String,
  assignedToName: String,
  assignedAt: Date,
  
  // Resolución
  resolvedAt: Date,
  resolvedBy: String,
  resolvedByName: String,
  resolutionNotes: String,
  
  // Notificaciones
  notificationSent: { 
    type: Boolean, 
    default: false 
  },
  notificationSentAt: Date,
  notificationMethod: String,
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Vencimiento de la alerta
  expiresAt: Date,
  
  // Origen de datos
  source: { 
    type: String, 
    default: 'system',
    index: true 
  },
  automatic: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true,
  collection: 'alertas'
});

// Índices compuestos
alertaSchema.index({ status: 1, priority: -1, createdAt: -1 });
alertaSchema.index({ type: 1, status: 1, createdAt: -1 });
alertaSchema.index({ idBranch: 1, status: 1, createdAt: -1 });
alertaSchema.index({ idMember: 1, createdAt: -1 });
alertaSchema.index({ assignedTo: 1, status: 1 });

// Middleware pre-save
alertaSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Métodos de instancia
alertaSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Método para asignar alerta
alertaSchema.methods.assignTo = function(userId, userName) {
  this.assignedTo = userId;
  this.assignedToName = userName;
  this.assignedAt = new Date();
  this.status = 'en_proceso';
};

// Método para resolver alerta
alertaSchema.methods.resolve = function(userId, userName, notes) {
  this.status = 'resuelta';
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  this.resolvedByName = userName;
  this.resolutionNotes = notes;
};

module.exports = mongoose.model('Alerta', alertaSchema);
