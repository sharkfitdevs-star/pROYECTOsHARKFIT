const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DistribucionSchema = new Schema({
  // Identificación
  codigo: { type: String, unique: true },
  
  // Tipo de distribución
  tipo: {
    type: String,
    enum: ['turno', 'horario', 'asignacion', 'ruta', 'zona'],
    default: 'turno'
  },
  
  nombre: { type: String, required: true },
  descripcion: { type: String },
  
  // Sede
  sede: { type: Schema.Types.ObjectId, ref: 'Sede' },
  
  // Período
  fecha_inicio: { type: Date, required: true },
  fecha_fin: { type: Date },
  recurrente: { type: Boolean, default: false },
  patron_recurrencia: {
    tipo: { type: String, enum: ['diario', 'semanal', 'mensual'] },
    dias_semana: [{ type: Number, min: 0, max: 6 }],
    intervalo: { type: Number, default: 1 }
  },
  
  // Asignaciones
  asignaciones: [{
    colaborador: { type: Schema.Types.ObjectId, ref: 'Colaborador', required: true },
    rol: { type: String },
    hora_inicio: { type: String },
    hora_fin: { type: String },
    zona: { type: String },
    area: { type: String },
    notas: { type: String },
    confirmado: { type: Boolean, default: false },
    fecha_confirmacion: { type: Date }
  }],
  
  // Capacidad
  capacidad_minima: { type: Number },
  capacidad_maxima: { type: Number },
  
  // Estado
  estado: {
    type: String,
    enum: ['borrador', 'publicado', 'en_curso', 'completado', 'cancelado'],
    default: 'borrador'
  },
  
  // Notas
  notas: { type: String },
  
  // Control
  activo: { type: Boolean, default: true },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  actualizado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  publicado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  fecha_publicacion: { type: Date }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
DistribucionSchema.index({ fecha_inicio: 1 });
DistribucionSchema.index({ sede: 1 });
DistribucionSchema.index({ estado: 1 });
DistribucionSchema.index({ 'asignaciones.colaborador': 1 });

// Virtual: total asignados
DistribucionSchema.virtual('total_asignados').get(function() {
  return this.asignaciones?.length || 0;
});

// Virtual: confirmados
DistribucionSchema.virtual('total_confirmados').get(function() {
  return this.asignaciones?.filter(a => a.confirmado).length || 0;
});

// Pre-save: generar código
DistribucionSchema.pre('save', async function(next) {
  if (!this.codigo) {
    const fecha = new Date();
    const count = await mongoose.model('Distribucion').countDocuments();
    this.codigo = `DIST-${fecha.getFullYear()}${String(fecha.getMonth()+1).padStart(2,'0')}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Métodos estáticos
DistribucionSchema.statics.getActivas = function(sedeId) {
  const query = { 
    activo: true, 
    estado: { $in: ['publicado', 'en_curso'] },
    fecha_fin: { $gte: new Date() }
  };
  if (sedeId) query.sede = sedeId;
  return this.find(query)
    .populate('asignaciones.colaborador', 'nombres apellido_paterno cargo')
    .sort({ fecha_inicio: 1 });
};

DistribucionSchema.statics.getByColaborador = function(colaboradorId) {
  return this.find({
    'asignaciones.colaborador': colaboradorId,
    activo: true,
    estado: { $in: ['publicado', 'en_curso'] }
  }).sort({ fecha_inicio: 1 });
};

module.exports = mongoose.model('Distribucion', DistribucionSchema);
