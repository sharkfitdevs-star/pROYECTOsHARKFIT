const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  fullName: { type: String },
  role: { type: String, default: 'user' },
  active: { type: Boolean, default: true },
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const cost = parseInt(process.env.BCRYPT_COST || '12', 10);
  this.password = await bcrypt.hash(this.password, cost);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function () {
  if (!this.accountLockedUntil) return false;
  return this.accountLockedUntil > new Date();
};

userSchema.methods.registerFailedLogin = function () {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  const MAX_ATTEMPTS = parseInt(process.env.MAX_FAILED_LOGINS || '5', 10);
  const LOCK_MINUTES = parseInt(process.env.LOCK_MINUTES || '15', 10);
  if (this.failedLoginAttempts >= MAX_ATTEMPTS) {
    this.accountLockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
  }
  return this.save();
};

userSchema.methods.resetFailedLogin = function () {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = null;
  return this.save();
};

module.exports = mongoose.model('User', userSchema, 'usuarios');
