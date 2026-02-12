const mongoose = require('mongoose');

const agendamientoSchema = new mongoose.Schema({
  // Identificación
  idAppointment: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Cliente
  idMember: { 
    type: String, 
    required: true,
    index: true 
  },
  memberName: String,
  memberEmail: String,
  memberPhone: String,
  
  // Sucursal
  idBranch: { 
    type: String,
    required: true,
    index: true 
  },
  branchName: String,
  
  // Tipo de agendamiento
  appointmentType: { 
    type: String, 
    enum: ['clase', 'entrenamiento_personal', 'evaluacion', 'consulta', 'evento', 'otro'],
    required: true,
    index: true 
  },
  
  // Detalles
  title: { 
    type: String, 
    required: true 
  },
  description: String,
  
  // Clase o servicio
  className: String,
  classId: String,
  instructorId: String,
  instructorName: String,
  
  // Fechas y horarios
  startDate: { 
    type: Date, 
    required: true,
    index: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  duration: Number, // en minutos
  
  // Estado
  status: { 
    type: String, 
    enum: ['programado', 'confirmado', 'en_curso', 'completado', 'cancelado', 'no_asistio'],
    default: 'programado',
    index: true 
  },
  
  // Capacidad (para clases grupales)
  maxCapacity: Number,
  currentAttendees: { 
    type: Number, 
    default: 0 
  },
  
  // Lista de espera
  waitingList: [{
    idMember: String,
    memberName: String,
    addedAt: Date
  }],
  
  // Ubicación dentro de la sucursal
  location: {
    room: String,
    equipment: [String]
  },
  
  // Notas
  notes: String,
  internalNotes: String,
  
  // Confirmación y recordatorios
  confirmed: { 
    type: Boolean, 
    default: false 
  },
  confirmedAt: Date,
  reminderSent: { 
    type: Boolean, 
    default: false 
  },
  reminderSentAt: Date,
  
  // Cancelación
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: String,
  
  // Asistencia
  checkedIn: { 
    type: Boolean, 
    default: false 
  },
  checkedInAt: Date,
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastSyncAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Origen de datos
  source: { 
    type: String, 
    default: 'local',
    index: true 
  },
  externalId: String
}, {
  timestamps: true,
  collection: 'agendamientos'
});

// Índices compuestos
agendamientoSchema.index({ idBranch: 1, startDate: 1 });
agendamientoSchema.index({ idMember: 1, startDate: -1 });
agendamientoSchema.index({ status: 1, startDate: 1 });
agendamientoSchema.index({ appointmentType: 1, startDate: 1 });
agendamientoSchema.index({ instructorId: 1, startDate: 1 });

// Middleware pre-save
agendamientoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calcular duración si no existe
  if (!this.duration && this.endDate && this.startDate) {
    this.duration = Math.floor((this.endDate - this.startDate) / 60000);
  }
  
  next();
});

// Métodos de instancia
agendamientoSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Método para verificar disponibilidad
agendamientoSchema.methods.hasAvailableSpots = function() {
  if (!this.maxCapacity) return true;
  return this.currentAttendees < this.maxCapacity;
};

// Método para añadir a lista de espera
agendamientoSchema.methods.addToWaitingList = function(idMember, memberName) {
  this.waitingList.push({
    idMember,
    memberName,
    addedAt: new Date()
  });
};

module.exports = mongoose.model('Agendamiento', agendamientoSchema);
