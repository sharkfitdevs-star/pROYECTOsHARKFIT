const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema para items de remuneración (haberes y descuentos)
const ItemRemuneracionSchema = new Schema({
  codigo: { type: String, required: true },
  nombre: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['haber_imponible', 'haber_no_imponible', 'descuento_legal', 'descuento_voluntario', 'descuento_judicial'],
    required: true 
  },
  monto: { type: Number, required: true },
  es_porcentaje: { type: Boolean, default: false },
  porcentaje: { type: Number },
  base_calculo: { type: String }, // 'sueldo_base', 'sueldo_bruto', 'monto_fijo'
  descripcion: { type: String }
}, { _id: true });

// Schema principal de Remuneración
const RemuneracionSchema = new Schema({
  colaborador: { type: Schema.Types.ObjectId, ref: 'Colaborador', required: true },
  periodo: {
    mes: { type: Number, required: true, min: 1, max: 12 },
    anio: { type: Number, required: true }
  },
  tipo_liquidacion: {
    type: String,
    enum: ['mensual', 'finiquito', 'gratificacion', 'aguinaldo', 'bono_especial'],
    default: 'mensual'
  },
  
  // Datos del colaborador al momento de la liquidación
  datos_colaborador: {
    nombre_completo: String,
    rut: String,
    cargo: String,
    departamento: String,
    fecha_ingreso: Date,
    tipo_contrato: String,
    sede: String
  },
  
  // Información contractual
  sueldo_base: { type: Number, required: true },
  dias_trabajados: { type: Number, default: 30 },
  dias_licencia: { type: Number, default: 0 },
  dias_vacaciones: { type: Number, default: 0 },
  dias_permiso: { type: Number, default: 0 },
  dias_ausencia: { type: Number, default: 0 },
  horas_extra: { type: Number, default: 0 },
  
  // Haberes
  haberes: [ItemRemuneracionSchema],
  
  // Descuentos
  descuentos: [ItemRemuneracionSchema],
  
  // Totales calculados
  total_haberes_imponibles: { type: Number, default: 0 },
  total_haberes_no_imponibles: { type: Number, default: 0 },
  total_haberes: { type: Number, default: 0 },
  total_descuentos_legales: { type: Number, default: 0 },
  total_descuentos_voluntarios: { type: Number, default: 0 },
  total_descuentos: { type: Number, default: 0 },
  sueldo_bruto: { type: Number, default: 0 },
  sueldo_liquido: { type: Number, default: 0 },
  
  // Previsión (Chile)
  prevision: {
    afp: { type: String },
    tasa_afp: { type: Number },
    monto_afp: { type: Number, default: 0 },
    salud: { type: String }, // Fonasa o Isapre
    tasa_salud: { type: Number },
    monto_salud: { type: Number, default: 0 },
    seguro_cesantia: { type: Number, default: 0 },
    afc_empleador: { type: Number, default: 0 }
  },
  
  // Impuestos
  impuestos: {
    base_imponible: { type: Number, default: 0 },
    impuesto_unico: { type: Number, default: 0 },
    tramo_impuesto: { type: Number }
  },
  
  // Estado y aprobación
  estado: {
    type: String,
    enum: ['borrador', 'calculada', 'aprobada', 'pagada', 'anulada'],
    default: 'borrador'
  },
  fecha_calculo: { type: Date },
  fecha_aprobacion: { type: Date },
  aprobado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  fecha_pago: { type: Date },
  
  // Pago
  forma_pago: {
    type: String,
    enum: ['transferencia', 'cheque', 'efectivo', 'deposito'],
    default: 'transferencia'
  },
  banco: { type: String },
  numero_cuenta: { type: String },
  
  // PDF generado
  documento_pdf: {
    url: String,
    generado_en: Date
  },
  
  // Auditoría
  observaciones: { type: String },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  sede: { type: Schema.Types.ObjectId, ref: 'Sede' }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
RemuneracionSchema.index({ colaborador: 1, 'periodo.anio': 1, 'periodo.mes': 1 }, { unique: true });
RemuneracionSchema.index({ estado: 1 });
RemuneracionSchema.index({ 'periodo.anio': 1, 'periodo.mes': 1 });
RemuneracionSchema.index({ sede: 1 });

// Virtual: período formateado
RemuneracionSchema.virtual('periodo_str').get(function() {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${meses[this.periodo.mes - 1]} ${this.periodo.anio}`;
});

// Método: Calcular totales
RemuneracionSchema.methods.calcularTotales = function() {
  // Calcular haberes
  this.total_haberes_imponibles = this.haberes
    .filter(h => h.tipo === 'haber_imponible')
    .reduce((sum, h) => sum + h.monto, 0);
  
  this.total_haberes_no_imponibles = this.haberes
    .filter(h => h.tipo === 'haber_no_imponible')
    .reduce((sum, h) => sum + h.monto, 0);
  
  this.total_haberes = this.total_haberes_imponibles + this.total_haberes_no_imponibles;
  
  // Calcular descuentos
  this.total_descuentos_legales = this.descuentos
    .filter(d => d.tipo === 'descuento_legal')
    .reduce((sum, d) => sum + d.monto, 0);
  
  this.total_descuentos_voluntarios = this.descuentos
    .filter(d => ['descuento_voluntario', 'descuento_judicial'].includes(d.tipo))
    .reduce((sum, d) => sum + d.monto, 0);
  
  this.total_descuentos = this.total_descuentos_legales + this.total_descuentos_voluntarios;
  
  // Calcular sueldos
  this.sueldo_bruto = this.total_haberes;
  this.sueldo_liquido = this.sueldo_bruto - this.total_descuentos;
  
  return this;
};

// Método: Agregar haber estándar
RemuneracionSchema.methods.agregarHaber = function(codigo, nombre, tipo, monto, descripcion = '') {
  this.haberes.push({ codigo, nombre, tipo, monto, descripcion });
  return this;
};

// Método: Agregar descuento estándar
RemuneracionSchema.methods.agregarDescuento = function(codigo, nombre, tipo, monto, descripcion = '') {
  this.descuentos.push({ codigo, nombre, tipo, monto, descripcion });
  return this;
};

// Método estático: Obtener liquidaciones por período
RemuneracionSchema.statics.getPorPeriodo = function(mes, anio, sedeId = null) {
  const query = { 'periodo.mes': mes, 'periodo.anio': anio };
  if (sedeId) query.sede = sedeId;
  
  return this.find(query)
    .populate('colaborador', 'nombre apellido rut cargo')
    .sort({ 'datos_colaborador.nombre_completo': 1 });
};

// Método estático: Resumen por período
RemuneracionSchema.statics.getResumenPeriodo = async function(mes, anio, sedeId = null) {
  const match = { 'periodo.mes': mes, 'periodo.anio': anio };
  if (sedeId) match.sede = mongoose.Types.ObjectId(sedeId);
  
  const resultado = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$estado',
        cantidad: { $sum: 1 },
        total_bruto: { $sum: '$sueldo_bruto' },
        total_liquido: { $sum: '$sueldo_liquido' },
        total_descuentos: { $sum: '$total_descuentos' }
      }
    }
  ]);
  
  return resultado;
};

module.exports = mongoose.model('Remuneracion', RemuneracionSchema);
