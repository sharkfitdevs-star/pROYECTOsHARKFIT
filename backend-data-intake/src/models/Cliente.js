const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  // Datos de EVO
  uniqueId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  idMember: { 
    type: String, 
    required: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true,
    index: true 
  },
  email: { 
    type: String, 
    sparse: true,
    index: true 
  },
  cellPhone: String,
  birthDate: Date,
  cpf: String,
  sex: String,
  
  // Estado y actividad
  active: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['activo', 'inactivo', 'suspendido', 'prospecto'],
    default: 'activo',
    index: true 
  },
  
  // Sucursal
  idBranch: { 
    type: String,
    index: true 
  },
  branchName: String,
  
  // Plan y membresía
  membershipStatus: String,
  membershipStartDate: Date,
  membershipEndDate: Date,
  planName: String,
  planValue: Number,
  
  // Información adicional
  address: {
    street: String,
    number: String,
    complement: String,
    neighborhood: String,
    city: String,
    state: String,
    zipCode: String
  },
  
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // Metadata
  registrationDate: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  lastUpdate: { 
    type: Date, 
    default: Date.now 
  },
  lastSyncAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Campos personalizados
  customFields: mongoose.Schema.Types.Mixed,
  
  // Origen de datos
  source: {
    type:    String,
    enum:    ['excel', 'api', 'manual', 'merged', 'evo', 'import'],
    default: 'evo',
    index:   true,
  },
  dataSource: {
    type: {
      type:    String,
      enum:    ['excel', 'api', 'manual', 'merged'],
    },
    connectionName: String,
    sourceId:       String,
    importJobId:    String,
    importedAt:     Date,
  },
  importId: {
    type: String,
    index: true,
    default: null
  },
  externalId: String
}, {
  timestamps: true,
  collection: 'clientes'
});

// Índices compuestos para queries comunes
clienteSchema.index({ idBranch: 1, active: 1 });
clienteSchema.index({ status: 1, lastUpdate: -1 });
clienteSchema.index({ name: 'text', email: 'text' });

// Middleware pre-save
clienteSchema.pre('save', function(next) {
  next();
});

// Métodos de instancia
clienteSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Cliente', clienteSchema);
