const mongoose = require('mongoose');

const logAutomatizacionSchema = new mongoose.Schema(
  {
    automatizacionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Automatizacion',
      required: true,
      index: true,
    },
    nombreAutomatizacion: { type: String, required: true },
    evento: { type: String, required: true, index: true },
    estado: {
      type: String,
      enum: ['ejecutada', 'omitida', 'error'],
      required: true,
      index: true,
    },
    detalle: { type: String, default: '' },
    contexto: { type: mongoose.Schema.Types.Mixed, default: {} },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    accionesEjecutadas: { type: Number, default: 0 },
    duracionMs: { type: Number, default: 0 },
    error: {
      mensaje: { type: String, default: '' },
      stack: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    collection: 'logs_automatizaciones',
  }
);

logAutomatizacionSchema.index({ createdAt: -1 });
logAutomatizacionSchema.index({ automatizacionId: 1, createdAt: -1 });

module.exports = mongoose.model('LogAutomatizacion', logAutomatizacionSchema);
