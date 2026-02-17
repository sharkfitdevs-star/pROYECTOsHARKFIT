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

// Configuración de rate limits por API
const API_LIMITS = {
  'EVO': { requests: 100, window: 60 }, // 100 req/min
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
   */
  async wait() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % (this.config.window * 1000)));

    // Buscar o crear registro de rate limit para esta ventana
    let rate = await RateLimit.findOne({ apiName: this.apiName, windowStart });
    if (!rate) {
      rate = await RateLimit.create({ apiName: this.apiName, windowStart, count: 0 });
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
      // Resetear contador después de esperar
      await RateLimit.updateOne({ apiName: this.apiName, windowStart }, { $set: { count: 1, updatedAt: new Date() } });
    } else {
      // Incrementar contador
      await RateLimit.updateOne({ apiName: this.apiName, windowStart }, { $inc: { count: 1 }, $set: { updatedAt: new Date() } });
    }

    // Obtener valores actualizados
    const updated = await RateLimit.findOne({ apiName: this.apiName, windowStart });
    return {
      allowed: true,
      remaining: Math.max(0, this.config.requests - updated.count),
      resetIn: this.config.window
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
    return {
      api: this.apiName,
      requests: this.config.requests,
      window: this.config.window,
      used: rate ? rate.count : 0,
      remaining: Math.max(0, this.config.requests - (rate ? rate.count : 0)),
      resetIn: this.config.window + 's'
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
    let rate = await GlobalRateLimit.findOne({ userId, windowStart });
    if (!rate) {
      rate = await GlobalRateLimit.create({ userId, windowStart, count: 0 });
    }
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
