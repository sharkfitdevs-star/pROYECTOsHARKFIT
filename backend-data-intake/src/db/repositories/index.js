/**
 * REPOSITORIES - Capa de persistencia desacoplada
 * Enruta datos por dataType al modelo MongoDB correcto
 */

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// ── Schema dinámico genérico ──────────────────────────────
const syncLogSchema = new mongoose.Schema({
  syncId:      { type: String, required: true, unique: true },
  fuente:      String,
  estatus:     String,
  cambios:     String,
  errores:     String,
  iniciado:    Date,
  finalizado:  Date,
  duracionMs:  Number
}, { timestamps: true });

const SyncLog = mongoose.models.SyncLog || mongoose.model('SyncLog', syncLogSchema);

// ── Schemas por dataType ──────────────────────────────────
const genericSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

function getModel(dataType) {
  const name = dataType.charAt(0).toUpperCase() + dataType.slice(1);
  if (mongoose.models[name]) return mongoose.models[name];
  return mongoose.model(name, new mongoose.Schema({}, { strict: false, timestamps: true }));
}

// ── SyncLog CRUD ──────────────────────────────────────────
async function createSyncLog(data) {
  try {
    if (mongoose.connection.readyState !== 1) {
      logger.warn('DB no disponible, omitiendo createSyncLog');
      return null;
    }
    return await SyncLog.create(data);
  } catch (err) {
    logger.warn(`createSyncLog error: ${err.message}`);
    return null;
  }
}

async function updateSyncLog(syncId, data) {
  try {
    if (mongoose.connection.readyState !== 1) {
      logger.warn('DB no disponible, omitiendo updateSyncLog');
      return null;
    }
    return await SyncLog.findOneAndUpdate({ syncId }, data, { new: true });
  } catch (err) {
    logger.warn(`updateSyncLog error: ${err.message}`);
    return null;
  }
}

async function listImportHistory(limit = 50) {
  try {
    if (mongoose.connection.readyState !== 1) return [];
    return await SyncLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  } catch (err) {
    logger.warn(`listImportHistory error: ${err.message}`);
    return [];
  }
}

// ── Persistencia por dataType ─────────────────────────────
async function syncToRepo(dataType, records) {
  if (!dataType || !records || records.length === 0) return { upserted: 0, errors: 0 };

  try {
    if (mongoose.connection.readyState !== 1) {
      logger.warn(`DB no disponible, omitiendo sync de ${dataType}`);
      return { upserted: 0, errors: 0, skipped: true };
    }

    const Model = getModel(dataType);
    let upserted = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const filter = record.id ? { id: record.id } : { _raw: JSON.stringify(record) };
        await Model.findOneAndUpdate(filter, { $set: record }, { upsert: true, new: true });
        upserted++;
      } catch (e) {
        errors++;
        logger.warn(`syncToRepo error en ${dataType}: ${e.message}`);
      }
    }

    logger.info(`💾 ${dataType}: ${upserted} upserted, ${errors} errores`);
    return { upserted, errors };

  } catch (err) {
    logger.error(`syncToRepo fatal en ${dataType}: ${err.message}`);
    return { upserted: 0, errors: records.length };
  }
}

module.exports = {
  createSyncLog,
  updateSyncLog,
  listImportHistory,
  syncToRepo
};
