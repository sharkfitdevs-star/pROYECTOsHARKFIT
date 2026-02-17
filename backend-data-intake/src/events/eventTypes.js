/**
 * 📋 EVENT TYPES REGISTRY
 * Definición centralizada de todos los tipos de eventos en el sistema
 * Proporciona type-safety y documentación
 */

module.exports = {
  // ===================
  // EVENTOS DE USUARIO
  // ===================
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
    EMAIL_VERIFIED: 'user.email_verified',
    PASSWORD_RESET: 'user.password_reset',
    PROFILE_UPDATED: 'user.profile_updated'
  },

  // ====================
  // EVENTOS DE AUTENTICACIÓN
  // ====================
  AUTH: {
    LOGIN_SUCCESS: 'login.success',
    LOGIN_FAILED: 'login.failed',
    LOGOUT: 'logout',
    SESSION_EXPIRED: 'session.expired',
    PASSWORD_CHANGED: 'password.changed',
    MFA_ENABLED: 'mfa.enabled',
    MFA_DISABLED: 'mfa.disabled'
  },

  // =================
  // EVENTOS DE ÓRDENES
  // =================
  ORDER: {
    CREATED: 'order.created',
    UPDATED: 'order.updated',
    CONFIRMED: 'order.confirmed',
    PAID: 'order.paid',
    SHIPPED: 'order.shipped',
    DELIVERED: 'order.delivered',
    CANCELLED: 'order.cancelled',
    REFUNDED: 'order.refunded'
  },

  // ===================
  // EVENTOS DE PAGOS
  // ===================
  PAYMENT: {
    INITIATED: 'payment.initiated',
    PROCESSING: 'payment.processing',
    SUCCESSFUL: 'payment.successful',
    FAILED: 'payment.failed',
    REFUND_INITIATED: 'refund.initiated',
    REFUND_COMPLETED: 'refund.completed'
  },

  // =======================
  // EVENTOS DE SINCRONIZACIÓN
  // =======================
  SYNC: {
    STARTED: 'sync.started',
    COMPLETED: 'sync.completed',
    FAILED: 'sync.failed',
    PARTIAL: 'sync.partial',
    RETRYING: 'sync.retrying'
  },

  // ====================
  // EVENTOS DE ARCHIVOS
  // ====================
  FILE: {
    UPLOADED: 'file.uploaded',
    PROCESSED: 'file.processed',
    DELETED: 'file.deleted',
    DOWNLOAD_STARTED: 'file.download_started',
    RECEIVED: 'file.received'
  },

  // ======================
  // EVENTOS DE NOTIFICACIONES
  // ======================
  NOTIFICATION: {
    SENT: 'notification.sent',
    DELIVERED: 'notification.delivered',
    FAILED: 'notification.failed',
    CLICKED: 'notification.clicked'
  },

  // ==================
  // EVENTOS DE PERMISOS
  // ==================
  PERMISSION: {
    CHANGED: 'permission.changed',
    GRANTED: 'permission.granted',
    REVOKED: 'permission.revoked',
    ROLE_ASSIGNED: 'role.assigned',
    ROLE_REMOVED: 'role.removed'
  },

  // ======================
  // EVENTOS DEL SISTEMA
  // ======================
  SYSTEM: {
    HEALTH_CHECK: 'system.health_check',
    ERROR: 'system.error',
    WARNING: 'system.warning',
    MAINTENANCE_START: 'maintenance.started',
    MAINTENANCE_END: 'maintenance.ended'
  },

  // ===================
  // EVENTOS DE REPORTES
  // ===================
  REPORT: {
    GENERATED: 'report.generated',
    EXPORTED: 'report.exported',
    SCHEDULED: 'report.scheduled',
    FAILED: 'report.failed'
  },

  // ========================
  // EVENTOS DE INTEGRACIÓN
  // ========================
  INTEGRATION: {
    CONNECTED: 'integration.connected',
    DISCONNECTED: 'integration.disconnected',
    SYNC_STARTED: 'integration.sync_started',
    SYNC_COMPLETED: 'integration.sync_completed',
    ERROR: 'integration.error'
  }
};

/**
 * PAYLOAD SCHEMAS (para referencia)
 * Estructura esperada de cada evento
 */

const PAYLOAD_SCHEMAS = {
  'user.created': {
    userId: String,
    email: String,
    firstName: String,
    lastName: String,
    plan: String, // 'free' | 'pro' | 'enterprise'
    signupSource: String // 'web' | 'mobile' | 'api'
  },

  'user.deleted': {
    userId: String,
    email: String,
    reason: String, // 'user_request' | 'admin' | 'violation'
    timestamp: Date
  },

  'login.success': {
    userId: String,
    email: String,
    ipAddress: String,
    userAgent: String,
    method: String // 'email' | 'oauth' | 'mfa'
  },

  'login.failed': {
    email: String,
    reason: String, // 'invalid_password' | 'user_not_found' | 'mfa_failed'
    ipAddress: String,
    attempt: Number
  },

  'order.created': {
    orderId: String,
    userId: String,
    items: Array, // [{productId, quantity, price}]
    totalAmount: Number,
    currency: String,
    status: String
  },

  'order.paid': {
    orderId: String,
    userId: String,
    totalAmount: Number,
    currency: String,
    paymentMethod: String,
    transactionId: String
  },

  'order.delivered': {
    orderId: String,
    userId: String,
    deliveryTime: Number, // ms desde que se creó
    address: String,
    signature: Boolean
  },

  'sync.completed': {
    recordsProcessed: Number,
    duration: Number, // ms
    source: String, // 'api_a' | 'api_b'
    errors: Array
  },

  'sync.failed': {
    error: String,
    retryCount: Number,
    source: String,
    stackTrace: String
  },

  'file.received': {
    fileId: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    userId: String,
    uploadedAt: Date
  },

  'permission.changed': {
    userId: String, // Quién hizo el cambio
    targetUserId: String, // Quién cambió
    permission: String,
    granted: Boolean,
    timestamp: Date
  },

  'sync.started': {
    source: String,
    timestamp: Date,
    priority: String // 'low' | 'normal' | 'high'
  }
};

module.exports.PAYLOAD_SCHEMAS = PAYLOAD_SCHEMAS;
