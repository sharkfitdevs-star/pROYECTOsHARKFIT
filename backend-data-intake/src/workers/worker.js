/**
 * Worker entrypoint
 * Este archivo se invoca con `npm run worker` en desarrollo/producción.
 * Carga el módulo principal `api-worker` (que inicializa las colas y los procesadores)
 * y se asegura de que exista una conexión a MongoDB.
 * Mantiene el proceso en ejecución para poder atender jobs en cola.
 */

require('dotenv').config();

// conectar a MongoDB antes de empezar a procesar
const { connectDB } = require('../db/mongodb');
const { logger } = require('../utils/logger');

(async () => {
  try {
    await connectDB();
    logger.info('[WORKER] MongoDB conectado');
  } catch (err) {
    logger.error('[WORKER] Error conectando a MongoDB:', err.message || err);
    process.exit(1);
  }

  // cargar definiciones y procesadores
  require('./api-worker');

  logger.info('[WORKER] api-worker cargado, esperando jobs...');

  // mantener proceso vivo
  process.stdin.resume();

  process.on('SIGTERM', () => {
    logger.info('[WORKER] SIGTERM recibido, finalizando');
    process.exit(0);
  });
  process.on('SIGINT', () => {
    logger.info('[WORKER] SIGINT recibido, finalizando');
    process.exit(0);
  });
})();