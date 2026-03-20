const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CursoSchema = new Schema({
  // Identificación
  codigo: { type: String, unique: true },
  nombre: { type: String, required: true },
  descripcion: { type: String },
  
  // Categorización
  categoria: {
    type: String,
    enum: ['onboarding', 'tecnico', 'liderazgo', 'ventas', 'servicio_cliente', 'seguridad', 'compliance', 'desarrollo_personal', 'otro'],
    default: 'otro'
  },
  nivel: {
    type: String,
    enum: ['basico', 'intermedio', 'avanzado'],
    default: 'basico'
  },
  
  // Detalles
  duracion_horas: { type: Number, default: 1 },
  modalidad: {
    type: String,
    enum: ['presencial', 'online', 'mixto'],
    default: 'presencial'
  },
  
  // Contenido
  objetivos: [{ type: String }],
  temario: [{
    modulo: { type: String },
    descripcion: { type: String },
    duracion_minutos: { type: Number }
  }],
  materiales: [{
    tipo: { type: String },
    nombre: { type: String },
    url: { type: String }
  }],
  
  // Evaluación
  tiene_evaluacion: { type: Boolean, default: false },
  puntaje_aprobacion: { type: Number, default: 70 },
  intentos_permitidos: { type: Number, default: 3 },
  
  // Certificación
  otorga_certificado: { type: Boolean, default: true },
  validez_meses: { type: Number },
  
  // Instructor
  instructor_interno: { type: Schema.Types.ObjectId, ref: 'Colaborador' },
  instructor_externo: { type: String },
  
  // Requisitos
  requisitos_previos: [{ type: Schema.Types.ObjectId, ref: 'Curso' }],
  dirigido_a: [{ type: String }],
  obligatorio_para: [{ type: String }],
  
  // Estado
  estado: {
    type: String,
    enum: ['borrador', 'activo', 'pausado', 'archivado'],
    default: 'borrador'
  },
  
  // Imagen
  imagen_url: { type: String },
  
  // Control
  activo: { type: Boolean, default: true },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  actualizado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
  
}, { timestamps: true });

// Índices
CursoSchema.index({ categoria: 1 });
CursoSchema.index({ estado: 1 });
CursoSchema.index({ nivel: 1 });

// Pre-save
CursoSchema.pre('save', async function(next) {
  if (!this.codigo) {
    const count = await mongoose.model('Curso').countDocuments();
    this.codigo = `CRS-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Curso', CursoSchema);
