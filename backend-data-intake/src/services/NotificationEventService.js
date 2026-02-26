/**
 * 🔔 NOTIFICATION SERVICE - Escucha eventos y envía notificaciones
 * Push, SMS, In-app notifications
 */

const { subscribe } = require('../events/EventBus');
const { logger } = require('../utils/logger');

const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  type: String,
  title: String,
  message: String,
  orderId: String,
  severity: String,
  timestamp: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date }
}, { collection: 'notifications' });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// Notificación cuando se crea un usuario
subscribe('user.created', async (event) => {
  const { userId, firstName } = event.data;

  logger.info(`🔔 Enviando notificación de bienvenida a usuario ${userId}`);

  try {

    // Guardar en MongoDB para enviar a navegador via WebSocket/SSE
    await Notification.create({
      userId,
      type: 'user.welcome',
      title: '¡Bienvenido!',
      message: `Hola ${firstName}, gracias por registrarte`,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutos
    });

    logger.info(`✅ Notificación guardada para ${userId}`);
  } catch (error) {
    logger.error(`❌ Error creando notificación:`, error);
    throw error;
  }
});

// Notificación cuando un pedido se completa
subscribe('order.delivered', async (event) => {
  const { userId, orderId } = event.data;

  logger.info(`🔔 Enviando notificación de entrega para orden ${orderId}`);

  try {

    await Notification.create({
      userId,
      type: 'order.delivered',
      title: 'Pedido entregado',
      message: `Tu pedido #${orderId} ha sido entregado`,
      orderId,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutos
    });

    logger.info(`✅ Notificación de entrega guardada`);
  } catch (error) {
    logger.error(`❌ Error creando notificación:`, error);
    throw error;
  }
});

// Notificación de error de sincronización (admin)
subscribe('sync.failed', async (event) => {
  const { error, retryCount } = event.data;

  logger.warn(`🔔 Enviando alerta a admins sobre sync fallido`);

  try {
    // Notificar a todos los admins

    await Notification.create({
      userId: 'admins',
      type: 'sync.failed',
      title: 'Error en sincronización',
      message: `Sincronización falló: ${error}. Reintento ${retryCount}`,
      severity: 'warning',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    });

    logger.info(`✅ Alerta guardada para admins`);
  } catch (error) {
    logger.error(`❌ Error creando alerta:`, error);
    throw error;
  }
});

module.exports = {
  name: 'NotificationService'
};
