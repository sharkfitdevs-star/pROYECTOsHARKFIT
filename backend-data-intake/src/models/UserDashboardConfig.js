const mongoose = require('mongoose');

const WidgetInstanceSchema = new mongoose.Schema({
  widget: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DashboardWidget',
    required: true
  },
  widget_codigo: String,
  posicion: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    w: { type: Number, default: 1 },
    h: { type: Number, default: 1 }
  },
  config_personalizada: mongoose.Schema.Types.Mixed,
  visible: {
    type: Boolean,
    default: true
  },
  colapsado: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const UserDashboardConfigSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rol: {
    type: String,
    required: true
  },
  sede: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sede'
  },
  nombre_dashboard: {
    type: String,
    default: 'Mi Dashboard'
  },
  es_default: {
    type: Boolean,
    default: false
  },
  widgets: [WidgetInstanceSchema],
  layout: {
    columns: { type: Number, default: 4 },
    row_height: { type: Number, default: 150 },
    gap: { type: Number, default: 16 }
  },
  tema: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'dark'
  },
  auto_refresh: {
    type: Boolean,
    default: true
  },
  refresh_interval: {
    type: Number,
    default: 300000
  },
  filtros_globales: {
    rango_fechas: {
      inicio: Date,
      fin: Date,
      preset: { type: String, enum: ['hoy', 'ayer', 'semana', 'mes', 'trimestre', 'año', 'custom'] }
    },
    sede_seleccionada: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sede'
    }
  },
  activo: {
    type: Boolean,
    default: true
  },
  ultima_modificacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices
UserDashboardConfigSchema.index({ usuario: 1, activo: 1 });
UserDashboardConfigSchema.index({ usuario: 1, es_default: 1 });
UserDashboardConfigSchema.index({ rol: 1 });

// Método para obtener o crear dashboard por defecto
UserDashboardConfigSchema.statics.getOrCreateDefault = async function(userId, rol, sedeId = null) {
  let config = await this.findOne({
    usuario: userId,
    activo: true,
    es_default: true
  }).populate('widgets.widget');

  if (!config) {
    const DashboardWidget = mongoose.model('DashboardWidget');
    const widgetsDefault = await DashboardWidget.getWidgetsPorRol(rol);

    const widgetInstances = widgetsDefault.map((w, index) => ({
      widget: w._id,
      widget_codigo: w.codigo,
      posicion: {
        x: (index % 4),
        y: Math.floor(index / 4),
        w: w.config_default?.width || 1,
        h: w.config_default?.height || 1
      },
      visible: true
    }));

    config = await this.create({
      usuario: userId,
      rol: rol,
      sede: sedeId,
      es_default: true,
      widgets: widgetInstances
    });

    config = await this.findById(config._id).populate('widgets.widget');
  }

  return config;
};

// Método para actualizar layout
UserDashboardConfigSchema.methods.actualizarLayout = async function(nuevoLayout) {
  this.widgets = nuevoLayout.map(item => {
    const widgetExistente = this.widgets.find(w => 
      w._id.toString() === item.id || w.widget_codigo === item.widget_codigo
    );
    
    return {
      ...widgetExistente?.toObject(),
      widget: item.widget || widgetExistente?.widget,
      widget_codigo: item.widget_codigo || widgetExistente?.widget_codigo,
      posicion: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h
      },
      visible: item.visible !== undefined ? item.visible : true
    };
  });
  
  this.ultima_modificacion = new Date();
  return this.save();
};

// Método para agregar widget
UserDashboardConfigSchema.methods.agregarWidget = async function(widgetId, posicion = {}) {
  const DashboardWidget = mongoose.model('DashboardWidget');
  const widget = await DashboardWidget.findById(widgetId);
  
  if (!widget) throw new Error('Widget no encontrado');
  
  const yaExiste = this.widgets.some(w => w.widget.toString() === widgetId);
  if (yaExiste) throw new Error('Widget ya existe en el dashboard');

  const maxY = Math.max(...this.widgets.map(w => w.posicion.y + w.posicion.h), 0);

  this.widgets.push({
    widget: widgetId,
    widget_codigo: widget.codigo,
    posicion: {
      x: posicion.x || 0,
      y: posicion.y || maxY,
      w: posicion.w || widget.config_default?.width || 1,
      h: posicion.h || widget.config_default?.height || 1
    },
    visible: true
  });

  this.ultima_modificacion = new Date();
  return this.save();
};

// Método para quitar widget
UserDashboardConfigSchema.methods.quitarWidget = async function(widgetInstanceId) {
  this.widgets = this.widgets.filter(w => w._id.toString() !== widgetInstanceId);
  this.ultima_modificacion = new Date();
  return this.save();
};

module.exports = mongoose.model('UserDashboardConfig', UserDashboardConfigSchema);
