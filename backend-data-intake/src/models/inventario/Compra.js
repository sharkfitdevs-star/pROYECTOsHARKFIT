/**
 * Modelo Compra - Órdenes de compra a proveedores
 * Sprint 4: Módulo Inventario - Sharkfit
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TIPOS_DOCUMENTO = { ORDEN_COMPRA: 'orden_compra', COTIZACION: 'cotizacion', DEVOLUCION: 'devolucion' };
const ESTADOS_COMPRA = { BORRADOR: 'borrador', PENDIENTE: 'pendiente', APROBADA: 'aprobada', ENVIADA: 'enviada', PARCIAL: 'parcial', RECIBIDA: 'recibida', COMPLETADA: 'completada', CANCELADA: 'cancelada' };
const METODOS_PAGO = { EFECTIVO: 'efectivo', TRANSFERENCIA: 'transferencia', TARJETA_DEBITO: 'tarjeta_debito', TARJETA_CREDITO: 'tarjeta_credito', CREDITO: 'credito', CHEQUE: 'cheque', OTRO: 'otro' };

const ItemCompraSchema = new Schema({
  producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
  variante_id: Schema.Types.ObjectId,
  variante_nombre: String,
  cantidad: { type: Number, required: true, min: 1 },
  cantidad_recibida: { type: Number, default: 0, min: 0 },
  precio_unitario: { type: Number, required: true, min: 0 },
  descuento_porcentaje: { type: Number, default: 0, min: 0, max: 100 },
  subtotal: { type: Number, required: true },
  fecha_recepcion: Date,
  numero_lote: String,
  fecha_vencimiento: Date,
  notas: String
}, { _id: true });

const RecepcionSchema = new Schema({
  fecha: { type: Date, default: Date.now },
  items: [{ item_id: Schema.Types.ObjectId, producto: { type: Schema.Types.ObjectId, ref: 'Producto' }, cantidad_recibida: Number, numero_lote: String, fecha_vencimiento: Date, observaciones: String }],
  numero_guia: String,
  recibido_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  notas: String
}, { _id: true });

const PagoSchema = new Schema({
  fecha: { type: Date, default: Date.now },
  monto: { type: Number, required: true },
  metodo: { type: String, enum: Object.values(METODOS_PAGO) },
  referencia: String,
  comprobante_url: String,
  registrado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  notas: String
}, { _id: true });

const CompraSchema = new Schema({
  codigo: { type: String, required: true, unique: true, uppercase: true },
  tipo: { type: String, enum: Object.values(TIPOS_DOCUMENTO), default: TIPOS_DOCUMENTO.ORDEN_COMPRA, index: true },
  proveedor: { type: Schema.Types.ObjectId, ref: 'Proveedor', required: true },
  datos_proveedor: { rut: String, nombre: String, direccion: String, telefono: String, email: String },
  sede: { type: String, required: true, index: true },
  items: [ItemCompraSchema],
  subtotal: { type: Number, default: 0 },
  descuento_global: { type: Number, default: 0 },
  iva: { type: Number, default: 0 },
  otros_impuestos: { type: Number, default: 0 },
  costo_envio: { type: Number, default: 0 },
  total: { type: Number, required: true },
  moneda: { type: String, default: 'CLP' },
  estado: { type: String, enum: Object.values(ESTADOS_COMPRA), default: ESTADOS_COMPRA.BORRADOR, index: true },
  fecha_emision: { type: Date, default: Date.now },
  fecha_vencimiento: Date,
  fecha_entrega_esperada: Date,
  fecha_entrega_real: Date,
  recepciones: [RecepcionSchema],
  pagos: [PagoSchema],
  monto_pagado: { type: Number, default: 0 },
  saldo_pendiente: { type: Number, default: 0 },
  condicion_pago: { type: String, enum: ['contado', 'credito_15', 'credito_30', 'credito_60', 'credito_90'] },
  documento_tributario: { tipo: { type: String, enum: ['factura', 'boleta', 'guia_despacho', 'nota_credito', null] }, numero: String, fecha: Date, url: String },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  aprobado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  fecha_aprobacion: Date,
  notas: String,
  notas_internas: String,
  activo: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

CompraSchema.index({ tipo: 1, estado: 1 });
CompraSchema.index({ proveedor: 1, fecha_emision: -1 });
CompraSchema.index({ sede: 1, fecha_emision: -1 });

CompraSchema.virtual('porcentaje_recibido').get(function() { const totalSolicitado = this.items.reduce((sum, i) => sum + i.cantidad, 0); const totalRecibido = this.items.reduce((sum, i) => sum + i.cantidad_recibida, 0); if (totalSolicitado === 0) return 0; return Math.round((totalRecibido / totalSolicitado) * 100); });
CompraSchema.virtual('vencida').get(function() { if (!this.fecha_vencimiento) return false; return new Date() > this.fecha_vencimiento && this.saldo_pendiente > 0; });

CompraSchema.pre('save', async function(next) {
  if (!this.codigo) {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.constructor.countDocuments({ tipo: this.tipo, fecha_creacion: { $gte: new Date(new Date().getFullYear(), 0, 1) } });
    this.codigo = `OC-${year}${String(count + 1).padStart(5, '0')}`;
  }
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  this.iva = Math.round((this.subtotal - this.descuento_global) * 0.19);
  this.total = this.subtotal - this.descuento_global + this.iva + this.otros_impuestos + this.costo_envio;
  this.monto_pagado = this.pagos.reduce((sum, p) => sum + p.monto, 0);
  this.saldo_pendiente = this.total - this.monto_pagado;
  next();
});

CompraSchema.methods.aprobar = async function(usuarioId) { if (this.estado !== ESTADOS_COMPRA.BORRADOR && this.estado !== ESTADOS_COMPRA.PENDIENTE) throw new Error('Solo se pueden aprobar documentos en borrador o pendiente'); this.estado = ESTADOS_COMPRA.APROBADA; this.aprobado_por = usuarioId; this.fecha_aprobacion = new Date(); return this.save(); };
CompraSchema.methods.enviar = async function() { if (this.estado !== ESTADOS_COMPRA.APROBADA) throw new Error('Solo se pueden enviar documentos aprobados'); this.estado = ESTADOS_COMPRA.ENVIADA; return this.save(); };

CompraSchema.methods.registrarRecepcion = async function(recepcionData, usuarioId) {
  const { items, numero_guia, notas } = recepcionData;
  const recepcion = { fecha: new Date(), items: [], numero_guia, recibido_por: usuarioId, notas };
  for (const itemRec of items) {
    const item = this.items.id(itemRec.item_id);
    if (!item) continue;
    item.cantidad_recibida += itemRec.cantidad_recibida;
    item.fecha_recepcion = new Date();
    if (itemRec.numero_lote) item.numero_lote = itemRec.numero_lote;
    if (itemRec.fecha_vencimiento) item.fecha_vencimiento = itemRec.fecha_vencimiento;
    recepcion.items.push({ item_id: item._id, producto: item.producto, cantidad_recibida: itemRec.cantidad_recibida, numero_lote: itemRec.numero_lote, fecha_vencimiento: itemRec.fecha_vencimiento, observaciones: itemRec.observaciones });
  }
  this.recepciones.push(recepcion);
  const todoRecibido = this.items.every(i => i.cantidad_recibida >= i.cantidad);
  const algunoRecibido = this.items.some(i => i.cantidad_recibida > 0);
  if (todoRecibido) { this.estado = ESTADOS_COMPRA.RECIBIDA; this.fecha_entrega_real = new Date(); }
  else if (algunoRecibido) this.estado = ESTADOS_COMPRA.PARCIAL;
  return this.save();
};

CompraSchema.methods.registrarPago = async function(pagoData, usuarioId) {
  const pago = { fecha: new Date(), monto: pagoData.monto, metodo: pagoData.metodo, referencia: pagoData.referencia, comprobante_url: pagoData.comprobante_url, registrado_por: usuarioId, notas: pagoData.notas };
  this.pagos.push(pago);
  if (this.saldo_pendiente - pagoData.monto <= 0 && this.estado === ESTADOS_COMPRA.RECIBIDA) this.estado = ESTADOS_COMPRA.COMPLETADA;
  return this.save();
};

CompraSchema.methods.cancelar = async function(motivo) { this.estado = ESTADOS_COMPRA.CANCELADA; this.notas_internas = `${this.notas_internas || ''}\nCancelado: ${motivo}`; return this.save(); };

CompraSchema.statics.findCompras = function(filtros = {}) { const query = { tipo: TIPOS_DOCUMENTO.ORDEN_COMPRA, activo: true }; if (filtros.estado) query.estado = filtros.estado; if (filtros.proveedor) query.proveedor = filtros.proveedor; if (filtros.sede) query.sede = filtros.sede; return this.find(query).populate('proveedor', 'codigo razon_social nombre_fantasia').sort({ fecha_emision: -1 }); };
CompraSchema.statics.findPorVencer = function(dias = 7) { const limite = new Date(); limite.setDate(limite.getDate() + dias); return this.find({ fecha_vencimiento: { $lte: limite }, saldo_pendiente: { $gt: 0 }, estado: { $nin: [ESTADOS_COMPRA.CANCELADA, ESTADOS_COMPRA.COMPLETADA] }, activo: true }).sort('fecha_vencimiento'); };
CompraSchema.statics.getCatalogos = function() { return { tipos: TIPOS_DOCUMENTO, estados: ESTADOS_COMPRA, metodos_pago: METODOS_PAGO }; };

module.exports = mongoose.model('Compra', CompraSchema);
module.exports.TIPOS_DOCUMENTO = TIPOS_DOCUMENTO;
module.exports.ESTADOS_COMPRA = ESTADOS_COMPRA;
module.exports.METODOS_PAGO = METODOS_PAGO;