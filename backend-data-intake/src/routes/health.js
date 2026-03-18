/**
 * 🏥 ROUTES: Health Checks
 * Monitorea estado de APIs y servicios
 */

const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { getWorkerStats } = require('../workers/api-worker');
const { getHealthCheckService } = require('../services/HealthCheckService');

const healthService = getHealthCheckService();

/**
 * GET /api/health
 * Retorna un estado básico y stats de workers (fallback para dev)
 */
router.get('/', async (req, res) => {
  try {
    const workerStats = await getWorkerStats().catch(() => ({}));
    const { readyState, ok } = require('../db/db').getDbStatus();

    res.status(200).json({
      status: 'ok',
      mongo: { readyState, ok },
      servicio: 'DATA-INTAKE',
      estado: 'healthy',
      workers: workerStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error en health root:', error);
    res.status(503).json({ status:'ok', mongo:{readyState:-1,ok:false}, servicio: 'DATA-INTAKE', estado: 'unhealthy', error: error.message });
  }
});

/**
 * GET /api/health/sync-safe
 * Respuesta rápida para checks locales
 */
router.get('/sync-safe', async (req, res) => {
  res.status(200).json({ safe: true, message: 'Fallback: seguro sincronizar (dev)' });
});

/**
 * GET /api/health/w12
 */
router.get('/w12', async (req, res) => {
  try {
    const result = await healthService.checkW12();
    const statusCode = result.estado === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      servicio: 'W12',
      ...result
    });
  } catch (error) {
    res.status(503).json({
      servicio: 'W12',
      estado: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/health/django
 */
router.get('/django', async (req, res) => {
  try {
    const result = await healthService.checkDjango();
    const statusCode = result.estado === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      servicio: 'DJANGO',
      ...result
    });
  } catch (error) {
    res.status(503).json({
      servicio: 'DJANGO',
      estado: 'unhealthy',
      error: error.message
    });
  }
});


/**
 * GET /api/health/mongodb
 */
router.get('/mongodb', async (req, res) => {
  try {
    const result = await healthService.checkMongoDB();
    const statusCode = result.estado === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      servicio: 'MONGODB',
      ...result
    });
  } catch (error) {
    res.status(503).json({
      servicio: 'MONGODB',
      estado: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/health/sync-safe
 * Verifica si es seguro sincronizar
 */
router.get('/sync-safe', async (req, res) => {
  try {
    const safe = await healthService.isSafeToSync();

    res.status(safe ? 200 : 503).json({
      safe,
      message: safe 
        ? '✅ Es seguro sincronizar'
        : '⛔ No es seguro sincronizar en este momento'
    });

  } catch (error) {
    logger.error('Error verificando seguridad de sync:', error);
    res.status(503).json({
      safe: false,
      error: error.message
    });
  }
});

module.exports = router;
