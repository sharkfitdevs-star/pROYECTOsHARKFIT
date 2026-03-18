const mongoose = require('mongoose');
 
const evoSessionSchema = new mongoose.Schema({
  sessionToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  dns: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  django_token: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
});
 
// TTL: MongoDB elimina sesiones expiradas automaticamente
evoSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
 
// Seguridad: no exponer credenciales en respuestas JSON
evoSessionSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.token;
  delete obj.django_token;
  delete obj.__v;
  return obj;
};
 
module.exports = mongoose.model('EvoSession', evoSessionSchema, 'evo_sessions');
