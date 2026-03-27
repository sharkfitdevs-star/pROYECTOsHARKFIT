const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const AprobacionSchema = new Schema({
  tipo: {
    type: String,
    enum: ['compra', 'gasto', 'descuento', 'ajuste_stock', 'devolucion', 'otro'],
    required: true
  },
  modulo_origen: { type: String },
  titulo: { type: String, required: true },
  descripcion: { type: String },
  solicitante: { type: String, required: true },
  estado: {
    type: String,
    enum: ['pendiente', 'aprobada', 'rechazada', 'cancelada'],
    default: 'pendiente',
    index: true
  },
  prioridad: { type: Number },
  monto: { type: Number },
  datos_referencia: { type: Schema.Types.Mixed },
  comentario_resolucion: { type: String },
  resuelto_por: { type: String },
  fecha_solicitud: {
    type: Date,
    default: Date.now,
    index: true
  },
  fecha_resolucion: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Aprobacion', AprobacionSchema);