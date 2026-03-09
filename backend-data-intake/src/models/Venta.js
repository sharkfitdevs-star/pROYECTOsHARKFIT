const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  idSale: { type: String, required: true, unique: true, index: true },
  idMember: { type: String, index: true },
  memberName: String,
  idBranch: { type: String, index: true },
  branchName: String,
  saleType: { type: String, index: true },
  description: String,
  planName: String,
  productName: String,
  serviceName: String,
  cellPhone: String,
  whatsapp: String,          // se mantiene por compatibilidad con algunos imports
  amount: { type: Number, default: 0, index: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  saleDate: { type: Date, default: Date.now, index: true },
  fechaCompra: Date,         // campo adicional para reportes de Excel
  dueDate: Date,
  paidDate: Date,
  paymentStatus: { type: String, default: 'Pendiente', index: true },
  paymentMethod: String,
  idEmployee: String,
  employeeName: String,
  installments: { type: Number, default: 1 },
  currentInstallment: { type: Number, default: 1 },
  notes: String,
  invoiceNumber: String,
  items: [{ itemType: String, itemName: String, quantity: Number, unitPrice: Number, subtotal: Number }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastSyncAt: { type: Date, default: Date.now },
  source: { type: String, default: 'import', index: true },
  externalId: String
}, { timestamps: true, collection: 'ventas' });
// Índices compuestos
ventaSchema.index({ idBranch: 1, saleDate: -1 });
ventaSchema.index({ idMember: 1, saleDate: -1 });
ventaSchema.index({ paymentStatus: 1, dueDate: 1 });
ventaSchema.index({ saleType: 1, saleDate: -1 });

// Middleware pre-save para calcular total si no existe
ventaSchema.pre('save', function(next) {
  if (!this.totalAmount) {
    this.totalAmount = this.amount - this.discount + this.tax;
  }
  // sincronizar whatsapp/cellPhone para evitar datos duplicados
  if (this.whatsapp && !this.cellPhone) {
    this.cellPhone = this.whatsapp;
  } else if (this.cellPhone && !this.whatsapp) {
    this.whatsapp = this.cellPhone;
  }
  this.updatedAt = new Date();
  next();
});

// Métodos de instancia
ventaSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Venta', ventaSchema);
