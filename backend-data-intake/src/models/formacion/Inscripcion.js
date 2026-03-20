const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InscripcionSchema = new Schema({
  curso: { type: Schema.Types.ObjectId, ref: 'Curso', required: true },
  colaborador: { type: Schema.Types.ObjectId, ref: 'Colaborador', required: true },
  fecha_inscripcion: { type: Date, default: Date.now },
  fecha_inicio: { type: Date },
  fecha_completado: { type: Date },
  fecha_vencimiento: { type: Date },
  estado: {
    type: String,
    enum: ['inscrito', 'en_progreso', 'completado', 'reprobado', 'vencido', 'cancelado'],
    default: 'inscrito'
  },
  progreso_porcentaje: { type: Number, default: 0, min: 0, max: 100 },
  modulos_completados: [{ type: String }],
  intentos_evaluacion: { type: Number, default: 0 },
  puntaje_obtenido: { type: Number },
  aprobado: { type: Boolean },
  fecha_evaluacion: { type: Date },
  certificado_emitido: { type: Boolean, default: false },
  certificado_url: { type: String },
  fecha_emision_certificado: { type: Date },
  asistencias: [{
    fecha: { type: Date },
    presente: { type: Boolean },
    justificacion: { type: String }
  }],
  porcentaje_asistencia: { type: Number, default: 0 },
  calificacion_curso: { type: Number, min: 1, max: 5 },
  comentario: { type: String },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

InscripcionSchema.index({ curso: 1, colaborador: 1 }, { unique: true });
InscripcionSchema.index({ colaborador: 1 });
InscripcionSchema.index({ estado: 1 });

module.exports = mongoose.model('Inscripcion', InscripcionSchema);
