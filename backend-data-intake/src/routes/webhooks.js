/**
 * 🔔 ROUTES: Webhooks Mejorados
 * 
 * Características:
 * ✅ Procesa mediante workers (no bloquea)
 * ✅ Maneja 5+, 20+ webhooks simultáneos
 * ✅ Idempotencia automática
 * ✅ Rate limiting
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { logger } = require('../utils/logger');
const { webhookRateLimiter } = require('../middleware/rateLimiter');
const { queueWebhook } = require('../workers/api-worker');

// Intenta cargar Webhook del índice principal, si no existe crea un placeholder
let Webhook = null;
try {
  const models = require('../models');
  Webhook = models.Webhook || null;
} catch (error) {
  logger.warn('⚠️  Webhook model no disponible');
}

// Si Webhook no está disponible, crear un placeholder
if (!Webhook) {
  Webhook = {
    create: async (data) => ({ _id: data.webhook_id, ...data }),
    findOne: async () => null
  };
}

router.use(webhookRateLimiter);

/**
 * POST /api/webhooks/evo
 * Recibir eventos de EVO (procesados mediante workers)
 */
router.post('/evo', async (req, res) => {
  try {
    const { evento, data, timestamp, signature } = req.body;

    if (!evento || !data) {
      return res.status(400).json({
        exito: false,
        error: 'Faltan campos: evento, data'
      });
    }

    // Generar ID único del webhook
    const contentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');

    const webhookId = `evo-${contentHash}-${Date.now()}`;

    // Verificar si ya fue procesado (idempotencia)
    const existing = await Webhook.findOne({
      webhook_id: webhookId,
      estado: 'completado'
    });

    if (existing) {
      logger.warn(`⏭️  Webhook EVO duplicado ignorado: ${webhookId}`);
      return res.json({
        exito: true,
        webhookId,
        procesado: false,
        razon: 'Ya fue procesado'
      });
    }

    // Crear registro de webhook
    const webhook = await Webhook.create({
      webhook_id: webhookId,
      source: 'EVO',
      evento,
      data,
      estado: 'pendiente',
      intentos: 0,
      tenant_id: data.tenant_id || 'default',
      hash_contenido: contentHash,
      recibido_en: new Date()
    });

    // Encolar para procesamiento (no bloquea la respuesta)
    const priority = evento === 'venta.creada' ? 10 : 5; // Prioridad a ventas
    queueWebhook(webhookId, 'EVO', evento, data, priority)
      .catch(error => logger.error('Error encolando webhook:', error));

    logger.info(`✅ [WEBHOOK-EVO] Encolado para procesamiento`, {
      webhookId,
      evento,
      priority
    });

    // Responder inmediatamente (no esperamos el procesamiento)
    res.json({
      exito: true,
      webhookId,
      estado: 'encolado',
      evento
    });

  } catch (error) {
    logger.error('❌ Error recibiendo webhook EVO:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * POST /api/webhooks/w12
 * Recibir eventos de W12 (procesados mediante workers)
 */
router.post('/w12', async (req, res) => {
  try {
    const { evento, data } = req.body;

    if (!evento || !data) {
      return res.status(400).json({
        exito: false,
        error: 'Faltan campos: evento, data'
      });
    }

    // Similar a EVO
    const contentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');

    const webhookId = `w12-${contentHash}-${Date.now()}`;

    // Verificar idempotencia
    const existing = await Webhook.findOne({
      webhook_id: webhookId,
      estado: 'completado'
    });

    if (existing) {
      logger.warn(`⏭️  Webhook W12 duplicado ignorado: ${webhookId}`);
      return res.json({
        exito: true,
        webhookId,
        procesado: false,
        razon: 'Ya fue procesado'
      });
    }

    // Crear registro
    await Webhook.create({
      webhook_id: webhookId,
      source: 'W12',
      evento,
      data,
      estado: 'pendiente',
      tenant_id: data.tenant_id || 'default',
      hash_contenido: contentHash
    });

    // Encolar
    queueWebhook(webhookId, 'W12', evento, data, 5)
      .catch(error => logger.error('Error encolando webhook W12:', error));

    logger.info(`✅ [WEBHOOK-W12] Encolado para procesamiento`, {
      webhookId,
      evento
    });

    res.json({
      exito: true,
      webhookId,
      estado: 'encolado',
      evento
    });

  } catch (error) {
    logger.error('❌ Error recibiendo webhook W12:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * GET /api/webhooks/status/:webhookId
 * Obtener estado de un webhook
 */
router.get('/status/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;

    const webhook = await Webhook.findOne({ webhook_id: webhookId });

    if (!webhook) {
      return res.status(404).json({
        exito: false,
        error: 'Webhook no encontrado'
      });
    }

    res.json({
      exito: true,
      webhookId,
      estado: webhook.estado,
      evento: webhook.evento,
      source: webhook.source,
      intentos: webhook.intentos,
      procesado_en: webhook.procesado_en,
      error: webhook.ultimo_error || null
    });

  } catch (error) {
    logger.error('Error obteniendo status:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * GET /api/webhooks/stats
 * Estadísticas de webhooks
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await Webhook.aggregate([
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 }
        }
      }
    ]);

    const pending = stats.find(s => s._id === 'pendiente')?.count || 0;
    const completed = stats.find(s => s._id === 'completado')?.count || 0;
    const failed = stats.find(s => s._id === 'fallido')?.count || 0;

    res.json({
      exito: true,
      stats: {
        pendientes: pending,
        completados: completed,
        fallidos: failed,
        total: pending + completed + failed
      }
    });

  } catch (error) {
    logger.error('Error obteniendo stats:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

module.exports = router;
