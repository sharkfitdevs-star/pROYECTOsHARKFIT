/**
 * Modelo Producto - Catálogo de productos e implementos
 * Sprint 4: Módulo Inventario - Sharkfit
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CATEGORIAS_PRODUCTO = {
  EQUIPAMIENTO: 'equipamiento',
  INDUMENTARIA: 'indumentaria',
  SUPLEMENTOS: 'suplementos',
  ACCESORIOS: 'accesorios',
  TECNOLOGIA: 'tecnologia',
  LIMPIEZA: 'limpieza',
  OFICINA: 'oficina',
  MOBILIARIO: 'mobiliario',
  MERCHANDISING: 'merchandising',
  OTROS: 'otros'
};

const TIPOS_PRODUCTO = {
  VENTA: 'venta',
  INTERNO: 'interno',
  MIXTO: 'mixto'
};

const UNIDADES_MEDIDA = {
  UNIDAD: 'unidad',
  PAR: 'par',
  CAJA: 'caja',
  KILOGRAMO: 'kg',
  LITRO: 'lt',
  METRO: 'mt',
  PAQUETE: 'paquete',
  SET: 'set'
};

const ESTADOS_PRODUCTO = {
  ACTIVO: 'activo',
  DESCONTINUADO: 'descontinuado',
  AGOTADO: 'agotado',
  PROXIMAMENTE: 'proximamente'
};

const VarianteSchema = new Schema({
  nombre: { type: String, required: true },
  sku_variante: { type: String },
  precio_adicional: { type: Number, default: 0 },
  activo: { type: Boolean, default: true }
}, { _id: true });

const HistorialPrecioSchema = new Schema({
  precio_anterior: { type: Number, required: true },
  precio_nuevo: { type: Number, required: true },
  motivo: { type: String },
  fecha: { type: Date, default: Date.now },
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' }
}, { _id: true });

const ProductoSchema = new Schema({
  codigo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  sku: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  codigo_barras: { type: String, unique: true, sparse: true },
  nombre: { type: String, required: [true, 'El nombre es requerido'], trim: true, maxlength: 200 },
  descripcion: { type: String, maxlength: 1000 },
  descripcion_corta: { type: String, maxlength: 200 },
  categoria: { type: String, enum: Object.values(CATEGORIAS_PRODUCTO), required: true, index: true },
  subcategoria: { type: String, trim: true },
  tipo: { type: String, enum: Object.values(TIPOS_PRODUCTO), default: TIPOS_PRODUCTO.MIXTO, index: true },
  marca: { type: String, trim: true },
  modelo: { type: String, trim: true },
  unidad_medida: { type: String, enum: Object.values(UNIDADES_MEDIDA), default: UNIDADES_MEDIDA.UNIDAD },
  peso_kg: { type: Number, min: 0 },
  dimensiones: {
    largo_cm: { type: Number, min: 0 },
    ancho_cm: { type: Number, min: 0 },
    alto_cm: { type: Number, min: 0 }
  },
  precio_costo: { type: Number, min: 0, default: 0 },
  precio_venta: { type: Number, min: 0, default: 0 },
  precio_mayorista: { type: Number, min: 0 },
  iva_incluido: { type: Boolean, default: true },
  moneda: { type: String, default: 'CLP' },
  historial_precios: [HistorialPrecioSchema],
  tiene_variantes: { type: Boolean, default: false },
  tipo_variante: { type: String, enum: ['talla', 'color', 'tamaño', 'sabor', 'otro', null], default: null },
  variantes: [VarianteSchema],
  stock_minimo: { type: Number, default: 5, min: 0 },
  stock_maximo: { type: Number, min: 0 },
  punto_reorden: { type: Number, default: 10, min: 0 },
  permite_stock_negativo: { type: Boolean, default: false },
  proveedor_principal: { type: Schema.Types.ObjectId, ref: 'Proveedor' },
  tiempo_reposicion_dias: { type: Number, min: 0 },
  estado: { type: String, enum: Object.values(ESTADOS_PRODUCTO), default: ESTADOS_PRODUCTO.ACTIVO, index: true },
  imagen_principal: { type: String },
  imagenes: [{ url: String, orden: Number }],
  visible_en_catalogo: { type: Boolean, default: true },
  permite_venta_online: { type: Boolean, default: false },
  requiere_receta: { type: Boolean, default: false },
  es_entregable: { type: Boolean, default: false },
  requiere_devolucion: { type: Boolean, default: false },
  vida_util_meses: { type: Number, min: 0 },
  tags: [{ type: String, lowercase: true, trim: true }],
  notas_internas: { type: String, maxlength: 500 },
  activo: { type: Boolean, default: true },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  actualizado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
}, {
  timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ProductoSchema.index({ nombre: 'text', descripcion: 'text', tags: 'text' });
ProductoSchema.index({ categoria: 1, estado: 1 });
ProductoSchema.index({ tipo: 1, estado: 1 });
ProductoSchema.index({ proveedor_principal: 1 });

ProductoSchema.virtual('margen_ganancia').get(function() {
  if (!this.precio_costo || !this.precio_venta) return 0;
  return ((this.precio_venta - this.precio_costo) / this.precio_costo * 100).toFixed(2);
});

ProductoSchema.virtual('precio_sin_iva').get(function() {
  if (!this.precio_venta || this.iva_incluido === false) return this.precio_venta;
  return Math.round(this.precio_venta / 1.19);
});

ProductoSchema.pre('save', async function(next) {
  if (!this.codigo) {
    const prefijo = this.categoria.substring(0, 3).toUpperCase();
    const count = await this.constructor.countDocuments({ categoria: this.categoria });
    this.codigo = `${prefijo}-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.isModified('precio_venta') && !this.isNew) {
    const original = await this.constructor.findById(this._id);
    if (original && original.precio_venta !== this.precio_venta) {
      this.historial_precios.push({
        precio_anterior: original.precio_venta,
        precio_nuevo: this.precio_venta,
        fecha: new Date()
      });
    }
  }
  next();
});

ProductoSchema.methods.actualizarPrecio = async function(nuevoPrecio, motivo, usuarioId) {
  this.historial_precios.push({
    precio_anterior: this.precio_venta,
    precio_nuevo: nuevoPrecio,
    motivo,
    fecha: new Date(),
    usuario: usuarioId
  });
  this.precio_venta = nuevoPrecio;
  this.actualizado_por = usuarioId;
  return this.save();
};

ProductoSchema.methods.descontinuar = async function(usuarioId) {
  this.estado = ESTADOS_PRODUCTO.DESCONTINUADO;
  this.visible_en_catalogo = false;
  this.actualizado_por = usuarioId;
  return this.save();
};

ProductoSchema.methods.agregarVariante = async function(nombreVariante, precioAdicional = 0) {
  if (!this.tiene_variantes) this.tiene_variantes = true;
  this.variantes.push({ nombre: nombreVariante, precio_adicional: precioAdicional, activo: true });
  return this.save();
};

ProductoSchema.statics.findByCategoria = function(categoria, soloActivos = true) {
  const query = { categoria };
  if (soloActivos) query.estado = ESTADOS_PRODUCTO.ACTIVO;
  return this.find(query).sort('nombre');
};

ProductoSchema.statics.findParaVenta = function() {
  return this.find({
    tipo: { $in: [TIPOS_PRODUCTO.VENTA, TIPOS_PRODUCTO.MIXTO] },
    estado: ESTADOS_PRODUCTO.ACTIVO,
    visible_en_catalogo: true
  }).sort('categoria nombre');
};

ProductoSchema.statics.findEntregables = function() {
  return this.find({ es_entregable: true, estado: ESTADOS_PRODUCTO.ACTIVO }).sort('categoria nombre');
};

ProductoSchema.statics.buscar = function(termino, opciones = {}) {
  const query = { $text: { $search: termino }, estado: ESTADOS_PRODUCTO.ACTIVO };
  if (opciones.categoria) query.categoria = opciones.categoria;
  if (opciones.tipo) query.tipo = opciones.tipo;
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(opciones.limite || 20);
};

ProductoSchema.statics.getEstadisticas = async function() {
  const stats = await this.aggregate([
    {
      $facet: {
        porCategoria: [{ $group: { _id: '$categoria', total: { $sum: 1 } } }],
        porEstado: [{ $group: { _id: '$estado', total: { $sum: 1 } } }],
        porTipo: [{ $group: { _id: '$tipo', total: { $sum: 1 } } }],
        totales: [{
          $group: {
            _id: null,
            total: { $sum: 1 },
            activos: { $sum: { $cond: [{ $eq: ['$estado', 'activo'] }, 1, 0] } },
            con_variantes: { $sum: { $cond: ['$tiene_variantes', 1, 0] } },
            entregables: { $sum: { $cond: ['$es_entregable', 1, 0] } }
          }
        }]
      }
    }
  ]);
  return {
    por_categoria: stats[0].porCategoria,
    por_estado: stats[0].porEstado,
    por_tipo: stats[0].porTipo,
    totales: stats[0].totales[0] || { total: 0, activos: 0 }
  };
};

ProductoSchema.statics.getCatalogos = function() {
  return {
    categorias: CATEGORIAS_PRODUCTO,
    tipos: TIPOS_PRODUCTO,
    unidades: UNIDADES_MEDIDA,
    estados: ESTADOS_PRODUCTO
  };
};

module.exports = mongoose.model('Producto', ProductoSchema);
module.exports.CATEGORIAS_PRODUCTO = CATEGORIAS_PRODUCTO;
module.exports.TIPOS_PRODUCTO = TIPOS_PRODUCTO;
module.exports.UNIDADES_MEDIDA = UNIDADES_MEDIDA;
module.exports.ESTADOS_PRODUCTO = ESTADOS_PRODUCTO;