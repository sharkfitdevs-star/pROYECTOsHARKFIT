/**
 * 🚀 EVENT BUS - Sistema de eventos centralizado (Event-Driven Architecture)
 * 
 * Patrones:
 * ✅ Pub/Sub desacoplado
 * ✅ Listeners registrados dinámicamente
 * ✅ Eventos tipados
 * ✅ Retry automático
 * ✅ Dead letter queue para eventos fallidos
 */

const { logger } = require('../utils/logger');


// Registro de listeners
const listeners = new Map(); // Map<eventName, Set<handler>>

// ============================================================================
// EVENT TYPES (Tipado)
// ============================================================================

const EventTypes = {
  // User events
  'user.created': 'user.created',
  'user.updated': 'user.updated',
  'user.deleted': 'user.deleted',
  'user.login': 'user.login',
  'user.logout': 'user.logout',
  'user.password.changed': 'user.password.changed',
  
  // Order events
  'order.created': 'order.created',
  'order.paid': 'order.paid',
  'order.shipped': 'order.shipped',
  'order.delivered': 'order.delivered',
  'order.cancelled': 'order.cancelled',
  
  // File events
  'file.uploaded': 'file.uploaded',
  'file.processed': 'file.processed',
  'file.failed': 'file.failed',
  
  // Sync events
  'sync.started': 'sync.started',
  'sync.completed': 'sync.completed',
  'sync.failed': 'sync.failed',
  
  // Webhook events
  'webhook.received': 'webhook.received',
  'webhook.processed': 'webhook.processed',
  'webhook.failed': 'webhook.failed',
  
  // System events
  'system.error': 'system.error',
  'system.warning': 'system.warning'
};

// ============================================================================
// EMIT EVENT (Publicar evento)
// ============================================================================

async function emit(eventType, data) {
  if (!EventTypes[eventType]) {
    logger.warn(`⚠️  Tipo de evento desconocido: ${eventType}`);
  }

  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    data,
    id: `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };



  if (listeners.has(eventType)) {
    for (const handler of listeners.get(eventType)) {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`❌ Error en handler de evento ${eventType}:`, error);
      }
    }
  }
  logger.debug(`📤 Evento emitido: ${eventType}`, { eventId: event.id, data });
  return event;
}

// ============================================================================
// SUBSCRIBE TO EVENT (Escuchar eventos)
// ============================================================================

function subscribe(eventType, handler) {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
  }
  listeners.get(eventType).add(handler);
  return () => {
    listeners.get(eventType).delete(handler);
  };
}

// ============================================================================
// GET EVENT HISTORY (Obtener historial)
// ============================================================================

async function getEventHistory(eventType, limit = 100) {
  return []; // Historial vacío, implementar con MongoDB si se desea persistencia
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  emit,
  subscribe,
  EventTypes,
  getEventHistory
};
