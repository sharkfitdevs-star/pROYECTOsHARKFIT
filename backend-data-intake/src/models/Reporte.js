const mongoose = require('mongoose');

const reporteSchema = new mongoose.Schema({
  // Identificación
  idReport: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Tipo de reporte
  reportType: { 
    type: String, 
    enum: [
      'ventas',
      'clientes',
      'asistencias',
      'financiero',
      'inventario',
      'personal',
      'marketing',
      'operacional',
      'personalizado'
    ],
    required: true,
    index: true 
  },
  
  // Información básica
  title: { 
    type: String, 
    required: true 
  },
  description: String,
  
  // Período del reporte
  periodType: { 
    type: String, 
    enum: ['diario', 'semanal', 'mensual', 'trimestral', 'anual', 'personalizado'],
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true,
    index: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  
  // Sucursal
  idBranch: { 
    type: String,
    index: true 
  },
  branchName: String,
  branches: [String], // Para reportes multi-sucursal
  
  // Estado del reporte
  status: { 
    type: String, 
    enum: ['generando', 'completado', 'error', 'programado'],
    default: 'generando',
    index: true 
  },
  
  // Datos del reporte
  data: {
    // Métricas generales
    summary: mongoose.Schema.Types.Mixed,
    
    // Datos detallados
    details: mongoose.Schema.Types.Mixed,
    
    // Gráficos y visualizaciones
    charts: [{
      chartType: String,
      title: String,
      data: mongoose.Schema.Types.Mixed
    }],
    
    // Tablas
    tables: [{
      title: String,
      headers: [String],
      rows: [mongoose.Schema.Types.Mixed]
    }]
  },
  
  // Configuración del reporte
  config: {
    metrics: [String],
    groupBy: String,
    filters: mongoose.Schema.Types.Mixed,
    sortBy: String,
    sortOrder: { 
      type: String, 
      enum: ['asc', 'desc'],
      default: 'desc' 
    }
  },
  
  // Formato y exportación
  format: { 
    type: String, 
    enum: ['json', 'pdf', 'excel', 'csv'],
    default: 'json' 
  },
  filePath: String,
  fileUrl: String,
  fileSize: Number,
  
  // Generación
  generatedAt: Date,
  generatedBy: String,
  generatedByName: String,
  generationTime: Number, // en milisegundos
  
  // Programación (para reportes recurrentes)
  scheduled: { 
    type: Boolean, 
    default: false 
  },
  scheduleConfig: {
    frequency: String, // 'daily', 'weekly', 'monthly'
    dayOfWeek: Number,
    dayOfMonth: Number,
    time: String,
    recipients: [String]
  },
  nextScheduledRun: Date,
  
  // Compartir y permisos
  shared: { 
    type: Boolean, 
    default: false 
  },
  sharedWith: [String],
  publicUrl: String,
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Tags y categorización
  tags: [String],
  category: String,
  
  // Notas
  notes: String
}, {
  timestamps: true,
  collection: 'reportes'
});

// Índices compuestos
reporteSchema.index({ reportType: 1, startDate: -1 });
reporteSchema.index({ idBranch: 1, reportType: 1, startDate: -1 });
reporteSchema.index({ status: 1, createdAt: -1 });
reporteSchema.index({ generatedBy: 1, createdAt: -1 });
reporteSchema.index({ scheduled: 1, nextScheduledRun: 1 });

// Middleware pre-save
reporteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Métodos de instancia
reporteSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Método para marcar como completado
reporteSchema.methods.markCompleted = function(filePath, fileSize) {
  this.status = 'completado';
  this.generatedAt = new Date();
  this.filePath = filePath;
  this.fileSize = fileSize;
};

// Método para marcar error
reporteSchema.methods.markError = function(errorMessage) {
  this.status = 'error';
  this.notes = errorMessage;
};

module.exports = mongoose.model('Reporte', reporteSchema);
