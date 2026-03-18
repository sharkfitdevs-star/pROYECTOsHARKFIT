/**
 * ROUTES: Sync
 * Sincronización manual y visualización de logs
 */

const express = require('express');
const router = express.Router();
const SyncService = require('../services/SyncService');
const { requireAuth } = require('../middleware/auth');
const { findSyncLogById, listSyncLogs, updateSyncLog } = require('../db/repositories');
const { logger } = require('../utils/logger');
const { queueSyncTask } = require('../workers/api-worker');
const { extractAndSync } = require('../index');
const { runImport } = require('../services/ExtractorService');
const { ExtractorConfig, SyncLog: ExtractorSyncLog } = require('../models');

/**
 * POST /api/sync/run
 * Ejecutar sincronización manual
 */
router.post('/run', requireAuth, async (req, res) => {
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
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/sync/status/:syncId
 * Obtener estado de sincronización en proceso
 */
router.get('/status/:syncId', requireAuth, async (req, res) => {
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
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/sync/logs
 * Historial de sincronizaciones
 */
router.get('/logs', requireAuth, async (req, res) => {
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
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/sync/retry/:syncId
 * Reintentar sincronización fallida
 */
router.post('/retry/:syncId', requireAuth, async (req, res) => {
  try {
    const { syncId } = req.params;

    const syncLog = await findSyncLogById(syncId);

    if (!syncLog) {
      return res.status(404).json({
        exito: false,
        error: 'Sincronización no encontrada'
      });
    }

    if (!['Fallido', 'Parcial'].includes(syncLog.estatus)) {
      return res.status(400).json({
        exito: false,
        error: 'Solo se pueden reintentar syncs fallidos'
      });
    }

    const currentRetryCount = Number(syncLog.reintentoCount || 0);
    if (currentRetryCount >= 5) {
      return res.status(400).json({
        exito: false,
        error: 'Máximo de reintentos alcanzado'
      });
    }

    const nextRetryCount = currentRetryCount + 1;

    await updateSyncLog(syncId, {
      estatus: 'Procesando',
      reintentoCount: nextRetryCount,
      proximoIntento: null,
      finalizado: null
    });

    logger.info(`Reintentando sync: ${syncId}`, {
      fuente: syncLog.fuente,
      reintentoCount: nextRetryCount
    });

    res.json({
      exito: true,
      mensaje: 'Reintento iniciado',
      syncId,
      reintentoCount: nextRetryCount
    });

    // Ejecutar en background: no bloquear respuesta HTTP
    (async () => {
      const startedAt = Date.now();
      try {
        const fuente = (syncLog.fuente || '').toString();
        if (fuente.startsWith('api-')) {
          await extractAndSync(fuente);
        } else {
          const configDoc = await ExtractorConfig.findOne({ connectionName: fuente }).lean();
          if (!configDoc?._id) {
            throw new Error(`No se encontró ExtractorConfig para fuente: ${fuente}`);
          }

          const rawDataset = syncLog.cambios?.dataset || syncLog.cambios?.entidad || 'ambos';
          const dataset = ['ventas', 'clientes', 'ambos'].includes(rawDataset) ? rawDataset : 'ambos';
          const strategy = syncLog.cambios?.conflictStrategy || 'overwrite';
          const jobId = `${syncId}-retry-${nextRetryCount}`;
          const provider = ['evo', 'w12', 'custom'].includes((configDoc.provider || '').toLowerCase())
            ? configDoc.provider.toLowerCase()
            : 'custom';

          await ExtractorSyncLog.create({
            jobId,
            source: provider,
            connectionName: configDoc.connectionName,
            dataset,
            status: 'queued',
            conflictDetected: false,
            excelRecordCount: 0,
            userId: req.user?.id || null
          });

          await runImport({
            configId: configDoc._id.toString(),
            dataset,
            strategy,
            jobId,
            userId: req.user?.id || null
          });
        }

        await updateSyncLog(syncId, {
          estatus: 'Exitoso',
          finalizado: new Date(),
          duracionMs: Date.now() - startedAt,
          proximoIntento: null
        });

        logger.info(`Reintento finalizado: ${syncId}`, {
          estatus: 'Exitoso',
          reintentoCount: nextRetryCount
        });
      } catch (bgError) {
        logger.error('Error en reintento background sync:', {
          syncId,
          message: bgError.message,
          stack: bgError.stack
        });

        await updateSyncLog(syncId, {
          estatus: 'Fallido',
          finalizado: new Date(),
          duracionMs: Date.now() - startedAt,
          errores: [{ message: bgError.message }],
          proximoIntento: null
        });
      }
    })();
  } catch (error) {
    logger.error('Error reintentando sync:', error);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
