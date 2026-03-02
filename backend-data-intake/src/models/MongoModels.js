/**
 * 🗄️ MONGODB MODELS MEJORADOS - Reemplazo de SQLite
 * 
 * Modelos para:
 * - Sincronización robusta de datos
 * - Webhooks idempotentes
 * - Rate limiting
 * - Health checks
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { logger } = require('../utils/logger');

// ============================================================================
// WEBHOOK MODEL (Crítico para idempotencia)
// ============================================================================

const webhookSchema = new Schema({
  webhook_id: { type: String, unique: true, required: true, sparse: true, index: true },
  source: { type: String, enum: ['EVO', 'W12', 'STRIPE', 'SHOPIFY'], required: true },
  evento: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  
  // Estado de procesamiento
  estado: {
    type: String,
    enum: ['pendiente', 'procesando', 'completado', 'fallido'],
    default: 'pendiente',
    index: true
  },
  intentos: { type: Number, default: 0 },
  max_intentos: { type: Number, default: 3 },
  ultimo_error: String,
  
  // Auditoría
  recibido_en: { type: Date, default: Date.now, index: true },
  procesado_en: Date,
  tenant_id: { type: String, required: true, index: true },
  
  // Para idempotencia
  hash_contenido: { type: String, unique: true, sparse: true }, // Hash del contenido
  procesado_anteriormente: { type: Boolean, default: false }
}, {
  collection: 'webhooks',
  timestamps: true,
  indexes: [
    { estado: 1, tenant_id: 1, recibido_en: -1 },
    { webhook_id: 1 },
    { hash_contenido: 1 }
  ]
});

// ============================================================================
// SYNC LOG MODEL (Tracear todas las sincronizaciones)
// ============================================================================

const syncLogSchema = new Schema({
  sync_id: { type: String, unique: true, required: true, index: true },
  tenant_id: { type: String, required: true, index: true },
  fuente: { type: String, enum: ['EVO', 'W12', 'ARCHIVO', 'BD', 'API'], required: true },
  tipo: { type: String, enum: ['full', 'incremental', 'webhook'], default: 'incremental' },
  endpoint: String,
  
  // Estado (canonical Spanish fields)
  estado: {
    type: String,
    enum: ['iniciado', 'procesando', 'completado', 'fallido', 'parcial'],
    default: 'iniciado',
    index: true
  },
  
  // Registro detallado (estadísticas)
  estadisticas: {
    total_records: { type: Number, default: 0 },
    insertados: { type: Number, default: 0 },
    actualizados: { type: Number, default: 0 },
    eliminados: { type: Number, default: 0 },
    errores: { type: Number, default: 0 },
    duplicados: { type: Number, default: 0 }
  },
  
  errores: [String],
  
  // Performance
  iniciado_en: { type: Date, default: Date.now },
  completado_en: Date,
  duracion_ms: Number,
  
  // Metadata
  filtros: Schema.Types.Mixed,
  datos_adicionales: Schema.Types.Mixed
}, {
  collection: 'sync_logs',
  timestamps: true,
  indexes: [
    { sync_id: 1 },
    { tenant_id: 1, estado: 1, iniciado_en: -1 },
    { fuente: 1, tenant_id: 1, estado: 1 }
  ]
});

// ---------------------------------------------------------------------------
// Backwards-compatibility virtuals & helper methods
// Keep older code (english-style) working while migrating to the canonical
// Spanish-shaped `sync_logs` documents. These virtuals and methods map
// `syncType/status/startedAt/...` and mark* helpers used across the codebase.
// ---------------------------------------------------------------------------

// Virtuals mapping English names -> Spanish fields
syncLogSchema.virtual('syncType')
  .get(function() { return this.tipo; })
  .set(function(v) { this.tipo = v; });

syncLogSchema.virtual('status')
  .get(function() { return this.estado; })
  .set(function(v) { this.estado = v; });

syncLogSchema.virtual('startedAt')
  .get(function() { return this.iniciado_en; })
  .set(function(v) { this.iniciado_en = v; });

syncLogSchema.virtual('completedAt')
  .get(function() { return this.completado_en; })
  .set(function(v) { this.completado_en = v; });

syncLogSchema.virtual('duration')
  .get(function() { return this.duracion_ms; })
  .set(function(v) { this.duracion_ms = v; });

// Stats compatibility
syncLogSchema.virtual('recordsProcessed')
  .get(function() { return this.estadisticas?.total_records || 0; })
  .set(function(v) { this.estadisticas = this.estadisticas || {}; this.estadisticas.total_records = v; });

syncLogSchema.virtual('recordsCreated')
  .get(function() { return this.estadisticas?.insertados || 0; })
  .set(function(v) { this.estadisticas = this.estadisticas || {}; this.estadisticas.insertados = v; });

syncLogSchema.virtual('recordsUpdated')
  .get(function() { return this.estadisticas?.actualizados || 0; })
  .set(function(v) { this.estadisticas = this.estadisticas || {}; this.estadisticas.actualizados = v; });

syncLogSchema.virtual('recordsError')
  .get(function() { return this.estadisticas?.errores || 0; })
  .set(function(v) { this.estadisticas = this.estadisticas || {}; this.estadisticas.errores = v; });

// Instance helper methods (mirror legacy SyncLog model behavior)
syncLogSchema.methods.toJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

syncLogSchema.methods.markCompleted = function(results) {
  this.estado = 'completado';
  this.completado_en = new Date();
  this.duracion_ms = this.completado_en - (this.iniciado_en || Date.now());

  if (results) {
    this.estadisticas = this.estadisticas || {};
    this.estadisticas.total_records = results.processed || this.estadisticas.total_records || 0;
    this.estadisticas.insertados = results.created || this.estadisticas.insertados || 0;
    this.estadisticas.actualizados = results.updated || this.estadisticas.actualizados || 0;
    this.estadisticas.errores = results.failed || this.estadisticas.errores || 0;
  }
};

syncLogSchema.methods.markError = function(error) {
  this.estado = 'fallido';
  this.completado_en = new Date();
  this.duracion_ms = this.completado_en - (this.iniciado_en || Date.now());
  this.errores = this.errores || [];
  this.errores.push(error?.message || String(error));
};

syncLogSchema.methods.addError = function(error, record) {
  this.estadisticas = this.estadisticas || {};
  this.estadisticas.errores = (this.estadisticas.errores || 0) + 1;
  this.errores = this.errores || [];
  this.errores.push(error?.message || String(error));
};

syncLogSchema.methods.addWarning = function(message, record) {
  this.datos_adicionales = this.datos_adicionales || {};
  this.datos_adicionales.warnings = this.datos_adicionales.warnings || [];
  this.datos_adicionales.warnings.push({ timestamp: new Date(), message, record });
};

// ============================================================================
// HEALTH CHECK MODEL
// ============================================================================

const healthCheckSchema = new Schema({
  servicio: {
    type: String,
    enum: ['EVO', 'W12', 'DJANGO', 'MONGODB'],
    required: true,
    index: true
  },
  estado: {
    type: String,
    enum: ['healthy', 'degraded', 'unhealthy', 'skipped'],
    required: true
  },
  latencia_ms: Number,
  mensaje: String,
  detalles: Schema.Types.Mixed,
  
  // Auditoría
  verificado_en: { type: Date, default: Date.now, index: true }
}, {
  collection: 'health_checks',
  capped: true,
  size: 52428800, // 50MB (mantiene solo últimos registros)
  indexes: [
    { servicio: 1, verificado_en: -1 }
  ]
});

// ============================================================================
// API CALL LOG MODEL (Para debugging y auditoría)
// ============================================================================

const apiCallLogSchema = new Schema({
  api_name: { type: String, required: true, index: true },
  metodo: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'] },
  endpoint: String,
  
  // Response info
  status_code: Number,
  success: Boolean,
  duracion_ms: Number,
  
  // Error tracking
  error: String,
  reintentos: { type: Number, default: 0 },
  
  // Rate limit info
  rate_limit_remaining: Number,
  rate_limit_reset: Date,
  
  // Auditoría
  creado_en: { type: Date, default: Date.now, index: true },
  tenant_id: String
}, {
  collection: 'api_call_logs',
  capped: true,
  size: 104857600, // 100MB
  indexes: [
    { api_name: 1, creado_en: -1 }
  ]
});

// ============================================================================
// WORKER STATE MODEL (Para monitoreo de workers)
// ============================================================================

const workerStateSchema = new Schema({
  worker_id: { type: String, unique: true, required: true, index: true },
  tipo: { type: String, enum: ['api', 'webhook', 'sync'] },
  estado: {
    type: String,
    enum: ['inactivo', 'activo', 'pausado', 'error'],
    default: 'inactivo'
  },
  
  // Stats
  jobs_completados: { type: Number, default: 0 },
  jobs_fallidos: { type: Number, default: 0 },
  jobs_en_cola: { type: Number, default: 0 },
  
  // Health
  ultimo_heartbeat: Date,
  ultimo_error: String,
  
  // Auditoría
  creado_en: { type: Date, default: Date.now },
  actualizado_en: { type: Date, default: Date.now }
}, {
  collection: 'worker_states',
  indexes: [
    { worker_id: 1 },
    { tipo: 1, estado: 1 }
  ]
});

// ============================================================================
// CREAR MODELOS
// ============================================================================

const Webhook = mongoose.models.Webhook || mongoose.model('Webhook', webhookSchema);
const SyncLog = mongoose.models.SyncLog || mongoose.model('SyncLog', syncLogSchema);
const HealthCheck = mongoose.models.HealthCheck || mongoose.model('HealthCheck', healthCheckSchema);
const ApiCallLog = mongoose.models.ApiCallLog || mongoose.model('ApiCallLog', apiCallLogSchema);
const WorkerState = mongoose.models.WorkerState || mongoose.model('WorkerState', workerStateSchema);

// ============================================================================
// ÍNDICES OPTIMIZADOS
// ============================================================================

async function createOptimizedIndexes() {
  try {
    // Índices TTL para limpiar datos antiguos automáticamente
    await ApiCallLog.collection.createIndex(
      { creado_en: 1 },
      { expireAfterSeconds: 604800 } // 7 días
    );

    await HealthCheck.collection.createIndex(
      { verificado_en: 1 },
      { expireAfterSeconds: 86400 } // 1 día
    );

    logger.info('✅ Índices MongoDB creados/actualizados');
  } catch (error) {
    logger.error('❌ Error creando índices:', { message: error.message });
  }
}

// ============================================================================
// QUERIES COMUNES (para fácil acceso)
// ============================================================================

const queries = {
  // Webhooks pendientes
  async getPendingWebhooks(tenantId, limit = 10) {
    return Webhook.find({
      tenant_id: tenantId,
      estado: 'pendiente',
      intentos: { $lt: 3 } // No rebasó máximo de intentos
    })
      .sort({ recibido_en: 1 })
      .limit(limit);
  },

  // Webhooks procesados duplicados
  async checkWebhookIdempotency(webhookId) {
    return Webhook.findOne({ webhook_id: webhookId, estado: 'completado' });
  },

  // Marcar webhook como procesado
  async markWebhookProcessed(webhookId) {
    return Webhook.updateOne(
      { webhook_id: webhookId },
      { estado: 'completado', procesado_en: new Date(), procesado_anteriormente: true }
    );
  },

  // Obtener synclog reciente
  async getRecentSyncLogs(tenantId, limit = 10) {
    return SyncLog.find({ tenant_id: tenantId })
      .sort({ iniciado_en: -1 })
      .limit(limit);
  },

  // Health checks por servicio
  async getHealthStatus(servicio) {
    return HealthCheck.findOne({ servicio }).sort({ verificado_en: -1 });
  },

  // Stats de workers
  async getWorkerStats() {
    return WorkerState.find({ estado: 'activo' });
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Modelos
  Webhook,
  SyncLog,
  HealthCheck,
  ApiCallLog,
  WorkerState,

  // Utilidades
  createOptimizedIndexes,
  queries,

  // Schemas
  schemas: {
    webhookSchema,
    syncLogSchema,
    healthCheckSchema,
    apiCallLogSchema,
    workerStateSchema
  }
};
