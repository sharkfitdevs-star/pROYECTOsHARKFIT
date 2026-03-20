const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrdenCompraSchema = new Schema({
  numero: { type: String, unique: true },
  proveedor: { type: Schema.Types.ObjectId, ref: 'Proveedor', required: true },
  sede: { type: Schema.Types.ObjectId, ref: 'Sede', required: true },
  items: [{
    producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
    cantidad: { type: Number, required: true, min: 1 },
    cantidad_recibida: { type: Number, default: 0 },
    precio_unitario: { type: Number, required: true, min: 0 },
    descuento: { type: Number, default: 0, min: 0, max: 100 },
    subtotal: { type: Number, default: 0 },
    notas: { type: String }
  }],
  fecha: { type: Date, default: Date.now },
  fecha_requerida: { type: Date },
  fecha_aprobacion: { type: Date },
  fecha_envio: { type: Date },
  fecha_cierre: { type: Date },
  estado: {
    type: String,
    enum: ['borrador', 'pendiente', 'aprobada', 'enviada', 'parcial', 'recibida', 'cancelada'],
    default: 'borrador'
  },
  subtotal: { type: Number, default: 0 },
  descuento_global: { type: Number, default: 0 },
  impuestos: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  condiciones_pago: {
    type: String,
    enum: ['contado', '15_dias', '30_dias', '60_dias', '90_dias'],
    default: 'contado'
  },
  moneda: { type: String, default: 'CLP' },
  direccion_entrega: { type: String },
  instrucciones_entrega: { type: String },
  solicitado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  aprobado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  motivo_rechazo: { type: String },
  entregas: [{ type: Schema.Types.ObjectId, ref: 'Entrega' }],
  documentos: [{
    tipo: { type: String, enum: ['cotizacion', 'orden', 'factura', 'otro'] },
    nombre: String,
    url: String,
    fecha: { type: Date, default: Date.now }
  }],
  observaciones: { type: String },
  notas_internas: { type: String },
  prioridad: {
    type: String,
    enum: ['baja', 'normal', 'alta', 'urgente'],
    default: 'normal'
  },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  actualizado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

OrdenCompraSchema.index({ numero: 1 }, { unique: true });
OrdenCompraSchema.index({ proveedor: 1, fecha: -1 });
OrdenCompraSchema.index({ sede: 1, fecha: -1 });
OrdenCompraSchema.index({ estado: 1 });

OrdenCompraSchema.pre('save', async function(next) {
  if (this.isNew && !this.numero) {
    const count = await mongoose.model('OrdenCompra').countDocuments();
    const fecha = new Date();
    this.numero = `OC-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      const descuento = item.precio_unitario * item.cantidad * (item.descuento / 100);
      item.subtotal = (item.precio_unitario * item.cantidad) - descuento;
    });
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    const descuentoGlobal = this.subtotal * (this.descuento_global / 100);
    const baseImponible = this.subtotal - descuentoGlobal;
    this.impuestos = Math.round(baseImponible * 0.19);
    this.total = Math.round(baseImponible + this.impuestos);
  }
  next();
});

OrdenCompraSchema.virtual('porcentaje_recibido').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  const totalCantidad = this.items.reduce((sum, item) => sum + item.cantidad, 0);
  const totalRecibido = this.items.reduce((sum, item) => sum + item.cantidad_recibida, 0);
  return totalCantidad > 0 ? Math.round((totalRecibido / totalCantidad) * 100) : 0;
});

OrdenCompraSchema.methods.aprobar = function(usuarioId) {
  if (this.estado !== 'pendiente') throw new Error('Solo se pueden aprobar órdenes pendientes');
  this.estado = 'aprobada';
  this.aprobado_por = usuarioId;
  this.fecha_aprobacion = new Date();
  return this.save();
};

OrdenCompraSchema.methods.rechazar = function(usuarioId, motivo) {
  if (this.estado !== 'pendiente') throw new Error('Solo se pueden rechazar órdenes pendientes');
  this.estado = 'cancelada';
  this.aprobado_por = usuarioId;
  this.motivo_rechazo = motivo;
  return this.save();
};

OrdenCompraSchema.methods.enviar = function(usuarioId) {
  if (this.estado !== 'aprobada') throw new Error('Solo se pueden enviar órdenes aprobadas');
  this.estado = 'enviada';
  this.fecha_envio = new Date();
  this.actualizado_por = usuarioId;
  return this.save();
};

OrdenCompraSchema.methods.crearEntrega = async function(usuarioId) {
  const Entrega = mongoose.model('Entrega');
  const entrega = new Entrega({
    proveedor: this.proveedor,
    sede: this.sede,
    orden_compra: this._id,
    items: this.items.map(item => ({
      producto: item.producto,
      cantidad_esperada: item.cantidad - item.cantidad_recibida,
      costo_unitario: item.precio_unitario
    })),
    fecha_programada: this.fecha_requerida,
    creado_por: usuarioId
  });
  await entrega.save();
  this.entregas.push(entrega._id);
  await this.save();
  return entrega;
};

OrdenCompraSchema.statics.getPendientesAprobacion = function(sedeId) {
  const query = { estado: 'pendiente' };
  if (sedeId) query.sede = sedeId;
  return this.find(query)
    .populate('proveedor', 'nombre')
    .populate('solicitado_por', 'firstName lastName')
    .sort({ prioridad: -1, fecha: 1 });
};

module.exports = mongoose.model('OrdenCompra', OrdenCompraSchema);
