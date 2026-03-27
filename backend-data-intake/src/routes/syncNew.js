const express = require('express');
const router = express.Router();
const SyncService = require('../services/SyncService');
const { SyncLog } = require('../models');
const { queueSyncTask } = require('../workers/api-worker');

/**
 * POST /api/sync/start
 * Iniciar sincronización manual
 */
router.post('/start', async (req, res) => {
  try {
    const { sourceId, modo = 'incremental', entidades = ['clientes', 'ventas'] } = req.body;
    
    // Configuración de EVO (ejemplo)
    const config = {
      tipo: 'EVO',
      baseURL: process.env.EVO_API_URL || 'https://api.evofitness.com',
      headers: {
        'Authorization': `Bearer ${process.env.EVO_API_TOKEN}`
      },
      endpoints: {
        clientes: '/members',
        ventas: '/sales'
      },
      mapeo: {
        clientes: {
          'id': 'uniqueId',
          'idMember': 'idMember',
          'name': 'name',
          'email': 'email'
        },
        ventas: {
          'id': 'idSale',
          'memberEmail': 'emailCliente'
        }
      }
    };
    
    // Enqueue sync via queueInterface. Worker will process the job.
    const job = await queueSyncTask(config.tipo || 'API', 'manual-sync', { sourceId, modo, entidades, config });

    res.json({
      exito: true,
      queued: true,
      jobId: job?.id || null
    });
  } catch (error) {
    const { logger } = require('../utils/logger');
    logger.error('Error in sync start:', { error });
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync/logs
 * Obtener logs de sincronización
 */
router.get('/logs', async (req, res) => {
  try {
    const { tipo, estatus, limite = 50 } = req.query;
    
    const logs = await SyncService.obtenerLogs({
      tipo: tipo,
      estado: estatus,
      limit: parseInt(limite)
    });
    
    res.json({
      exito: true,
      cantidad: logs.length,
      logs
    });
  } catch (error) {
    logger.error('Error getting sync logs:', { error });
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync/status
 * Obtener estado de sincronización
 */
router.get('/status', async (req, res) => {
  try {
    const ultimoSync = await SyncLog.findOne()
      .sort({ iniciado_en: -1 });
    
    const syncActivos = await SyncLog.countDocuments({
      estado: { $in: ['iniciado', 'procesando'] }
    });
    
    res.json({
      exito: true,
      ultimoSync,
      syncActivos
    });
  } catch (error) {
    logger.error('Error getting sync status:', { error });
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

module.exports = router;
