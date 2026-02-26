// Stub temporal de la integración con ABC Evo.
// Este archivo se utiliza únicamente en desarrollo/local
// hasta que la API real esté disponible.
// Exporta dos funciones asíncronas que devuelven arrays vacíos.

const { logger } = require('../utils/logger');

async function getMemberships(options = {}) {
  logger.warn('abcEvo.getMemberships STUB llamado...', { options });
  // retorno vacío para que el flujo de exportación no falle
  return [];
}

async function getPayables(options = {}) {
  logger.warn('abcEvo.getPayables STUB llamado...', { options });
  return [];
}

module.exports = {
  getMemberships,
  getPayables,
};