const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EvoSessionSchema = new Schema({
  session_id: { type: String, required: true, unique: true },
  instance_name: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['connecting', 'connected', 'disconnected', 'error'], 
    default: 'connecting' 
  },
  qr_code: { type: String },
  phone_number: { type: String },
  webhook_url: { type: String },
  last_activity: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed },
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  sede: { type: String },
  activo: { type: Boolean, default: true }
}, { 
  timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' } 
});

EvoSessionSchema.index({ session_id: 1 });
EvoSessionSchema.index({ instance_name: 1 });
EvoSessionSchema.index({ status: 1, activo: 1 });

EvoSessionSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  this.last_activity = new Date();
  return this.save();
};

EvoSessionSchema.methods.disconnect = async function() {
  this.status = 'disconnected';
  this.activo = false;
  this.last_activity = new Date();
  return this.save();
};

EvoSessionSchema.statics.findActive = function() {
  return this.find({ activo: true, status: 'connected' });
};

EvoSessionSchema.statics.findByInstance = function(instanceName) {
  return this.findOne({ instance_name: instanceName, activo: true });
};

module.exports = mongoose.model('EvoSession', EvoSessionSchema);
