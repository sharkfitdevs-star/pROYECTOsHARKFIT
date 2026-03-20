const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ColaboradorSchema = new Schema({
  // Datos personales
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  rut: { type: String, required: true, unique: true },
  fecha_nacimiento: { type: Date },
  genero: { type: String, enum: ['masculino', 'femenino', 'otro'] },
  nacionalidad: { type: String, default: 'Chilena' },
  estado_civil: { type: String, enum: ['soltero', 'casado', 'divorciado', 'viudo', 'conviviente'] },
  
  // Contacto
  email: { type: String },
  telefono: { type: String },
  direccion: {
    calle: String,
    numero: String,
    comuna: String,
    ciudad: String,
    region: String
  },
  contacto_emergencia: {
    nombre: String,
    telefono: String,
    relacion: String
  },
  
  // Datos laborales
  cargo: { type: String, required: true },
  departamento: { type: String },
  fecha_ingreso: { type: Date, required: true },
  fecha_termino: { type: Date },
  tipo_contrato: { 
    type: String, 
    enum: ['indefinido', 'plazo_fijo', 'honorarios', 'practica', 'temporal'],
    default: 'indefinido'
  },
  jornada: {
    type: String,
    enum: ['completa', 'parcial', 'por_turnos'],
    default: 'completa'
  },
  
  // Remuneración
  sueldo_base: { type: Number, default: 0 },
  bono_colacion: { type: Number, default: 0 },
  bono_movilizacion: { type: Number, default: 0 },
  otros_bonos: { type: Number, default: 0 },
  
  // Previsión
  afp: { type: String },
  tasa_afp: { type: Number, default: 10.69 },
  prevision_salud: { type: String, enum: ['fonasa', 'isapre'], default: 'fonasa' },
  isapre: { type: String },
  tasa_salud: { type: Number, default: 7 },
  
  // Banco
  banco: { type: String },
  tipo_cuenta: { type: String, enum: ['corriente', 'vista', 'ahorro'] },
  numero_cuenta: { type: String },
  
  // Estado
  estado: {
    type: String,
    enum: ['activo', 'licencia', 'vacaciones', 'suspendido', 'desvinculado'],
    default: 'activo'
  },
  
  // Sede y supervisor
  sede_actual: { type: Schema.Types.ObjectId, ref: 'Sede' },
  supervisor: { type: Schema.Types.ObjectId, ref: 'Colaborador' },
  
  // Usuario asociado (si tiene acceso al sistema)
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  
  // Documentos
  foto: { type: String },
  documentos: [{
    tipo: String,
    nombre: String,
    url: String,
    fecha_carga: Date
  }],
  
  // Historial de cambios
  historial_cargos: [{
    cargo: String,
    departamento: String,
    sede: { type: Schema.Types.ObjectId, ref: 'Sede' },
    fecha_inicio: Date,
    fecha_fin: Date,
    motivo_cambio: String
  }],
  
  historial_sueldos: [{
    sueldo_base: Number,
    fecha_desde: Date,
    fecha_hasta: Date,
    motivo: String
  }],
  
  // Vacaciones
  dias_vacaciones_acumulados: { type: Number, default: 0 },
  dias_vacaciones_tomados: { type: Number, default: 0 },
  
  // Metadata
  notas: { type: String },
  activo: { type: Boolean, default: true },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
ColaboradorSchema.index({ rut: 1 }, { unique: true });
ColaboradorSchema.index({ estado: 1 });
ColaboradorSchema.index({ sede_actual: 1 });
ColaboradorSchema.index({ cargo: 1 });
ColaboradorSchema.index({ departamento: 1 });

// Virtual: nombre completo
ColaboradorSchema.virtual('nombre_completo').get(function() {
  return `${this.nombre} ${this.apellido}`;
});

// Virtual: antigüedad en años
ColaboradorSchema.virtual('antiguedad').get(function() {
  if (!this.fecha_ingreso) return 0;
  const ahora = new Date();
  const ingreso = new Date(this.fecha_ingreso);
  const diff = ahora - ingreso;
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual: días de vacaciones disponibles
ColaboradorSchema.virtual('dias_vacaciones_disponibles').get(function() {
  return this.dias_vacaciones_acumulados - this.dias_vacaciones_tomados;
});

// Método: Calcular vacaciones anuales (15 días hábiles en Chile)
ColaboradorSchema.methods.calcularVacacionesAnuales = function() {
  const antiguedad = this.antiguedad;
  let diasBase = 15;
  
  // Días adicionales por antigüedad (cada 3 años = 1 día extra, máx 5)
  const diasAdicionales = Math.min(Math.floor(antiguedad / 3), 5);
  
  return diasBase + diasAdicionales;
};

// Pre-save: Agregar al historial de sueldos si cambia
ColaboradorSchema.pre('save', function(next) {
  if (this.isModified('sueldo_base') && !this.isNew) {
    const ultimoSueldo = this.historial_sueldos[this.historial_sueldos.length - 1];
    if (ultimoSueldo) {
      ultimoSueldo.fecha_hasta = new Date();
    }
    this.historial_sueldos.push({
      sueldo_base: this.sueldo_base,
      fecha_desde: new Date(),
      motivo: 'Actualización de sueldo'
    });
  }
  next();
});

// Método estático: Buscar activos por sede
ColaboradorSchema.statics.getActivosPorSede = function(sedeId) {
  const query = { estado: 'activo', activo: true };
  if (sedeId) query.sede_actual = sedeId;
  return this.find(query).sort({ apellido: 1, nombre: 1 });
};

// Método estático: Buscar por departamento
ColaboradorSchema.statics.getPorDepartamento = function(departamento, sedeId = null) {
  const query = { departamento, estado: 'activo' };
  if (sedeId) query.sede_actual = sedeId;
  return this.find(query).sort({ apellido: 1 });
};

module.exports = mongoose.model('Colaborador', ColaboradorSchema);
