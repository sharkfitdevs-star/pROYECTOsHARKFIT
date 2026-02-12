const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
  // Identificación
  username: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  password: {
    type: String,
    required: true
  },
  
  // Información personal
  firstName: { 
    type: String, 
    required: true 
  },
  lastName: { 
    type: String, 
    required: true 
  },
  fullName: String,
  
  // Rol y permisos
  role: {
    type: String,
    enum: [
      'owner',
      'admin',
      'manager',
      'staff',
      'viewer',
      'instructor',
      'recepcionista',
      'vendedor'
    ],
    required: true,
    index: true
  },
  permissions: [String],
  
  // Sucursal asociada
  idBranch: { 
    type: String,
    index: true 
  },
  branchName: String,
  
  // Estado
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending_verification', 'active', 'disabled', 'locked'],
    default: 'active',
    index: true
  },
  
  // Información de contacto
  phone: String,
  cellPhone: String,
  
  // Perfil
  avatar: String,
  bio: String,
  department: String,
  position: String,
  
  // Fechas importantes
  hireDate: Date,
  lastLogin: Date,
  emailVerifiedAt: Date,
  
  // Seguridad
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,
  
  // Preferencias
  preferences: {
    language: { type: String, default: 'es' },
    timezone: { type: String, default: 'America/Mexico_City' },
    notifications: { type: Boolean, default: true },
    theme: { type: String, default: 'light' }
  },
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
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
  collection: 'usuarios'
});

// Índices
usuarioSchema.index({ role: 1, active: 1 });
usuarioSchema.index({ idBranch: 1, active: 1 });

// Middleware pre-save para normalizar datos y hashear contraseña
usuarioSchema.pre('save', async function(next) {
  // Normalizar email y username
  if (this.isModified('email') && this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  if (this.isModified('username') && this.username) {
    this.username = this.username.toLowerCase().trim();
  }

  // Solo hashear si la contraseña fue modificada
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const cost = parseInt(process.env.BCRYPT_COST || '12', 10);
    const salt = await bcrypt.genSalt(cost);
    this.password = await bcrypt.hash(this.password, salt);
    this.fullName = `${this.firstName} ${this.lastName}`;
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
usuarioSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Verificar si cuenta esta bloqueada
usuarioSchema.methods.isLocked = function() {
  if (this.status === 'locked' && this.accountLockedUntil) {
    return this.accountLockedUntil > Date.now();
  }
  return false;
};

// Incrementar intentos fallidos
usuarioSchema.methods.registerFailedLogin = function(maxAttempts, lockMinutes) {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;

  if (this.failedLoginAttempts >= maxAttempts) {
    this.status = 'locked';
    const lockMs = lockMinutes * 60 * 1000;
    this.accountLockedUntil = new Date(Date.now() + lockMs);
  }
};

// Resetear intentos fallidos
usuarioSchema.methods.resetFailedLogin = function() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = null;
  if (this.status === 'locked') {
    this.status = 'active';
  }
};

// Método para generar token de reset
usuarioSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutos
  
  return resetToken;
};

// Método toJSON para excluir campos sensibles
usuarioSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Usuario', usuarioSchema);
