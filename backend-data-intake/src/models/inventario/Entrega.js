const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EntregaSchema = new Schema({
  numero: { type: String, unique: true },
  proveedor: { type: Schema.Types.ObjectId, ref: 'Proveedor', required: true },
  sede: { type: Schema.Types.ObjectId, ref: 'Sede', required: true },
  orden_compra: { type: Schema.Types.ObjectId, ref: 'OrdenCompra' },
  items: [{
    producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
    cantidad_esperada: { type: Number, required: true, min: 0 },
    cantidad_recibida: { type: Number, default: 0, min: 0 },
    cantidad_rechazada: { type: Number, default: 0, min: 0 },
    motivo_rechazo: { type: String },
    costo_unitario: { type: Number, default: 0 },
    costo_total: { type: Number, default: 0 },
    lote: { type: String },
    fecha_vencimiento: { type: Date }
  }],
  fecha_programada: { type: Date },
  fecha_entrega: { type: Date },
  fecha_recepcion: { type: Date },
  estado: {
    type: String,
    enum: ['pendiente', 'en_transito', 'recibida_parcial', 'entregado', 'cancelado'],
    default: 'pendiente'
  },
  transportista: { type: String },
  numero_guia: { type: String },
  vehiculo: { type: String },
  recibido_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  verificado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  total_items: { type: Number, default: 0 },
  total_recibido: { type: Number, default: 0 },
  total_rechazado: { type: Number, default: 0 },
  monto_total: { type: Number, default: 0 },
  documentos: [{
    tipo: { type: String, enum: ['guia_despacho', 'factura', 'nota_credito', 'foto', 'otro'] },
    nombre: String,
    url: String,
    fecha: { type: Date, default: Date.now }
  }],
  observaciones: { type: String },
  notas_internas: { type: String },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  actualizado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

EntregaSchema.index({ numero: 1 }, { unique: true });
EntregaSchema.index({ proveedor: 1, fecha_entrega: -1 });
EntregaSchema.index({ sede: 1, fecha_entrega: -1 });
EntregaSchema.index({ estado: 1 });
EntregaSchema.index({ orden_compra: 1 });

EntregaSchema.pre('save', async function(next) {
  if (this.isNew && !this.numero) {
    const count = await mongoose.model('Entrega').countDocuments();
    const fecha = new Date();
    this.numero = `ENT-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.items && this.items.length > 0) {
    this.total_items = this.items.reduce((sum, item) => sum + item.cantidad_esperada, 0);
    this.total_recibido = this.items.reduce((sum, item) => sum + item.cantidad_recibida, 0);
    this.total_rechazado = this.items.reduce((sum, item) => sum + item.cantidad_rechazada, 0);
    this.monto_total = this.items.reduce((sum, item) => sum + (item.cantidad_recibida * item.costo_unitario), 0);
    this.items.forEach(item => {
      item.costo_total = item.cantidad_recibida * item.costo_unitario;
    });
  }
  next();
});

EntregaSchema.virtual('porcentaje_recibido').get(function() {
  if (this.total_items === 0) return 0;
  return Math.round((this.total_recibido / this.total_items) * 100);
});

EntregaSchema.methods.confirmarRecepcion = async function(items, usuarioId) {
  const Inventario = mongoose.model('Inventario');
  for (const itemData of items) {
    const item = this.items.id(itemData.itemId);
    if (item) {
      item.cantidad_recibida = itemData.cantidad_recibida;
      item.cantidad_rechazada = itemData.cantidad_rechazada || 0;
      item.motivo_rechazo = itemData.motivo_rechazo;
      if (itemData.cantidad_recibida > 0) {
        let inventario = await Inventario.findOne({ producto: item.producto, sede: this.sede });
        if (!inventario) {
          inventario = new Inventario({ producto: item.producto, sede: this.sede, cantidad_actual: 0 });
        }
        await inventario.ajustarStock(itemData.cantidad_recibida, 'entrada', `Recepción de entrega ${this.numero}`, usuarioId);
      }
    }
  }
  if (this.total_recibido === 0) {
    this.estado = 'cancelado';
  } else if (this.total_recibido < this.total_items) {
    this.estado = 'recibida_parcial';
  } else {
    this.estado = 'entregado';
  }
  this.fecha_recepcion = new Date();
  this.recibido_por = usuarioId;
  return this.save();
};

EntregaSchema.statics.getPendientes = function(sedeId) {
  const query = { estado: { $in: ['pendiente', 'en_transito'] } };
  if (sedeId) query.sede = sedeId;
  return this.find(query)
    .populate('proveedor', 'nombre')
    .populate('sede', 'nombre')
    .sort({ fecha_programada: 1 });
};

module.exports = mongoose.model('Entrega', EntregaSchema);