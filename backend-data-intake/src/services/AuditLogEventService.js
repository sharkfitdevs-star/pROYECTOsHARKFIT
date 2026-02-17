/**
 * 📊 AUDIT LOG SERVICE - Persiste eventos en MongoDB para auditoría
 * Crea un registro inmutable de todas las acciones
 */

const { subscribe } = require('../events/EventBus');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');

// Aquí iría el modelo de MongoDB si está disponible
let AuditLog = null;

try {
  // Schema para auditoría
  const auditLogSchema = new mongoose.Schema({
    eventType: {
      type: String,
      required: true,
      index: true,
      enum: [
        'user.created',
        'user.deleted',
        'user.updated',
        'login.success',
        'login.failed',
        'order.created',
        'order.paid',
        'order.delivered',
        'sync.started',
        'sync.completed',
        'sync.failed',
        'file.received',
        'permission.changed'
      ]
    },
    userId: {
      type: String,
      index: true
    },
    action: String,
    resource: String, // Qué se modificó (user, order, etc)
    changes: mongoose.Schema.Types.Mixed, // Qué cambió
    ipAddress: String,
    userAgent: String,
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success'
    },
    error: String,
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 7776000 // Auto-delete después de 90 días
    }
  });

  AuditLog = mongoose.model('AuditLog', auditLogSchema);
} catch (error) {
  logger.warn('⚠️ AuditLog model no disponible, usando modo fallback');
}

// Registrar cuando se crea un usuario
subscribe('user.created', async (event) => {
  const { userId, email, firstName, lastName } = event.data;

  logger.info(`📋 Registrando auditoría: usuario creado ${userId}`);

  try {
    if (AuditLog) {
      await AuditLog.create({
        eventType: 'user.created',
        userId,
        action: 'CREATE',
        resource: 'usuario',
        changes: {
          created: {
            userId,
            email,
            firstName,
            lastName
          }
        },
        status: 'success'
      });
    } else {
      // Fallback: guardar en archivo
      logger.info(`[AUDIT] user.created: ${userId} - ${email}`);
    }
  } catch (error) {
    logger.error(`❌ Error registrando auditoría:`, error);
  }
});

// Registrar intentos de login
subscribe('login.failed', async (event) => {
  const { email, reason, ipAddress } = event.data;

  logger.warn(`🔐 Registrando login fallido: ${email}`);

  try {
    if (AuditLog) {
      await AuditLog.create({
        eventType: 'login.failed',
        action: 'LOGIN_ATTEMPT',
        resource: 'autenticacion',
        changes: { username: email },
        ipAddress,
        status: 'failure',
        error: reason
      });
    } else {
      logger.warn(`[AUDIT] login.failed: ${email} - ${reason}`);
    }
  } catch (error) {
    logger.error(`❌ Error registrando fallo de login:`, error);
  }
});

subscribe('login.success', async (event) => {
  const { userId, email, ipAddress } = event.data;

  logger.info(`✅ Registrando login exitoso: ${email}`);

  try {
    if (AuditLog) {
      await AuditLog.create({
        eventType: 'login.success',
        userId,
        action: 'LOGIN',
        resource: 'autenticacion',
        ipAddress,
        status: 'success'
      });
    } else {
      logger.info(`[AUDIT] login.success: ${userId}`);
    }
  } catch (error) {
    logger.error(`❌ Error registrando login exitoso:`, error);
  }
});

// Registrar cambios de permisos
subscribe('permission.changed', async (event) => {
  const { userId, targetUserId, permission, granted } = event.data;

  logger.info(`🔐 Registrando cambio de permisos`);

  try {
    if (AuditLog) {
      await AuditLog.create({
        eventType: 'permission.changed',
        userId, // Quién hizo el cambio
        action: 'UPDATE',
        resource: 'permisos',
        changes: {
          targetUser: targetUserId,
          permission,
          granted
        },
        status: 'success'
      });
    }
  } catch (error) {
    logger.error(`❌ Error registrando cambio de permisos:`, error);
  }
});

// Registrar sincronizaciones
subscribe('sync.completed', async (event) => {
  const { recordsProcessed, duration } = event.data;

  logger.info(`📊 Registrando sincronización completada`);

  try {
    if (AuditLog) {
      await AuditLog.create({
        eventType: 'sync.completed',
        action: 'SYNC',
        resource: 'sincronizacion',
        changes: { recordsProcessed, durationMs: duration },
        status: 'success'
      });
    }
  } catch (error) {
    logger.error(`❌ Error registrando sincronización:`, error);
  }
});

subscribe('sync.failed', async (event) => {
  const { error, retryCount } = event.data;

  logger.warn(`⚠️ Registrando fallo de sincronización`);

  try {
    if (AuditLog) {
      await AuditLog.create({
        eventType: 'sync.failed',
        action: 'SYNC',
        resource: 'sincronizacion',
        status: 'failure',
        error: error,
        metadata: { retryCount }
      });
    }
  } catch (error) {
    logger.error(`❌ Error registrando fallo de sync:`, error);
  }
});

module.exports = {
  name: 'AuditLogService',
  AuditLog // Export para queries
};
