const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentoSchema = new Schema({
  // Colaborador asociado
  colaborador: { type: Schema.Types.ObjectId, ref: 'Colaborador', required: true },
  sede: { type: Schema.Types.ObjectId, ref: 'Sede' },
  
  // Información del documento
  tipo: {
    type: String,
    enum: [
      'contrato', 'anexo_contrato', 'finiquito',
      'cedula_identidad', 'certificado_antecedentes', 'certificado_afp', 'certificado_salud',
      'licencia_conducir', 'titulo_profesional', 'certificacion',
      'licencia_medica', 'permiso', 'vacaciones',
      'amonestacion', 'felicitacion', 'memorandum',
      'liquidacion', 'certificado_trabajo',
      'curriculum', 'carta_recomendacion',
      'otro'
    ],
    required: true
  },
  categoria: {
    type: String,
    enum: ['legal', 'identificacion', 'salud', 'laboral', 'formacion', 'otro'],
    default: 'otro'
  },
  
  nombre: { type: String, required: true },
  descripcion: { type: String },
  
  // Archivo
  archivo: {
    url: { type: String },
    nombre_original: { type: String },
    tipo_mime: { type: String },
    tamaño: { type: Number },
    extension: { type: String }
  },
  
  // Fechas
  fecha_documento: { type: Date },
  fecha_emision: { type: Date },
  fecha_vencimiento: { type: Date },
  
  // Estado
  estado: {
    type: String,
    enum: ['vigente', 'por_vencer', 'vencido', 'anulado', 'archivado'],
    default: 'vigente'
  },
  
  // Verificación
  verificado: { type: Boolean, default: false },
  verificado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  fecha_verificacion: { type: Date },
  
  // Firma digital (si aplica)
  requiere_firma: { type: Boolean, default: false },
  firmado: { type: Boolean, default: false },
  firmado_por: { type: Schema.Types.ObjectId, ref: 'Colaborador' },
  fecha_firma: { type: Date },
  
  // Confidencialidad
  confidencial: { type: Boolean, default: false },
  visible_colaborador: { type: Boolean, default: true },
  
  // Notificaciones
  notificar_vencimiento: { type: Boolean, default: true },
  dias_aviso_vencimiento: { type: Number, default: 30 },
  
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
DocumentoSchema.index({ colaborador: 1, tipo: 1 });
DocumentoSchema.index({ fecha_vencimiento: 1 });
DocumentoSchema.index({ estado: 1 });
DocumentoSchema.index({ tipo: 1 });

// Virtual: días para vencer
DocumentoSchema.virtual('dias_para_vencer').get(function() {
  if (!this.fecha_vencimiento) return null;
  const hoy = new Date();
  const vencimiento = new Date(this.fecha_vencimiento);
  const diff = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
  return diff;
});

// Virtual: está por vencer
DocumentoSchema.virtual('esta_por_vencer').get(function() {
  const dias = this.dias_para_vencer;
  if (dias === null) return false;
  return dias > 0 && dias <= this.dias_aviso_vencimiento;
});

// Pre-save: actualizar estado según vencimiento
DocumentoSchema.pre('save', function(next) {
  if (this.fecha_vencimiento && this.estado !== 'anulado' && this.estado !== 'archivado') {
    const dias = this.dias_para_vencer;
    if (dias !== null) {
      if (dias < 0) {
        this.estado = 'vencido';
      } else if (dias <= this.dias_aviso_vencimiento) {
        this.estado = 'por_vencer';
      } else {
        this.estado = 'vigente';
      }
    }
  }
  next();
});

// Métodos estáticos
DocumentoSchema.statics.getByColaborador = function(colaboradorId) {
  return this.find({ colaborador: colaboradorId, activo: true })
    .sort({ fecha_documento: -1 });
};

DocumentoSchema.statics.getVencidos = function(sedeId) {
  const query = { estado: 'vencido', activo: true };
  if (sedeId) query.sede = sedeId;
  return this.find(query)
    .populate('colaborador', 'nombres apellido_paterno cargo')
    .sort({ fecha_vencimiento: 1 });
};

DocumentoSchema.statics.getPorVencer = function(dias = 30, sedeId) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + dias);
  
  const query = {
    fecha_vencimiento: { $lte: fechaLimite, $gte: new Date() },
    estado: { $nin: ['anulado', 'archivado', 'vencido'] },
    activo: true
  };
  if (sedeId) query.sede = sedeId;
  
  return this.find(query)
    .populate('colaborador', 'nombres apellido_paterno cargo')
    .sort({ fecha_vencimiento: 1 });
};

DocumentoSchema.statics.getResumen = async function(sedeId) {
  const match = { activo: true };
  if (sedeId) match.sede = new mongoose.Types.ObjectId(sedeId);
  
  return this.aggregate([
    { $match: match },
    { $group: {
        _id: '$estado',
        cantidad: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Documento', DocumentoSchema);
