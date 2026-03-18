/**
 * 🚦 RATE LIMITER - Respeta límites de APIs externas
 * 
 * Características:
 * ✅ Rate limiting por API
 * ✅ Respeta headers X-RateLimit-*
 * ✅ Token bucket algorithm
 */

const { logger } = require('../utils/logger');
const mongoose = require('mongoose');
const rateLimitSchema = new mongoose.Schema({
  apiName: { type: String, index: true },
  windowStart: { type: Date, index: true },
  count: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'ratelimits' });
rateLimitSchema.index({ apiName: 1, windowStart: 1 }, { unique: true });
const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);

const globalRateLimitSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  windowStart: { type: Date, index: true },
  count: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'globalratelimits' });
globalRateLimitSchema.index({ userId: 1, windowStart: 1 }, { unique: true });
const GlobalRateLimit = mongoose.models.GlobalRateLimit || mongoose.model('GlobalRateLimit', globalRateLimitSchema);

const EVO_PLAN = (process.env.EVO_API_PLAN || 'plus').toLowerCase();

// Configuración de rate limits por API
const API_LIMITS = {
  'EVO': EVO_PLAN === 'pro'
    ? { requests: 50, window: 60, monthlyLimit: null } // Pro: mayor throughput, sin límite mensual
    : { requests: 90, window: 86400, monthlyLimit: 950 }, // Plus: 90 req/día con buffer y 950/mes
  'W12': { requests: 100, window: 60 },
  'SHOPIFY': { requests: 2, window: 1 }, // 2 req/sec (muy restrictivo)
  'STRIPE': { requests: 100, window: 1 },
  'default': { requests: 50, window: 60 }
};

class RateLimiter {
  constructor(apiName, options = {}) {
    this.apiName = apiName;
    this.config = API_LIMITS[apiName] || API_LIMITS['default'];
    this.key = `ratelimit:${apiName}`;
  }

  /**
   * Espera si es necesario respetando el rate limit
   * ⚠️ IMPORTANTE: Este método SOLO espera, NO incrementa el contador
   * El contador se incrementa DESPUÉS de un request exitoso (2xx) via confirmRequest()
   * Para mantener integridad: si falla, llamar a rollbackRequest()
   */
  async wait() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % (this.config.window * 1000)));

    // Buscar o crear registro de rate limit para esta ventana (atómico — evita race condition)
    let rate = await RateLimit.findOneAndUpdate(
      { apiName: this.apiName, windowStart },
      { $setOnInsert: { apiName: this.apiName, windowStart, count: 0, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    // Verificación mensual adicional (no esperar reset mensual: lanzar error inmediato)
    if (this.config.monthlyLimit) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthlyCount = await RateLimit.aggregate([
        { $match: { apiName: this.apiName, windowStart: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]);

      const totalThisMonth = monthlyCount[0]?.total || 0;

      if (totalThisMonth >= this.config.monthlyLimit) {
        const nextMonth = new Date(monthStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        logger.error(`🚫 [RATE-LIMIT] ${this.apiName}: LÍMITE MENSUAL ALCANZADO (${totalThisMonth}/${this.config.monthlyLimit}). Próximo reset: ${nextMonth.toISOString()}`);

        throw new Error(`MONTHLY_LIMIT_EXCEEDED: ${this.apiName} ha alcanzado ${totalThisMonth}/${this.config.monthlyLimit} requests mensuales. Próximo reset: ${nextMonth.toLocaleDateString()}`);
      }

      if (totalThisMonth > this.config.monthlyLimit * 0.8) {
        logger.warn(`⚠️ [RATE-LIMIT] ${this.apiName}: ${totalThisMonth}/${this.config.monthlyLimit} requests mensuales (${Math.round(totalThisMonth / this.config.monthlyLimit * 100)}%)`);
      }
    }

    if (rate.count >= this.config.requests) {
      // Calcular tiempo de espera hasta la próxima ventana
      const nextWindow = new Date(windowStart.getTime() + this.config.window * 1000);
      const delayMs = Math.max(0, nextWindow - now);

      logger.warn(`⏳ [RATE-LIMIT] ${this.apiName}: Esperando ${delayMs}ms (${rate.count}/${this.config.requests})`, {
        waitTime: delayMs / 1000,
        currentCount: rate.count
      });

      await new Promise(resolve => setTimeout(resolve, delayMs));
      // Resetear contador después de esperar (permitir siguiente request)
      await RateLimit.updateOne({ apiName: this.apiName, windowStart }, { $set: { count: 0, updatedAt: new Date() } });
    }

    // Obtener valores actualizados (sin incrementar)
    const updated = await RateLimit.findOne({ apiName: this.apiName, windowStart });
    return {
      allowed: true,
      remaining: Math.max(0, this.config.requests - updated.count),
      resetIn: this.config.window
    };
  }

  /**
   * Incrementar contador DESPUÉS de un request exitoso (2xx)
   * Llamar a esto DESPUÉS de recibir respuesta 2xx de la API
   */
  async confirmRequest() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % (this.config.window * 1000)));

    await RateLimit.updateOne(
      { apiName: this.apiName, windowStart },
      {
        $setOnInsert: { apiName: this.apiName, windowStart, updatedAt: new Date() },
        $inc: { count: 1 },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

    const updated = await RateLimit.findOne({ apiName: this.apiName, windowStart });
    logger.debug(`✅ [RATE-LIMIT] Request confirmado para ${this.apiName}`, {
      count: updated?.count || 1,
      limit: this.config.requests
    });
  }

  /**
   * Decrementar contador si el request falló (4xx, 5xx)
   * Llamar a esto si axios lanza error (status 4xx o 5xx)
   */
  async rollbackRequest() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % (this.config.window * 1000)));

    const result = await RateLimit.findOneAndUpdate(
      { apiName: this.apiName, windowStart },
      {
        $inc: { count: -1 },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    logger.warn(`⏮️ [RATE-LIMIT] Rollback: request falló para ${this.apiName}`, {
      count: Math.max(0, result?.count || 0),
      limit: this.config.requests
    });
  }

  async getMonthlyUsage() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const result = await RateLimit.aggregate([
      { $match: { apiName: this.apiName, windowStart: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);

    const used = result[0]?.total || 0;
    const limit = this.config.monthlyLimit == null ? Infinity : this.config.monthlyLimit;

    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % (this.config.window * 1000)));
    const rate = await RateLimit.findOne({ apiName: this.apiName, windowStart });
    const dailyUsed = rate ? rate.count : 0;

    return {
      api: this.apiName,
      plan: (process.env.EVO_API_PLAN || 'plus').toLowerCase(),
      monthlyUsed: used,
      monthlyLimit: limit,
      monthlyRemaining: limit === Infinity ? Infinity : Math.max(0, limit - used),
      percentUsed: limit === Infinity ? 0 : Math.round(used / limit * 100),
      dailyUsed,
      dailyLimit: this.config.requests
    };
  }

  /**
   * Actualizar límites basado en headers de respuesta
   */
  updateFromResponse(responseHeaders) {
    // Algunos APIs retornan estos headers
    const limit = parseInt(responseHeaders['x-ratelimit-limit'], 10);
    const remaining = parseInt(responseHeaders['x-ratelimit-remaining'], 10);
    const reset = parseInt(responseHeaders['x-ratelimit-reset'], 10);

    if (limit && remaining !== undefined) {
      logger.debug(`📊 [RATE-LIMIT] Actualizando límites para ${this.apiName}:`, {
        limit,
        remaining,
        resetAt: new Date(reset * 1000)
      });

      this.config.requests = limit;
      this.config.remaining = remaining;
    }
  }

  /**
   * Obtener stats actuales
   */
  async getStats() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % (this.config.window * 1000)));
    const rate = await RateLimit.findOne({ apiName: this.apiName, windowStart });
    const monthly = await this.getMonthlyUsage();
    return {
      api: this.apiName,
      requests: this.config.requests,
      window: this.config.window,
      used: rate ? rate.count : 0,
      remaining: Math.max(0, this.config.requests - (rate ? rate.count : 0)),
      resetIn: this.config.window + 's',
      monthlyUsed: monthly.monthlyUsed,
      monthlyLimit: monthly.monthlyLimit,
      monthlyRemaining: monthly.monthlyRemaining
    };
  }
}

// ============================================================================
// GLOBAL RATE LIMITER (para múltiples users)
// ============================================================================


class GlobalRateLimiter {
  constructor(maxRequests = 1000, windowSeconds = 60) {
    this.maxRequests = maxRequests;
    this.window = windowSeconds;
  }

  async checkLimit(userId) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % (this.window * 1000)));
    let rate = await GlobalRateLimit.findOneAndUpdate(
      { userId, windowStart },
      { $setOnInsert: { userId, windowStart, count: 0, updatedAt: new Date() } },
      { upsert: true, new: true }
    );
    if (rate.count >= this.maxRequests) {
      logger.warn(`⛔ [GLOBAL-LIMIT] Usuario ${userId} excedió límite`, {
        used: rate.count,
        max: this.maxRequests,
        window: this.window
      });
      return {
        allowed: false,
        used: rate.count,
        remaining: 0,
        resetIn: this.window + 's'
      };
    }
    await GlobalRateLimit.updateOne({ userId, windowStart }, { $inc: { count: 1 }, $set: { updatedAt: new Date() } });
    const updated = await GlobalRateLimit.findOne({ userId, windowStart });
    return {
      allowed: true,
      used: updated.count,
      remaining: Math.max(0, this.maxRequests - updated.count),
      resetIn: this.window + 's'
    };
  }
}

module.exports = {
  RateLimiter,
  GlobalRateLimiter,
  API_LIMITS
};
