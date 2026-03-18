/**
 * ExtractorConfig.js
 * Configuraciones de conexión a APIs externas guardadas por el usuario.
 * Las credenciales (token/secret) se guardan cifradas — nunca en texto plano.
 * El frontend nunca recibe token ni secret, solo hasCredentials: true.
 */
const mongoose = require('mongoose');

const extractorConfigSchema = new mongoose.Schema({
  connectionName: { type: String, required: true, unique: true },
  provider:       { type: String, enum: ['evo', 'w12', 'custom'], required: true },
  baseUrl:        { type: String, required: true },
  authType:       { type: String, enum: ['bearer', 'apikey', 'basic', 'basic_evo'], required: true },

  // Credenciales cifradas — nunca exponer en respuestas GET
  encryptedToken:  String,
  encryptedKey:    String,
  encryptedSecret: String,

  // Campos específicos para EVO Basic Auth
  // DNS: el subdominio del gimnasio (ej: migimnasio, sin .w12app.com.br) — NO se cifra, es metadata
  dns: String,
  
  // API Key cifrada específicamente para EVO (separada porque Basic Auth = dns:apiKey)
  apiKeyEncrypted: String,

  // ID de filial opcional — si está configurado, se pasa como id-filial en cada request a EVO
  filialId: String,

  // Tipo de plan EVO — determina límites de rate limit
  planType: { type: String, enum: ['plus', 'pro'], default: 'plus' },

  // Configuración de sync
  defaultDataset:   { type: String, enum: ['ventas', 'clientes', 'ambos', 'prospectos', 'entradas', 'membresias', 'pagos', 'todo'], default: 'ambos' },
  autoSyncEnabled:  { type: Boolean, default: false },
  autoSyncSchedule: { type: String, default: '0 7 * * *' }, // cron expression
  lastSyncAt:       Date,
  isActive:         { type: Boolean, default: true, index: true },
}, {
  timestamps: true,
  collection: 'extractorconfigs',
});

// Virtual: el frontend ve esto, nunca los campos encrypted*
extractorConfigSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.encryptedToken;
  delete obj.encryptedKey;
  delete obj.encryptedSecret;
  obj.hasCredentials = !!(this.encryptedToken || this.encryptedKey);
  return obj;
};

module.exports = mongoose.model('ExtractorConfig', extractorConfigSchema);
