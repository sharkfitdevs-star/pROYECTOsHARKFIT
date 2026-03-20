const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AdelantoSchema = new Schema({
  colaborador: { type: Schema.Types.ObjectId, ref: 'Colaborador', required: true },
  
  tipo: {
    type: String,
    enum: ['adelanto_sueldo', 'prestamo', 'anticipo_vacaciones', 'adelanto_gratificacion'],
    required: true
  },
  
  monto_solicitado: { type: Number, required: true },
  monto_aprobado: { type: Number },
  
  // Para préstamos con cuotas
  cuotas: { type: Number, default: 1 },
  monto_cuota: { type: Number },
  cuotas_pagadas: { type: Number, default: 0 },
  saldo_pendiente: { type: Number },
  
  motivo: { type: String },
  
  estado: {
    type: String,
    enum: ['solicitado', 'aprobado', 'rechazado', 'pagado', 'descontando', 'completado', 'anulado'],
    default: 'solicitado'
  },
  
  fecha_solicitud: { type: Date, default: Date.now },
  fecha_aprobacion: { type: Date },
  fecha_pago: { type: Date },
  
  aprobado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  rechazado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  motivo_rechazo: { type: String },
  
  // Descuentos aplicados
  descuentos_aplicados: [{
    remuneracion: { type: Schema.Types.ObjectId, ref: 'Remuneracion' },
    periodo: {
      mes: Number,
      anio: Number
    },
    monto: Number,
    fecha: Date
  }],
  
  // Período desde el cual se descuenta
  periodo_inicio_descuento: {
    mes: Number,
    anio: Number
  },
  
  observaciones: { type: String },
  sede: { type: Schema.Types.ObjectId, ref: 'Sede' },
  creado_por: { type: Schema.Types.ObjectId, ref: 'Usuario' }
  
}, { timestamps: true });

// Índices
AdelantoSchema.index({ colaborador: 1, estado: 1 });
AdelantoSchema.index({ estado: 1, fecha_solicitud: -1 });
AdelantoSchema.index({ sede: 1 });

// Virtual: porcentaje pagado
AdelantoSchema.virtual('porcentaje_pagado').get(function() {
  if (!this.cuotas || this.cuotas === 0) return 100;
  return Math.round((this.cuotas_pagadas / this.cuotas) * 100);
});

// Método: Registrar pago de cuota
AdelantoSchema.methods.registrarPagoCuota = function(remuneracionId, mes, anio, monto) {
  this.descuentos_aplicados.push({
    remuneracion: remuneracionId,
    periodo: { mes, anio },
    monto,
    fecha: new Date()
  });
  
  this.cuotas_pagadas += 1;
  this.saldo_pendiente = (this.monto_aprobado || this.monto_solicitado) - 
    this.descuentos_aplicados.reduce((sum, d) => sum + d.monto, 0);
  
  if (this.cuotas_pagadas >= this.cuotas) {
    this.estado = 'completado';
  }
  
  return this;
};

// Método estático: Obtener adelantos pendientes de un colaborador
AdelantoSchema.statics.getPendientes = function(colaboradorId) {
  return this.find({
    colaborador: colaboradorId,
    estado: { $in: ['aprobado', 'pagado', 'descontando'] }
  }).sort({ fecha_aprobacion: 1 });
};

module.exports = mongoose.model('Adelanto', AdelantoSchema);
