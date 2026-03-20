const mongoose = require('mongoose');

const condicionSchema = new mongoose.Schema(
  {
    campo: { type: String, required: true },
    operador: {
      type: String,
      enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'exists'],
      default: 'eq',
    },
    valor: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const reglaAlertaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    tipoAlerta: { type: String, required: true, index: true },
    prioridad: {
      type: String,
      enum: ['baja', 'media', 'alta', 'urgente', 'critica'],
      default: 'media',
    },
    frecuencia: {
      type: String,
      enum: ['cada_5_min', 'cada_hora', 'diaria', 'manual'],
      default: 'diaria',
      index: true,
    },
    condiciones: { type: [condicionSchema], default: [] },
    activa: { type: Boolean, default: true, index: true },
    plantilla: { type: String, default: null },
    destinatarios: { type: [String], default: [] },
    canales: { type: [String], default: ['dashboard'] },
    aplicarSucursales: { type: [String], default: [] },
    aplicarUsuarios: { type: [String], default: [] },
    configuracion: {
      diasAnticipacion: { type: Number, default: 7 },
      tituloPlantilla: { type: String, default: '' },
      descripcionPlantilla: { type: String, default: '' },
    },
    ultimaEvaluacionAt: { type: Date, default: null },
    ultimoResultado: {
      alertasGeneradas: { type: Number, default: 0 },
      detalle: { type: String, default: '' },
      at: { type: Date, default: null },
    },
    creadoPor: { type: String, default: null },
    actualizadoPor: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'reglas_alertas',
  }
);

reglaAlertaSchema.index({ tipoAlerta: 1, activa: 1, frecuencia: 1 });
reglaAlertaSchema.index({ nombre: 'text', descripcion: 'text' });

module.exports = mongoose.model('ReglaAlerta', reglaAlertaSchema);
