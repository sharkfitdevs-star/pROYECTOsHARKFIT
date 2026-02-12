/**
 * ROUTES: Webhooks
 * Recibir eventos en tiempo real de EVO, W12, etc
 */

const express = require('express');
const router = express.Router();
const SyncService = require('../services/SyncService');
const { logger } = require('../utils/logger');
const { webhookRateLimiter } = require('../middleware/rateLimiter');

router.use(webhookRateLimiter);

/**
 * POST /api/webhooks/evo
 * Recibir eventos de EVO
 */
router.post('/evo', async (req, res) => {
  try {
    const { evento, data, timestamp } = req.body;

    // Validar firma (opcional)
    const firma = req.headers['x-signature'];
    // TODO: Validar firma con EVO_WEBHOOK_SECRET

    const resultado = await SyncService.procesarWebhook(evento, data, 'EVO');

    res.json({
      exito: true,
      syncId: resultado.syncId,
      procesado: true
    });
  } catch (error) {
    logger.error('Error procesando webhook EVO:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * POST /api/webhooks/w12
 */
router.post('/w12', async (req, res) => {
  try {
    const { evento, data } = req.body;
    const resultado = await SyncService.procesarWebhook(evento, data, 'W12');

    res.json({
      exito: true,
      syncId: resultado.syncId
    });
  } catch (error) {
    logger.error('Error procesando webhook W12:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

module.exports = router;
