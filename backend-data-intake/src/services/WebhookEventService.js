/**
 * 🔗 WEBHOOK SERVICE - Notifica a sistemas externos sobre eventos
 * Integración con Slack, Discord, sistemas de terceros
 */

const { subscribe } = require('../events/EventBus');
const { logger } = require('../utils/logger');
const axios = require('axios');

// Configurar webhooks desde variables de entorno
const WEBHOOKS = {
  slack: process.env.SLACK_WEBHOOK_URL,
  discord: process.env.DISCORD_WEBHOOK_URL,
  custom: process.env.CUSTOM_WEBHOOK_URL
};

const sendToSlack = async (message) => {
  if (!WEBHOOKS.slack) {
    logger.debug('⚠️ SLACK_WEBHOOK_URL no configurado');
    return;
  }

  try {
    await axios.post(WEBHOOKS.slack, {
      text: message,
      mrkdwn: true
    });
    logger.info(`✅ Mensaje enviado a Slack`);
  } catch (error) {
    logger.error(`❌ Error enviando a Slack:`, error.message);
  }
};

const sendToDiscord = async (message) => {
  if (!WEBHOOKS.discord) {
    logger.debug('⚠️ DISCORD_WEBHOOK_URL no configurado');
    return;
  }

  try {
    await axios.post(WEBHOOKS.discord, {
      content: message
    });
    logger.info(`✅ Mensaje enviado a Discord`);
  } catch (error) {
    logger.error(`❌ Error enviando a Discord:`, error.message);
  }
};

// === EVENTOS DE USUARIO ===
subscribe('user.created', async (event) => {
  const { firstName, email, plan } = event.data;

  logger.info(`🔗 Enviando evento user.created a webhooks`);

  try {
    const message = `🎉 Nuevo usuario registrado:\n*${firstName}*\n📧 ${email}\n💼 Plan: ${plan || 'free'}`;
    
    await Promise.all([
      sendToSlack(message),
      sendToDiscord(message)
    ]);
  } catch (error) {
    logger.error(`❌ Error enviando webhook de usuario:`, error);
  }
});

// === EVENTOS DE PAGO ===
subscribe('order.paid', async (event) => {
  const { orderId, totalAmount, currency } = event.data;

  logger.info(`🔗 Enviando evento order.paid a webhooks`);

  try {
    const message = `💰 Nuevo pago recibido:\n*Orden #${orderId}*\n 💵 ${totalAmount} ${currency}`;
    
    await Promise.all([
      sendToSlack(message),
      sendToDiscord(message)
    ]);
  } catch (error) {
    logger.error(`❌ Error enviando webhook de pago:`, error);
  }
});

// === ALERTAS DE ERROR ===
subscribe('sync.failed', async (event) => {
  const { error, retryCount } = event.data;

  logger.warn(`🔗 Enviando alerta de error a webhooks`);

  try {
    const message = `⚠️ ERROR DE SINCRONIZACIÓN\n*Error:* ${error}\n*Intento #${retryCount}*\n🚨 Revisar inmediatamente`;
    
    await Promise.all([
      sendToSlack(message),
      sendToDiscord(message)
    ]);
  } catch (error) {
    logger.error(`❌ Error enviando webhook de alerta:`, error);
  }
});

subscribe('login.failed', async (event) => {
  const { email, reason, ipAddress } = event.data;

  try {
    // Solo alertar después de 3 intentos fallidos
    const key = `login_attempts:${email}`;
    // const attempts = await require('ioredis')().incr(key); // ELIMINADO
    
    if (attempts === 3) {
      const message = `🔐 MÚLTIPLES INTENTOS DE LOGIN FALLIDOS\n*Usuario:* ${email}\n*Razón:* ${reason}\n*IP:* ${ipAddress}\n🚨 Posible ataque`;
      
      await Promise.all([
        sendToSlack(message),
        sendToDiscord(message)
      ]);
    }
  } catch (error) {
    logger.error(`❌ Error en webhook de login fallido:`, error);
  }
});

// === EVENTOS DE SINCRONIZACIÓN ===
subscribe('sync.completed', async (event) => {
  const { recordsProcessed, duration } = event.data;

  logger.info(`🔗 Enviando evento sync.completed a webhooks`);

  try {
    const message = `✅ Sincronización Completada\n*Registros procesados:* ${recordsProcessed}\n*Duración:* ${duration}ms`;
    
    // Solo notificar a Slack en ambientes de producción
    if (process.env.NODE_ENV === 'production') {
      await sendToSlack(message);
    }
  } catch (error) {
    logger.error(`❌ Error enviando webhook de sync:`, error);
  }
});

// === MANEJO DE PERMISOS ===
subscribe('permission.changed', async (event) => {
  const { userId, targetUserId, permission, granted } = event.data;

  logger.info(`🔗 Enviando evento de cambio de permisos`);

  try {
    const action = granted ? 'OTORGADO' : 'REVOCADO';
    const message = `🔐 Cambio de Permisos\n*Acción:* ${action}\n*Permiso:* ${permission}\n*Usuario:* ${targetUserId}`;
    
    await sendToSlack(message);
  } catch (error) {
    logger.error(`❌ Error enviando webhook de permisos:`, error);
  }
});

module.exports = {
  name: 'WebhookService',
  sendToSlack,
  sendToDiscord
};
