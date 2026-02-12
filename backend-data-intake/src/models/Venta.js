const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  // Identificación única
  idSale: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Cliente relacionado
  idMember: { 
    type: String, 
    required: true,
    index: true 
  },
  memberName: String,
  
  // Sucursal
  idBranch: { 
    type: String,
    index: true 
  },
  branchName: String,
  
  // Tipo de venta
  saleType: { 
    type: String, 
    enum: ['plan', 'producto', 'servicio', 'renovacion', 'upgrade'],
    required: true,
    index: true 
  },
  
  // Detalles de la venta
  description: String,
  planName: String,
  productName: String,
  serviceName: String,
  
  // Montos
  amount: { 
    type: Number, 
    required: true,
    index: true 
  },
  discount: { 
    type: Number, 
    default: 0 
  },
  tax: { 
    type: Number, 
    default: 0 
  },
  totalAmount: { 
    type: Number, 
    required: true 
  },
  
  // Fechas
  saleDate: { 
    type: Date, 
    required: true,
    index: true 
  },
  dueDate: Date,
  paidDate: Date,
  
  // Estado de pago
  paymentStatus: { 
    type: String, 
    enum: ['pendiente', 'pagado', 'parcial', 'cancelado', 'reembolsado'],
    default: 'pendiente',
    index: true 
  },
  
  // Método de pago
  paymentMethod: { 
    type: String, 
    enum: ['efectivo', 'tarjeta', 'transferencia', 'pix', 'boleto', 'otro'],
    index: true 
  },
  
  // Información del empleado
  idEmployee: String,
  employeeName: String,
  
  // Detalles adicionales
  installments: { 
    type: Number, 
    default: 1 
  },
  currentInstallment: { 
    type: Number, 
    default: 1 
  },
  
  notes: String,
  invoiceNumber: String,
  
  // Items de la venta (para ventas con múltiples productos)
  items: [{
    itemType: String,
    itemName: String,
    quantity: Number,
    unitPrice: Number,
    subtotal: Number
  }],
  
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
    default: 'evo',
    index: true 
  },
  externalId: String
}, {
  timestamps: true,
  collection: 'ventas'
});

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
