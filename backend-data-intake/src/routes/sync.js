/**
 * ROUTES: Sync
 * Sincronización manual y visualización de logs
 */

const express = require('express');
const router = express.Router();
const SyncService = require('../services/SyncService');
const { findSyncLogById, listSyncLogs } = require('../db/repositories');
const { logger } = require('../utils/logger');
const { queueSyncTask } = require('../workers/api-worker');

/**
 * POST /api/sync/run
 * Ejecutar sincronización manual
 */
router.post('/run', async (req, res) => {
  try {
    const { sourceId, modo = 'incremental', entidades = ['clientes', 'ventas'] } = req.body;

    // TODO: Obtener config desde BD
    const config = {
      tipo: 'EVO',
      baseURL: process.env.EVO_BASE_URL,
      headers: { Authorization: `Bearer ${process.env.EVO_API_KEY}` },
      endpoints: { clientes: '/clientes', ventas: '/ventas' }
    };

    // Enqueue manual sync via queueInterface (feature-flagged/portable)
    const job = await queueSyncTask('API', 'manual-sync', { sourceId, modo, entidades, config });

    res.json({
      exito: true,
      queued: true,
      jobId: job?.id || null
    });
  } catch (error) {
    logger.error('Error ejecutando sincronización:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync/status/:syncId
 * Obtener estado de sincronización en proceso
 */
router.get('/status/:syncId', async (req, res) => {
  try {
    const { syncId } = req.params;

    const syncLog = await findSyncLogById(syncId);

    if (!syncLog) {
      return res.status(404).json({
        exito: false,
        error: 'Sincronización no encontrada'
      });
    }

    res.json({
      exito: true,
      datos: {
        syncId: syncLog.syncId,
        estatus: syncLog.estatus,
        progreso: {
          procesados: syncLog.registosProcesados,
          inseridos: syncLog.registosInseridos,
          actualizados: syncLog.registosActualizados,
          fallidos: syncLog.registosFallidos
        },
        duracionMs: syncLog.duracionMs,
        iniciado: syncLog.iniciado,
        finalizado: syncLog.finalizado
      }
    });
  } catch (error) {
    logger.error('Error obteniendo estado sync:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync/logs
 * Historial de sincronizaciones
 */
router.get('/logs', async (req, res) => {
  try {
    const { sourceId, desde, hasta, limit = 20 } = req.query;

    const logs = (await listSyncLogs({
      sourceId,
      desde,
      hasta,
      limit: parseInt(limit)
    })).map(({ errores, ...rest }) => rest);

    res.json({
      exito: true,
      datos: logs,
      cantidad: logs.length
    });
  } catch (error) {
    logger.error('Error obteniendo logs:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sync/retry/:syncId
 * Reintentar sincronización fallida
 */
router.post('/retry/:syncId', async (req, res) => {
  try {
    const { syncId } = req.params;

    const syncLog = await findSyncLogById(syncId);

    if (!syncLog) {
      return res.status(404).json({
        exito: false,
        error: 'Sincronización no encontrada'
      });
    }

    if (syncLog.reintentoCount >= 5) {
      return res.status(400).json({
        exito: false,
        error: 'Máximo de reintentos alcanzado'
      });
    }

    // TODO: Ejecutar reintento
    logger.info(`Reintentando sync: ${syncId}`);

    res.json({
      exito: true,
      mensaje: 'Reintento iniciado'
    });
  } catch (error) {
    logger.error('Error reintentando sync:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

module.exports = router;
