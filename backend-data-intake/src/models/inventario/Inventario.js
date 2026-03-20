const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventarioSchema = new Schema({
  producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
  sede: { type: Schema.Types.ObjectId, ref: 'Sede', required: true },
  cantidad_actual: { type: Number, default: 0, min: 0 },
  cantidad_reservada: { type: Number, default: 0, min: 0 },
  cantidad_disponible: { type: Number, default: 0, min: 0 },
  stock_minimo: { type: Number, default: 5, min: 0 },
  stock_maximo: { type: Number, default: 100, min: 0 },
  punto_reorden: { type: Number, default: 10, min: 0 },
  ubicacion: {
    bodega: { type: String, trim: true },
    estante: { type: String, trim: true },
    nivel: { type: String, trim: true },
    posicion: { type: String, trim: true }
  },
  ultimo_conteo: { type: Date },
  proxima_revision: { type: Date },
  costo_promedio: { type: Number, default: 0 },
  valor_inventario: { type: Number, default: 0 },
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'bloqueado'],
    default: 'activo'
  },
  notas: { type: String },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  actualizado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

InventarioSchema.index({ producto: 1, sede: 1 }, { unique: true });
InventarioSchema.index({ sede: 1 });
InventarioSchema.index({ cantidad_actual: 1 });
InventarioSchema.index({ estado: 1 });

InventarioSchema.virtual('estado_stock').get(function() {
  if (this.cantidad_actual <= 0) return 'agotado';
  if (this.cantidad_actual <= this.stock_minimo) return 'bajo';
  if (this.cantidad_actual >= this.stock_maximo * 0.9) return 'alto';
  return 'normal';
});

InventarioSchema.virtual('necesita_reorden').get(function() {
  return this.cantidad_disponible <= this.punto_reorden;
});

InventarioSchema.pre('save', function(next) {
  this.cantidad_disponible = Math.max(0, this.cantidad_actual - this.cantidad_reservada);
  this.valor_inventario = this.cantidad_actual * this.costo_promedio;
  next();
});

InventarioSchema.methods.ajustarStock = async function(cantidad, tipo, motivo, usuario) {
  const MovimientoInventario = mongoose.model('MovimientoInventario');
  const cantidadAnterior = this.cantidad_actual;

  if (tipo === 'entrada') {
    this.cantidad_actual += cantidad;
  } else if (tipo === 'salida') {
    if (this.cantidad_actual < cantidad) {
      throw new Error('Stock insuficiente');
    }
    this.cantidad_actual -= cantidad;
  } else if (tipo === 'ajuste') {
    this.cantidad_actual = cantidad;
  }

  await MovimientoInventario.create({
    inventario: this._id,
    producto: this.producto,
    sede: this.sede,
    tipo,
    cantidad,
    cantidad_anterior: cantidadAnterior,
    cantidad_nueva: this.cantidad_actual,
    motivo,
    usuario
  });

  return this.save();
};

InventarioSchema.statics.getStockBajoPorSede = function(sedeId) {
  const query = {
    estado: 'activo',
    $expr: { $lte: ['$cantidad_actual', '$stock_minimo'] }
  };
  if (sedeId) query.sede = sedeId;
  return this.find(query)
    .populate('producto', 'nombre sku categoria')
    .populate('sede', 'nombre')
    .sort({ cantidad_actual: 1 });
};

InventarioSchema.statics.getValorTotal = async function(sedeId) {
  const match = { estado: 'activo' };
  if (sedeId) match.sede = new mongoose.Types.ObjectId(sedeId);

  const result = await this.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$valor_inventario' } } }
  ]);

  return result[0]?.total || 0;
};

module.exports = mongoose.model('Inventario', InventarioSchema);