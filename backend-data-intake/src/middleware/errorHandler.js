/**
 * MIDDLEWARE: Error Handler
 * Manejo centralizado de errores
 */

const { logger } = require('../utils/logger');

/**
 * Error handler global
 */
function errorHandler(err, req, res, next) {
  logger.error('Error no manejado:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({
      exito: false,
      error: 'Duplicado detectado'
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    exito: false,
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { errorHandler };
