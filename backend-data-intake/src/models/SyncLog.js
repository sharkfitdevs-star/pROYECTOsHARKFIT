const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  // Tipo de sincronización
  syncType: { 
    type: String, 
    enum: ['clientes', 'ventas', 'agendamientos', 'full', 'manual'],
    required: true,
    index: true 
  },
  
  // Estado
  status: { 
    type: String, 
    enum: ['iniciado', 'en_proceso', 'completado', 'error', 'parcial'],
    default: 'iniciado',
    index: true 
  },
  
  // Sucursal
  idBranch: String,
  branchName: String,
  
  // Fechas
  startedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  completedAt: Date,
  duration: Number, // en milisegundos
  
  // Resultados
  recordsProcessed: { 
    type: Number, 
    default: 0 
  },
  recordsCreated: { 
    type: Number, 
    default: 0 
  },
  recordsUpdated: { 
    type: Number, 
    default: 0 
  },
  recordsSkipped: { 
    type: Number, 
    default: 0 
  },
  recordsError: { 
    type: Number, 
    default: 0 
  },
  
  // Detalles
  errors: [{
    timestamp: Date,
    message: String,
    stack: String,
    record: mongoose.Schema.Types.Mixed
  }],
  
  warnings: [{
    timestamp: Date,
    message: String,
    record: mongoose.Schema.Types.Mixed
  }],
  
  // Configuración de la sincronización
  config: {
    source: String,
    filters: mongoose.Schema.Types.Mixed,
    batchSize: Number,
    timeout: Number
  },
  
  // Usuario que inició (si es manual)
  initiatedBy: String,
  initiatedByName: String,
  
  // Metadata adicional
  metadata: mongoose.Schema.Types.Mixed,
  
  // Notas
  notes: String
}, {
  timestamps: true,
  collection: 'sync_logs'
});

// Índices
syncLogSchema.index({ syncType: 1, startedAt: -1 });
syncLogSchema.index({ status: 1, startedAt: -1 });
syncLogSchema.index({ idBranch: 1, startedAt: -1 });

// Métodos de instancia
syncLogSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Método para marcar como completado
syncLogSchema.methods.markCompleted = function(results) {
  this.status = 'completado';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  
  if (results) {
    this.recordsProcessed = results.processed || 0;
    this.recordsCreated = results.created || 0;
    this.recordsUpdated = results.updated || 0;
    this.recordsSkipped = results.skipped || 0;
  }
};

// Método para marcar error
syncLogSchema.methods.markError = function(error) {
  this.status = 'error';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  
  this.errors.push({
    timestamp: new Date(),
    message: error.message,
    stack: error.stack
  });
};

// Método para añadir error
syncLogSchema.methods.addError = function(error, record) {
  this.recordsError += 1;
  this.errors.push({
    timestamp: new Date(),
    message: error.message,
    stack: error.stack,
    record
  });
};

// Método para añadir warning
syncLogSchema.methods.addWarning = function(message, record) {
  this.warnings.push({
    timestamp: new Date(),
    message,
    record
  });
};

// Export as a legacy model name to avoid colliding with the new MongoModels.SyncLog
module.exports = mongoose.models.LegacySyncLog || mongoose.model('LegacySyncLog', syncLogSchema);
