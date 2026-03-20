const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CandidatoSchema = new Schema({
  // Datos personales
  nombres: { type: String, required: true },
  apellido_paterno: { type: String, required: true },
  apellido_materno: { type: String },
  rut: { type: String },
  email: { type: String, required: true },
  telefono: { type: String },
  
  // Ubicación
  ciudad: { type: String },
  region: { type: String },
  disponibilidad_reubicacion: { type: Boolean, default: false },
  
  // Postulación
  cargo_postulado: { type: String, required: true },
  departamento: { type: String },
  sede_interes: { type: Schema.Types.ObjectId, ref: 'Sede' },
  
  // Fuente
  fuente: {
    type: String,
    enum: ['portal_empleo', 'linkedin', 'referido', 'web', 'agencia', 'feria_laboral', 'espontaneo', 'otro'],
    default: 'web'
  },
  referido_por: { type: Schema.Types.ObjectId, ref: 'Colaborador' },
  detalle_fuente: { type: String },
  
  // Perfil profesional
  titulo_profesional: { type: String },
  años_experiencia: { type: Number, default: 0 },
  experiencia_resumen: { type: String },
  habilidades: [{ type: String }],
  idiomas: [{
    idioma: { type: String },
    nivel: { type: String, enum: ['basico', 'intermedio', 'avanzado', 'nativo'] }
  }],
  
  // Documentos
  cv_url: { type: String },
  carta_url: { type: String },
  portafolio_url: { type: String },
  linkedin_url: { type: String },
  
  // Expectativas
  expectativa_salarial: { type: Number },
  disponibilidad_inicio: { type: String, enum: ['inmediata', '15_dias', '1_mes', '2_meses', 'otro'] },
  jornada_preferida: { type: String, enum: ['completa', 'parcial', 'flexible', 'remoto'] },
  
  // Proceso de selección
  estado: {
    type: String,
    enum: ['nuevo', 'revision_cv', 'entrevista_telefonica', 'entrevista_presencial', 'prueba_tecnica', 'entrevista_final', 'oferta', 'contratado', 'rechazado', 'descartado', 'lista_espera'],
    default: 'nuevo'
  },
  
  etapa_actual: { type: Number, default: 1 },
  
  // Evaluaciones del proceso
  evaluaciones: [{
    etapa: { type: String },
    evaluador: { type: Schema.Types.ObjectId, ref: 'Colaborador' },
    fecha: { type: Date, default: Date.now },
    puntuacion: { type: Number, min: 1, max: 5 },
    comentarios: { type: String },
    recomendacion: { type: String, enum: ['avanzar', 'rechazar', 'esperar'] }
  }],
  
  // Entrevistas programadas
  entrevistas: [{
    tipo: { type: String, enum: ['telefonica', 'presencial', 'video', 'tecnica', 'final'] },
    fecha: { type: Date },
    hora: { type: String },
    lugar: { type: String },
    entrevistadores: [{ type: Schema.Types.ObjectId, ref: 'Colaborador' }],
    estado: { type: String, enum: ['programada', 'realizada', 'cancelada', 'no_asistio'], default: 'programada' },
    notas: { type: String }
  }],
  
  // Oferta
  oferta: {
    fecha_oferta: { type: Date },
    cargo_ofrecido: { type: String },
    sueldo_ofrecido: { type: Number },
    fecha_inicio_propuesta: { type: Date },
    estado_oferta: { type: String, enum: ['pendiente', 'aceptada', 'rechazada', 'negociando'] },
    motivo_rechazo: { type: String }
  },
  
  // Motivo de descarte/rechazo
  motivo_descarte: { type: String },
  fecha_descarte: { type: Date },
  
  // Puntuación general
  puntuacion_general: { type: Number, min: 1, max: 5 },
  
  // Notas
  notas: { type: String },
  
  // Control
  activo: { type: Boolean, default: true },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  actualizado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
CandidatoSchema.index({ email: 1 });
CandidatoSchema.index({ estado: 1 });
CandidatoSchema.index({ cargo_postulado: 1 });
CandidatoSchema.index({ createdAt: -1 });
CandidatoSchema.index({ fuente: 1 });

// Virtual: nombre completo
CandidatoSchema.virtual('nombre_completo').get(function() {
  return `${this.nombres} ${this.apellido_paterno} ${this.apellido_materno || ''}`.trim();
});

// Virtual: días en proceso
CandidatoSchema.virtual('dias_en_proceso').get(function() {
  const inicio = new Date(this.createdAt);
  const hoy = new Date();
  return Math.ceil((hoy - inicio) / (1000 * 60 * 60 * 24));
});

// Virtual: promedio evaluaciones
CandidatoSchema.virtual('promedio_evaluaciones').get(function() {
  if (!this.evaluaciones || this.evaluaciones.length === 0) return null;
  const puntuaciones = this.evaluaciones.filter(e => e.puntuacion).map(e => e.puntuacion);
  if (puntuaciones.length === 0) return null;
  return Math.round((puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length) * 10) / 10;
});

// Métodos estáticos
CandidatoSchema.statics.getActivos = function() {
  return this.find({ 
    activo: true, 
    estado: { $nin: ['contratado', 'rechazado', 'descartado'] }
  }).sort({ createdAt: -1 });
};

CandidatoSchema.statics.getByEstado = function(estado) {
  return this.find({ estado, activo: true }).sort({ createdAt: -1 });
};

CandidatoSchema.statics.getResumen = async function() {
  return this.aggregate([
    { $match: { activo: true } },
    { $group: {
        _id: '$estado',
        cantidad: { $sum: 1 }
      }
    }
  ]);
};

CandidatoSchema.statics.getPorFuente = async function() {
  return this.aggregate([
    { $match: { activo: true } },
    { $group: {
        _id: '$fuente',
        cantidad: { $sum: 1 }
      }
    },
    { $sort: { cantidad: -1 } }
  ]);
};

module.exports = mongoose.model('Candidato', CandidatoSchema);
