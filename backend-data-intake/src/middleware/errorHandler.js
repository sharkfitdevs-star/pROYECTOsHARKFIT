/**
 * MIDDLEWARE: Error Handler
 * Manejo centralizado de errores
 */

const { logger } = require('../utils/logger');

/**
 * Error handler global
 */
function errorHandler(err, req, res, next) {
  // always log full error info on server
  logger.error('Unhandled error', {
    message: err?.message,
    stack: err?.stack,
    path: req.path,
    method: req.method
  });


  // generic response
  const payload = { ok: false, error: 'INTERNAL_SERVER_ERROR' };
  if (process.env.NODE_ENV !== 'production' && err && err.stack) {
    const lines = err.stack.split('\n').slice(0, 5);
    payload.stack = lines.join('\n');
  }
  res.status(500).json(payload);
}

module.exports = { errorHandler };
