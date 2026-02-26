/**
 * 🏥 HEALTH CHECK SERVICE - Monitorea estado de APIs externas
 * 
 * Características:
 * ✅ Verifica salud de EVO, W12, Django
 * ✅ Registra latencia
 * ✅ Circui breaker basado en health
 * ✅ Alertas automáticas
 */

const axios = require('axios');
const { logger } = require('../utils/logger');

// Intenta cargar HealthCheck con fallback
let HealthCheck = null;
try {
  const models = require('../models');
  HealthCheck = models.HealthCheck || null;
} catch (error) {
  logger.warn('⚠️  HealthCheck model no disponible');
}

// Si HealthCheck no está disponible, crear un placeholder
if (!HealthCheck) {
  HealthCheck = {
    create: async (data) => ({ _id: data.service, ...data }),
    findOne: async () => null
  };
}



// ============================================================================
// CONFIGURACIÓN DE HEALTH CHECKS
// ============================================================================

const HEALTH_CHECKS = {
  EVO: {
    url: `${process.env.EVO_BASE_URL || 'https://evo-integracao.w12app.com.br'}/api/health`,
    auth: {
      username: process.env.EVO_DNS,
      password: process.env.EVO_TOKEN
    },
    timeout: 5000,
    interval: 60000 // Cada 1 minuto
  },
  W12: {
    url: `${process.env.W12_BASE_URL || 'https://sharkfitchile.w12app.com.br'}/api/health`,
    auth: {
      username: process.env.W12_DNS,
      password: process.env.W12_TOKEN
    },
    timeout: 5000,
    interval: 60000
  },
  DJANGO: {
    url: `${process.env.DJANGO_BASE_URL || 'http://localhost:8000'}/health/`,
    timeout: 5000,
    interval: 30000 // Cada 30 segundos
  },
  MONGODB: {
    timeout: 1000,
    interval: 30000
  }
};

// ============================================================================
// HEALTH CHECK EXECUTOR
// ============================================================================

class HealthCheckService {
  constructor() {
    this.lastStatus = new Map();
    this.checks = new Map();
    this._timers = []; // almacenar referencias a timers para permitir limpieza

    // track if we've already warned about missing config for a service
    this._skippedReported = new Set();
    // track last time an error was logged per service (for backoff)
    this._lastErrorLog = new Map();
  }

  /**
   * Verificar estado de EVO
   */
  async checkEVO() {
    const start = Date.now();
    const config = HEALTH_CHECKS.EVO;

    // skip if configuration incomplete
    if (!config.url || !config.auth?.username || !config.auth?.password) {
      if (!this._skippedReported.has('EVO')) {
        logger.warn('⚠️ [HEALTH] EVO check skipped due to missing configuration');
        this._skippedReported.add('EVO');
      }
      await this.recordHealth('EVO', 'skipped', 0, 'Falta configuración');
      return { estado: 'skipped' };
    }

    try {
      const response = await axios.get(config.url, {
        auth: config.auth,
        timeout: config.timeout
      });

      const latency = Date.now() - start;
      const estado = latency > 2000 ? 'degraded' : 'healthy';

      await this.recordHealth('EVO', estado, latency, 'EVO respondió correctamente');
      return { estado, latency, statusCode: response.status };

    } catch (error) {
      const now = Date.now();
      const lastLog = this._lastErrorLog.get('EVO') || 0;
      if (now - lastLog > 5 * 60 * 1000) {
        logger.error('❌ [HEALTH] EVO fallo:', error.message);
        this._lastErrorLog.set('EVO', now);
      }
      await this.recordHealth('EVO', 'unhealthy', Date.now() - start, `Error: ${error.message}`);
      return { estado: 'unhealthy', latency: Date.now() - start, error: error.message };
    }
  }

  /**
   * Verificar estado de W12
   */
  async checkW12() {
    const start = Date.now();
    const config = HEALTH_CHECKS.W12;

    if (!config.url || !config.auth?.username || !config.auth?.password) {
      if (!this._skippedReported.has('W12')) {
        logger.warn('⚠️ [HEALTH] W12 check skipped due to missing configuration');
        this._skippedReported.add('W12');
      }
      await this.recordHealth('W12', 'skipped', 0, 'Falta configuración');
      return { estado: 'skipped' };
    }

    try {
      const response = await axios.get(config.url, {
        auth: config.auth,
        timeout: config.timeout
      });

      const latency = Date.now() - start;
      const estado = latency > 2000 ? 'degraded' : 'healthy';

      await this.recordHealth('W12', estado, latency, 'W12 respondió correctamente');
      return { estado, latency, statusCode: response.status };

    } catch (error) {
      const now = Date.now();
      const lastLog = this._lastErrorLog.get('W12') || 0;
      if (now - lastLog > 5 * 60 * 1000) {
        logger.error('❌ [HEALTH] W12 fallo:', error.message);
        this._lastErrorLog.set('W12', now);
      }
      await this.recordHealth('W12', 'unhealthy', Date.now() - start, `Error: ${error.message}`);
      return { estado: 'unhealthy', latency: Date.now() - start, error: error.message };
    }
  }

  /**
   * Verificar estado de Django
   */
  async checkDjango() {
    const start = Date.now();
    const config = HEALTH_CHECKS.DJANGO;

    if (!config.url) {
      if (!this._skippedReported.has('DJANGO')) {
        logger.warn('⚠️ [HEALTH] Django check skipped due to missing configuration');
        this._skippedReported.add('DJANGO');
      }
      await this.recordHealth('DJANGO', 'skipped', 0, 'Falta configuración');
      return { estado: 'skipped' };
    }

    try {
      const response = await axios.get(config.url, {
        timeout: config.timeout
      });

      const latency = Date.now() - start;
      const estado = latency > 1000 ? 'degraded' : 'healthy';

      await this.recordHealth('DJANGO', estado, latency, 'Django respondió correctamente');
      return { estado, latency, statusCode: response.status };

    } catch (error) {
      const now = Date.now();
      const lastLog = this._lastErrorLog.get('DJANGO') || 0;
      if (now - lastLog > 5 * 60 * 1000) {
        logger.error('❌ [HEALTH] Django fallo:', error.message);
        this._lastErrorLog.set('DJANGO', now);
      }
      await this.recordHealth('DJANGO', 'unhealthy', Date.now() - start, `Error: ${error.message}`);
      return { estado: 'unhealthy', latency: Date.now() - start, error: error.message };
    }
  }





  /**
   * Verificar estado de MongoDB
   */
  async checkMongoDB() {
    const start = Date.now();

    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) { // Connected
        const latency = Date.now() - start;
        const estado = latency > 500 ? 'degraded' : 'healthy';
        await this.recordHealth('MONGODB', estado, latency, 'MongoDB conectado');
        return { estado, latency };
      } else {
        throw new Error('No conectado a MongoDB');
      }

    } catch (error) {
      logger.error('❌ [HEALTH] MongoDB fallo:', error.message);
      await this.recordHealth('MONGODB', 'unhealthy', Date.now() - start, `Error: ${error.message}`);
      return { estado: 'unhealthy', latency: Date.now() - start, error: error.message };
    }
  }

  /**
   * Registrar health check en BD
   */
  async recordHealth(servicio, estado, latencia, mensaje) {
    try {
      const lastStatus = this.lastStatus.get(servicio);

      // Solo alertar si cambio de estado
      if (lastStatus && lastStatus.estado !== estado) {
        logger.warn(`🚨 [HEALTH-ALERT] ${servicio}: ${lastStatus.estado} → ${estado}`, {
          latencia,
          mensaje
        });
      }

      this.lastStatus.set(servicio, { estado, latencia, timestamp: new Date() });

      // Guardar en MongoDB
      await HealthCheck.create({
        servicio,
        estado,
        latencia_ms: latencia,
        mensaje,
        detalles: {
          timestamp: new Date(),
        }
      });


    } catch (error) {
      logger.error('❌ Error registrando health check:', error);
    }
  }

  /**
   * Obtener status actual
   */
  async getStatus() {
    const statuses = {};

    for (const [servicio] of Object.entries(HEALTH_CHECKS)) {
      try {
      } catch (error) {
        statuses[servicio] = { estado: 'unknown', error: error.message };
      }
    }

    return {
      timestamp: new Date(),
      services: statuses,
      overall: this.calculateOverall(statuses)
    };
  }

  /**
   * Calcular estado general
   */
  calculateOverall(statuses) {
    const values = Object.values(statuses);
    const unhealthy = values.filter(s => s.estado === 'unhealthy').length;
    const degraded = values.filter(s => s.estado === 'degraded').length;

    if (unhealthy > 2) return 'unhealthy';
    if (degraded >= 2) return 'degraded';
    return 'healthy';
  }

  /**
   * Iniciar health checks periódicos
   */
  startPeriodicChecks() {
    // No ejecutar durante pruebas unitarias o si la variable SKIP_HEALTH_CHECKS está activada
    if (process.env.NODE_ENV === 'test' || String(process.env.SKIP_HEALTH_CHECKS).toLowerCase() === 'true') {
      logger.info('⏭️ startPeriodicChecks omitido (test env o SKIP_HEALTH_CHECKS)');
      return;
    }

    logger.info('🏥 Iniciando health checks periódicos...');

    // EVO
    this._timers.push(setInterval(() => this.checkEVO(), HEALTH_CHECKS.EVO.interval));
    this.checkEVO();

    // W12
    this._timers.push(setInterval(() => this.checkW12(), HEALTH_CHECKS.W12.interval));
    this.checkW12();

    // Django
    this._timers.push(setInterval(() => this.checkDjango(), HEALTH_CHECKS.DJANGO.interval));
    this.checkDjango();

    // MongoDB
    this._timers.push(setInterval(() => this.checkMongoDB(), HEALTH_CHECKS.MONGODB.interval));
  }

  /**
   * Parar health checks periódicos (limpieza de timers)
   */
  stopPeriodicChecks() {
    if (this._timers && this._timers.length) {
      for (const t of this._timers) {
        try { clearInterval(t); } catch (e) { /* noop */ }
      }
      this._timers = [];
      logger.info('🛑 Health checks periódicos detenidos');
    }
  }

  /**
   * Verificar si es seguro sincronizar
   */
  async isSafeToSync() {
    const status = await this.getStatus();

    for (const service of critical) {
      if (status.services[service]?.estado === 'unhealthy') {
        logger.warn(`⚠️  No es seguro sincronizar: ${service} está caído`);
        return false;
      }
    }

    return true;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance = null;

function getHealthCheckService() {
  if (!instance) {
    instance = new HealthCheckService();
  }
  return instance;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  HealthCheckService,
  getHealthCheckService
};
