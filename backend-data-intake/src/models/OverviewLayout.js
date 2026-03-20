const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WidgetSchema = new Schema({
  tipo: { type: String, required: true },
  titulo: { type: String },
  posicion: { x: Number, y: Number },
  tamaño: { w: Number, h: Number },
  configuracion: { type: Schema.Types.Mixed },
  visible: { type: Boolean, default: true }
}, { _id: true });

const OverviewLayoutSchema = new Schema({
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  rol: { type: String, required: true },
  sede: { type: String },
  widgets: [WidgetSchema],
  layout_guardado: { type: Schema.Types.Mixed },
  es_default: { type: Boolean, default: false },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

OverviewLayoutSchema.index({ usuario: 1, rol: 1 }, { unique: true });

module.exports = mongoose.model('OverviewLayout', OverviewLayoutSchema);
