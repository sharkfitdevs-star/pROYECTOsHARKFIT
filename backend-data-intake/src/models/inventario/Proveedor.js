const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProveedorSchema = new Schema({
  nombre: { type: String, required: true, trim: true },
  razon_social: { type: String, trim: true },
  rut: { type: String, required: true, unique: true, trim: true },
  giro: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  telefono: { type: String, trim: true },
  telefono_alternativo: { type: String, trim: true },
  sitio_web: { type: String, trim: true },
  direccion: { type: String, trim: true },
  comuna: { type: String, trim: true },
  ciudad: { type: String, trim: true },
  region: { type: String, trim: true },
  codigo_postal: { type: String, trim: true },
  contacto_nombre: { type: String, trim: true },
  contacto_cargo: { type: String, trim: true },
  contacto_email: { type: String, trim: true },
  contacto_telefono: { type: String, trim: true },
  categorias: [{
    type: String,
    enum: ['suplementos', 'equipamiento', 'ropa', 'accesorios', 'bebidas', 'snacks', 'otros']
  }],
  condiciones_pago: {
    type: String,
    enum: ['contado', '15_dias', '30_dias', '60_dias', '90_dias'],
    default: 'contado'
  },
  dias_entrega: { type: Number, default: 3 },
  pedido_minimo: { type: Number, default: 0 },
  descuento_volumen: { type: Number, default: 0 },
  banco: { type: String, trim: true },
  tipo_cuenta: { type: String, enum: ['corriente', 'vista', 'ahorro'] },
  numero_cuenta: { type: String, trim: true },
  email_transferencia: { type: String, trim: true },
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'bloqueado', 'pendiente'],
    default: 'activo'
  },
  calificacion: { type: Number, min: 1, max: 5 },
  fecha_primera_compra: { type: Date },
  fecha_ultima_compra: { type: Date },
  total_compras: { type: Number, default: 0 },
  monto_total_compras: { type: Number, default: 0 },
  documentos: [{
    tipo: { type: String, enum: ['contrato', 'certificado', 'factura', 'otro'] },
    nombre: String,
    url: String,
    fecha: { type: Date, default: Date.now }
  }],
  notas: { type: String },
  activo: { type: Boolean, default: true },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  actualizado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ProveedorSchema.index({ rut: 1 }, { unique: true });
ProveedorSchema.index({ nombre: 'text', razon_social: 'text' });
ProveedorSchema.index({ estado: 1 });
ProveedorSchema.index({ categorias: 1 });

ProveedorSchema.virtual('nombre_completo').get(function() {
  return `${this.nombre} (${this.rut})`;
});

ProveedorSchema.methods.registrarCompra = async function(monto) {
  this.total_compras += 1;
  this.monto_total_compras += monto;
  this.fecha_ultima_compra = new Date();
  if (!this.fecha_primera_compra) {
    this.fecha_primera_compra = new Date();
  }
  return this.save();
};

ProveedorSchema.statics.getActivos = function() {
  return this.find({ estado: 'activo', activo: true }).sort({ nombre: 1 });
};

ProveedorSchema.statics.getPorCategoria = function(categoria) {
  return this.find({
    estado: 'activo',
    activo: true,
    categorias: categoria
  }).sort({ calificacion: -1 });
};

module.exports = mongoose.model('Proveedor', ProveedorSchema);