const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExtractorConfigSchema = new Schema({
  nombre: { type: String, required: true },
  tipo: { type: String, enum: ['excel', 'csv', 'api'], default: 'excel' },
  mapeo_campos: { type: Map, of: String },
  validaciones: [{ campo: String, regla: String, mensaje: String }],
  activo: { type: Boolean, default: true },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

module.exports = mongoose.model('ExtractorConfig', ExtractorConfigSchema);
