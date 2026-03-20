const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovimientoInventarioSchema = new Schema({
  inventario: { type: Schema.Types.ObjectId, ref: 'Inventario' },
  producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
  sede: { type: Schema.Types.ObjectId, ref: 'Sede', required: true },
  tipo: {
    type: String,
    enum: ['entrada', 'salida', 'ajuste', 'transferencia', 'devolucion', 'merma', 'venta'],
    required: true
  },
  cantidad: { type: Number, required: true },
  cantidad_anterior: { type: Number, required: true },
  cantidad_nueva: { type: Number, required: true },
  costo_unitario: { type: Number, default: 0 },
  costo_total: { type: Number, default: 0 },
  origen: {
    type: String,
    enum: ['compra', 'venta', 'ajuste_manual', 'transferencia', 'devolucion_cliente', 'devolucion_proveedor', 'merma', 'inventario_fisico', 'otro'],
    default: 'otro'
  },
  documento_ref: {
    tipo: { type: String, enum: ['compra', 'venta', 'transferencia', 'ajuste'] },
    id: { type: Schema.Types.ObjectId }
  },
  sede_destino: { type: Schema.Types.ObjectId, ref: 'Sede' },
  motivo: { type: String, trim: true },
  notas: { type: String, trim: true },
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now }
}, { timestamps: true });

MovimientoInventarioSchema.index({ producto: 1, fecha: -1 });
MovimientoInventarioSchema.index({ sede: 1, fecha: -1 });
MovimientoInventarioSchema.index({ tipo: 1 });
MovimientoInventarioSchema.index({ fecha: -1 });
MovimientoInventarioSchema.index({ usuario: 1 });

MovimientoInventarioSchema.pre('save', function(next) {
  this.costo_total = this.cantidad * this.costo_unitario;
  next();
});

MovimientoInventarioSchema.statics.getHistorialProducto = function(productoId, limit = 50) {
  return this.find({ producto: productoId })
    .populate('usuario', 'firstName lastName username')
    .populate('sede', 'nombre')
    .sort({ fecha: -1 })
    .limit(limit);
};

MovimientoInventarioSchema.statics.getMovimientosHoy = function(sedeId) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const query = { fecha: { $gte: hoy } };
  if (sedeId) query.sede = sedeId;
  return this.find(query)
    .populate('producto', 'nombre sku')
    .populate('usuario', 'firstName lastName')
    .sort({ fecha: -1 });
};

MovimientoInventarioSchema.statics.getResumenPeriodo = async function(sedeId, fechaInicio, fechaFin) {
  const match = { fecha: { $gte: fechaInicio, $lte: fechaFin } };
  if (sedeId) match.sede = new mongoose.Types.ObjectId(sedeId);
  return this.aggregate([
    { $match: match },
    { $group: {
        _id: '$tipo',
        cantidad_total: { $sum: '$cantidad' },
        costo_total: { $sum: '$costo_total' },
        movimientos: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('MovimientoInventario', MovimientoInventarioSchema);
