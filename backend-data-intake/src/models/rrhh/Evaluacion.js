const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EvaluacionSchema = new Schema({
  // Referencias
  colaborador: { type: Schema.Types.ObjectId, ref: 'Colaborador', required: true },
  evaluador: { type: Schema.Types.ObjectId, ref: 'Colaborador', required: true },
  sede: { type: Schema.Types.ObjectId, ref: 'Sede' },
  
  // Información general
  tipo: { 
    type: String, 
    enum: ['desempeno', 'competencias', 'objetivos', 'periodo_prueba', '360', 'autoevaluacion'],
    default: 'desempeno'
  },
  periodo: {
    año: { type: Number, required: true },
    trimestre: { type: Number, min: 1, max: 4 },
    mes: { type: Number, min: 1, max: 12 },
    descripcion: { type: String }
  },
  
  // Fechas
  fecha_inicio: { type: Date },
  fecha_fin: { type: Date },
  fecha_evaluacion: { type: Date, default: Date.now },
  
  // Estado
  estado: {
    type: String,
    enum: ['borrador', 'en_progreso', 'pendiente_revision', 'completada', 'cancelada'],
    default: 'borrador'
  },
  
  // Criterios de evaluación
  criterios: [{
    nombre: { type: String, required: true },
    descripcion: { type: String },
    categoria: { type: String, enum: ['competencias', 'objetivos', 'valores', 'habilidades', 'otro'], default: 'competencias' },
    peso: { type: Number, default: 1, min: 0, max: 100 },
    puntuacion: { type: Number, min: 1, max: 5 },
    comentario: { type: String }
  }],
  
  // Objetivos específicos
  objetivos: [{
    descripcion: { type: String, required: true },
    meta: { type: String },
    resultado: { type: String },
    porcentaje_cumplimiento: { type: Number, min: 0, max: 100 },
    puntuacion: { type: Number, min: 1, max: 5 },
    comentario: { type: String }
  }],
  
  // Puntuaciones
  puntuacion_general: { type: Number, min: 1, max: 5 },
  puntuacion_ponderada: { type: Number },
  
  // Clasificación final
  clasificacion: {
    type: String,
    enum: ['excepcional', 'superior', 'satisfactorio', 'necesita_mejora', 'insatisfactorio'],
    default: 'satisfactorio'
  },
  
  // Fortalezas y áreas de mejora
  fortalezas: [{ type: String }],
  areas_mejora: [{ type: String }],
  
  // Plan de desarrollo
  plan_desarrollo: [{
    area: { type: String },
    accion: { type: String },
    fecha_compromiso: { type: Date },
    responsable: { type: String },
    estado: { type: String, enum: ['pendiente', 'en_progreso', 'completado'], default: 'pendiente' }
  }],
  
  // Comentarios
  comentario_evaluador: { type: String },
  comentario_colaborador: { type: String },
  comentario_rrhh: { type: String },
  
  // Firmas/Confirmaciones
  confirmado_evaluador: { type: Boolean, default: false },
  fecha_confirmacion_evaluador: { type: Date },
  confirmado_colaborador: { type: Boolean, default: false },
  fecha_confirmacion_colaborador: { type: Date },
  revisado_rrhh: { type: Boolean, default: false },
  fecha_revision_rrhh: { type: Date },
  revisado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  
  // Metadata
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  actualizado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
EvaluacionSchema.index({ colaborador: 1, 'periodo.año': -1 });
EvaluacionSchema.index({ evaluador: 1 });
EvaluacionSchema.index({ estado: 1 });
EvaluacionSchema.index({ tipo: 1 });
EvaluacionSchema.index({ fecha_evaluacion: -1 });

// Virtual: promedio de criterios
EvaluacionSchema.virtual('promedio_criterios').get(function() {
  if (!this.criterios || this.criterios.length === 0) return 0;
  const puntuaciones = this.criterios.filter(c => c.puntuacion).map(c => c.puntuacion);
  if (puntuaciones.length === 0) return 0;
  return Math.round((puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length) * 10) / 10;
});

// Pre-save: calcular puntuación ponderada
EvaluacionSchema.pre('save', function(next) {
  if (this.criterios && this.criterios.length > 0) {
    let sumaPonderada = 0;
    let sumaPesos = 0;
    this.criterios.forEach(c => {
      if (c.puntuacion && c.peso) {
        sumaPonderada += c.puntuacion * c.peso;
        sumaPesos += c.peso;
      }
    });
    this.puntuacion_ponderada = sumaPesos > 0 ? Math.round((sumaPonderada / sumaPesos) * 10) / 10 : 0;
  }
  
  // Determinar clasificación automática
  const puntaje = this.puntuacion_general || this.puntuacion_ponderada;
  if (puntaje >= 4.5) this.clasificacion = 'excepcional';
  else if (puntaje >= 3.5) this.clasificacion = 'superior';
  else if (puntaje >= 2.5) this.clasificacion = 'satisfactorio';
  else if (puntaje >= 1.5) this.clasificacion = 'necesita_mejora';
  else if (puntaje > 0) this.clasificacion = 'insatisfactorio';
  
  next();
});

// Métodos estáticos
EvaluacionSchema.statics.getByColaborador = function(colaboradorId) {
  return this.find({ colaborador: colaboradorId })
    .populate('evaluador', 'nombres apellido_paterno cargo')
    .sort({ fecha_evaluacion: -1 });
};

EvaluacionSchema.statics.getPendientes = function(evaluadorId) {
  return this.find({ 
    evaluador: evaluadorId, 
    estado: { $in: ['borrador', 'en_progreso'] }
  })
    .populate('colaborador', 'nombres apellido_paterno cargo foto')
    .sort({ fecha_evaluacion: -1 });
};

EvaluacionSchema.statics.getResumenAnual = async function(año, sedeId) {
  const match = { 'periodo.año': año, estado: 'completada' };
  if (sedeId) match.sede = new mongoose.Types.ObjectId(sedeId);
  
  return this.aggregate([
    { $match: match },
    { $group: {
        _id: '$clasificacion',
        cantidad: { $sum: 1 },
        promedio_puntuacion: { $avg: '$puntuacion_general' }
      }
    }
  ]);
};

module.exports = mongoose.model('Evaluacion', EvaluacionSchema);