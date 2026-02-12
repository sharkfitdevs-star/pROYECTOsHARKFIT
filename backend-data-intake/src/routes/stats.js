/**
 * ROUTES: Stats
 * Endpoints de estadísticas y métricas
 */

const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/StatsController');

/**
 * GET /api/stats/summary
 * Resumen general del dashboard (ventas, clientes, leads, etc)
 */
router.get('/summary', StatsController.obtenerResumen);

/**
 * GET /api/stats/ventas-weekly
 * Estadísticas de ventas por semana
 */
router.get('/ventas-weekly', StatsController.obtenerVentasSemanales);

/**
 * GET /api/stats/clientes-estado
 * Distribución de clientes por estado
 */
router.get('/clientes-estado', StatsController.obtenerClientesPorEstado);

/**
 * GET /api/stats/membresias-proximasVencer
 * Membresías próximas a vencer
 */
router.get('/membresias-proximasVencer', StatsController.obtenerMembresiasProximasVencer);

/**
 * GET /api/stats/churn-analysis
 * Análisis de tasa de churn (clientes perdidos)
 */
router.get('/churn-analysis', StatsController.obtenerAnalisisChurn);

module.exports = router;
