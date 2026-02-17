/**
 * MIDDLEWARE: Rate Limiter
 * Protección contra abuso de endpoints
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter general (100 requests por 15 min)
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: {
    exito: false,
    error: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter para importaciones (5 por hora)
 */
const importRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: {
    exito: false,
    error: 'Máximo 5 importaciones por hora'
  }
});

/**
 * Rate limiter para webhooks (1000 por hora)
 */
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: {
    exito: false,
    error: 'Límite de webhooks excedido'
  }
});

/**
 * Rate limiter para login (3 intentos por 15 min) - MEJORADO
 * ✅ Reducido de 10 a 3 para prevenir credential stuffing
 */
const authLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,  // ← REDUCIDO de 10
  message: {
    error: true,
    message: 'Demasiados intentos de inicio de sesión. Intente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production'  // Desactivar en dev
});

/**
 * Rate limiter para forgot/reset (5 por hora)
 */
const authPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    exito: false,
    error: 'Demasiadas solicitudes de recuperacion'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  rateLimiter,
  importRateLimiter,
  webhookRateLimiter,
  authLoginRateLimiter,
  authPasswordRateLimiter
};
