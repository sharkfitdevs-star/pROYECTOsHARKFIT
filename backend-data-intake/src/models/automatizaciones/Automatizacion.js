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

const accionSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ['CREAR_ALERTA', 'EMITIR_EVENTO', 'REGISTRAR_LOG'],
      required: true,
    },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const automatizacionSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    evento: { type: String, required: true, index: true },
    condiciones: { type: [condicionSchema], default: [] },
    acciones: { type: [accionSchema], default: [] },
    activa: { type: Boolean, default: true, index: true },
    archivada: { type: Boolean, default: false, index: true },
    ultimaEjecucionAt: { type: Date, default: null },
    ultimoResultado: {
      estado: { type: String, enum: ['ok', 'omitida', 'error'], default: null },
      detalle: { type: String, default: '' },
      at: { type: Date, default: null },
    },
    creadoPor: { type: String, default: null },
    actualizadoPor: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'automatizaciones',
  }
);

automatizacionSchema.index({ evento: 1, activa: 1, archivada: 1 });
automatizacionSchema.index({ nombre: 'text', descripcion: 'text' });

module.exports = mongoose.model('Automatizacion', automatizacionSchema);
