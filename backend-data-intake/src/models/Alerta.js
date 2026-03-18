/**
 * models/Alerta.js — v2
 *
 * CAMBIOS vs v1:
 * - status: añadidos 'completada' y 'cancelada' para alinear con el frontend.
 *   'resuelta' se mantiene como alias semántico del backend.
 *   Mapa de equivalencia:
 *     frontend "completada" === backend "resuelta"
 *     frontend "cancelada"  === backend "descartada"
 * - priority: añadido 'urgente' (el frontend filtraba por él pero no existía).
 *   Orden: baja < media < alta < urgente < critica
 * - dueDate: campo explícito para fecha límite (el frontend la usa directamente como dueDate)
 * - responsable: campo de texto libre para compatibilidad con la UI legacy.
 */

const mongoose = require('mongoose');

const alertaSchema = new mongoose.Schema(
  {
    idAlert: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },

    type: {
      type: String,
      enum: [
        'membresia_vencida',
        'membresia_por_vencer',
        'pago_pendiente',
        'pago_vencido',
        'inactividad',
        'cumpleanos',
        'seguimiento',
        'sistema',
        'kpi_rendimiento',
        'otro',
      ],
      required: true,
      index:    true,
    },

    priority: {
      type:    String,
      // urgente agregado para alinear con el filtro del frontend
      enum:    ['baja', 'media', 'alta', 'urgente', 'critica'],
      default: 'media',
      index:   true,
    },

    status: {
      type: String,
      // completada y cancelada agregados para alinear con el frontend
      // resuelta y descartada se mantienen como estados backend "oficiales"
      enum:    ['pendiente', 'en_proceso', 'resuelta', 'completada', 'descartada', 'cancelada'],
      default: 'pendiente',
      index:   true,
    },

    title:       { type: String, required: true },
    description: String,

    // Campos de miembro
    idMember:   { type: String, index: true },
    memberName: String,

    // Campos de sede
    idBranch:   { type: String, index: true },
    branchName: String,

    // Campo de texto libre para responsable (compatibilidad UI legacy)
    responsable: String,

    // Fecha límite explícita (el frontend la usa directamente como dueDate)
    dueDate: { type: Date, index: true },

    // Datos específicos según tipo de alerta
    alertData: {
      membershipEndDate:    Date,
      daysUntilExpiration:  Number,
      paymentAmount:        Number,
      paymentDueDate:       Date,
      daysOverdue:          Number,
      idSale:               String,
      lastVisit:            Date,
      daysInactive:         Number,
      birthDate:            Date,
      age:                  Number,
      customData:           mongoose.Schema.Types.Mixed,
    },

    suggestedActions: [String],
    notes:            String,
    internalNotes:    String,

    // Asignación
    assignedTo:     String,
    assignedToName: String,
    assignedAt:     Date,

    // Resolución
    resolvedAt:      Date,
    resolvedBy:      String,
    resolvedByName:  String,
    resolutionNotes: String,

    // Notificaciones
    notificationSent:     { type: Boolean, default: false },
    notificationSentAt:   Date,
    notificationMethod:   String,

    // Metadata
    createdAt:  { type: Date, default: Date.now, index: true },
    updatedAt:  { type: Date, default: Date.now },
    expiresAt:  Date,
    source:     { type: String, default: 'system', index: true },
    automatic:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'alertas',
  }
);

// ─── Índices compuestos ───────────────────────────────────────────────────────
alertaSchema.index({ status: 1, priority: -1, createdAt: -1 });
alertaSchema.index({ type: 1, status: 1, createdAt: -1 });
alertaSchema.index({ idBranch: 1, status: 1, createdAt: -1 });
alertaSchema.index({ idMember: 1, createdAt: -1 });
alertaSchema.index({ assignedTo: 1, status: 1 });
alertaSchema.index({ dueDate: 1, status: 1 });

// ─── Middleware ───────────────────────────────────────────────────────────────
alertaSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─── Métodos de instancia ─────────────────────────────────────────────────────
alertaSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

alertaSchema.methods.assignTo = function (userId, userName) {
  this.assignedTo     = userId;
  this.assignedToName = userName;
  this.assignedAt     = new Date();
  this.status         = 'en_proceso';
};

// resolve() acepta tanto 'resuelta' (backend) como 'completada' (frontend)
alertaSchema.methods.resolve = function (userId, userName, notes) {
  this.status          = 'resuelta';
  this.resolvedAt      = new Date();
  this.resolvedBy      = userId;
  this.resolvedByName  = userName;
  this.resolutionNotes = notes;
};

alertaSchema.methods.descartar = function (motivo) {
  this.status    = 'descartada';
  this.notes     = motivo || this.notes;
  this.updatedAt = new Date();
};

module.exports = mongoose.model('Alerta', alertaSchema);
