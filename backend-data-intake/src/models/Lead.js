const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  leadId: { type: String, index: true },
  eventoId: String,
  clienteId: String,
  nombre: String,
  email: { type: String, sparse: true, index: true },
  telefono: String,
  empresa: String,
  estatus: { type: String, default: 'Nuevo' },
  probabilidad: { type: Number, default: 0 },
  leadScore: { type: Number, default: 0 },
  fuente: { type: String, default: 'import' },
  data: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  syncedAt: { type: Date, default: Date.now }
}, {
  collection: 'leads',
  timestamps: true
});

// `leadId` ya declara `index: true` en el campo; eliminar índice duplicado
leadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

leadSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Lead', leadSchema);
