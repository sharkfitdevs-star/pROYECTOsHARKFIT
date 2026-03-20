const mongoose = require('mongoose');

const DashboardWidgetSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: true
  },
  descripcion: String,
  tipo: {
    type: String,
    enum: ['kpi', 'chart', 'table', 'list', 'calendar', 'quick_actions', 'alerts', 'progress'],
    required: true
  },
  categoria: {
    type: String,
    enum: ['ventas', 'clientes', 'operaciones', 'rrhh', 'inventario', 'finanzas', 'sistema'],
    required: true
  },
  icono: {
    type: String,
    default: 'bi-grid'
  },
  color: {
    type: String,
    default: '#10b981'
  },
  roles_permitidos: [{
    type: String,
    enum: ['owner', 'admin', 'manager', 'staff', 'instructor', 'recepcionista', 'vendedor', 'viewer']
  }],
  config_default: {
    width: { type: Number, default: 1 },
    height: { type: Number, default: 1 },
    refreshInterval: { type: Number, default: 300000 },
    showHeader: { type: Boolean, default: true },
    collapsible: { type: Boolean, default: false }
  },
  data_source: {
    endpoint: String,
    method: { type: String, default: 'GET' },
    params: mongoose.Schema.Types.Mixed
  },
  opciones_configurables: [{
    key: String,
    label: String,
    tipo: { type: String, enum: ['text', 'number', 'select', 'boolean', 'date_range'] },
    opciones: [mongoose.Schema.Types.Mixed],
    default: mongoose.Schema.Types.Mixed
  }],
  activo: {
    type: Boolean,
    default: true
  },
  orden_default: {
    type: Number,
    default: 0
  },
  requiere_sede: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices
DashboardWidgetSchema.index({ codigo: 1 });
DashboardWidgetSchema.index({ roles_permitidos: 1 });
DashboardWidgetSchema.index({ categoria: 1 });
DashboardWidgetSchema.index({ activo: 1 });

// Método estático para obtener widgets por rol
DashboardWidgetSchema.statics.getWidgetsPorRol = async function(rol) {
  return this.find({
    activo: true,
    roles_permitidos: rol
  }).sort({ orden_default: 1 });
};

// Método estático para obtener catálogo de widgets
DashboardWidgetSchema.statics.getCatalogo = function() {
  return {
    tipos: ['kpi', 'chart', 'table', 'list', 'calendar', 'quick_actions', 'alerts', 'progress'],
    categorias: ['ventas', 'clientes', 'operaciones', 'rrhh', 'inventario', 'finanzas', 'sistema'],
    roles: ['owner', 'admin', 'manager', 'staff', 'instructor', 'recepcionista', 'vendedor', 'viewer']
  };
};

module.exports = mongoose.model('DashboardWidget', DashboardWidgetSchema);
