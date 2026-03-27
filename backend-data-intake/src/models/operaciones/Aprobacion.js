const mongoose = require('mongoose');

const aprobacionSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['vacaciones', 'compra', 'presupuesto', 'licencia', 'permiso', 'otro'], required: true, index: true },
  solicitante: { type: String, required: true },
  solicitante_id: { type: String, index: true },
  modulo_origen: { type: String, enum: ['rrhh', 'inventario', 'compras', 'formacion', 'operaciones'], index: true },
  titulo: { type: String, required: true },
  descripcion: String,
  datos_json: { type: mongoose.Schema.Types.Mixed, default: {} },
  estado: { type: String, enum: ['pendiente', 'aprobada', 'rechazada'], default: 'pendiente', index: true },
  prioridad: { type: String, enum: ['baja', 'media', 'alta', 'urgente'], default: 'media' },
  fecha_solicitud: { type: Date, default: Date.now },
  fecha_resolucion: Date,
  resuelto_por: String,
  comentario_resolucion: String,
  idBranch: { type: String, index: true }
}, { timestamps: true });

aprobacionSchema.index({ estado: 1, prioridad: -1, fecha_solicitud: -1 });
module.exports = mongoose.model('Aprobacion', aprobacionSchema);
