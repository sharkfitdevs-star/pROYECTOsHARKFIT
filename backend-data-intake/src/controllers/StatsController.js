/**
 * CONTROLLER: StatsController
 * Manejar solicitudes HTTP para estadísticas
 */

const StatsService = require('../services/StatsService');
const { logger } = require('../utils/logger');

class StatsController {
  /**
   * GET /api/stats/summary
   * Resumen general del dashboard
   */
  async obtenerResumen(req, res) {
    try {
      const { desde, hasta } = req.query;

      const resumen = await StatsService.obtenerResumen(
        desde ? new Date(desde) : null,
        hasta ? new Date(hasta) : null
      );

      res.json({
        exito: true,
        datos: resumen,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error en obtenerResumen:', error);
      res.status(500).json({
        exito: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/stats/ventas-weekly
   * Ventas por semana
   */
  async obtenerVentasSemanales(req, res) {
    try {
      const { desde, hasta } = req.query;

      const ventas = await StatsService.obtenerVentasSemanales(
        desde ? new Date(desde) : null,
        hasta ? new Date(hasta) : null
      );

      res.json({
        exito: true,
        datos: ventas,
        totalSemanas: ventas.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error en obtenerVentasSemanales:', error);
      res.status(500).json({
        exito: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/stats/clientes-estado
   * Distribución de clientes por estado
   */
  async obtenerClientesPorEstado(req, res) {
    try {
      const clientes = await StatsService.obtenerClientesPorEstado();

      res.json({
        exito: true,
        datos: clientes,
        totalEstados: clientes.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error en obtenerClientesPorEstado:', error);
      res.status(500).json({
        exito: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/stats/membresias-proximasVencer
   * Membresías próximas a vencer
   */
  async obtenerMembresiasProximasVencer(req, res) {
    try {
      const { dias = 7, estado = 'activa' } = req.query;

      const membresias = await StatsService.obtenerMembresiasProximasVencer(
        parseInt(dias),
        estado
      );

      res.json({
        exito: true,
        datos: membresias,
        cantidad: membresias.length,
        diasFiltro: parseInt(dias),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error en obtenerMembresiasProximasVencer:', error);
      res.status(500).json({
        exito: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/stats/churn-analysis
   * Análisis de churn (clientes perdidos)
   */
  async obtenerAnalisisChurn(req, res) {
    try {
      const { periodo = 30 } = req.query;

      const analisis = await StatsService.obtenerAnalisisChurn(parseInt(periodo));

      res.json({
        exito: true,
        datos: analisis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error en obtenerAnalisisChurn:', error);
      res.status(500).json({
        exito: false,
        error: error.message
      });
    }
  }
}

module.exports = new StatsController();
