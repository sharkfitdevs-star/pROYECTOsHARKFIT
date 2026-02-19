/**
 * evoRepository - Mongo-backed replacement for the old SQLite `repository` used
 * by the EVO W12 proxy.  This module provides the async DB primitives we will
 * use when refactoring `src/evo-w12-proxy-sqlite.js` to remove `better-sqlite3`.
 *
 * Exposes the minimal surface used by the legacy proxy:
 *  - getActiveIntegrations()
 *  - getOrUpsertStubMember(tenantId, evoMemberId)
 *  - upsertProspect(tenantId, prospect)
 *  - upsertSale(tenantId, sale, internalMemberId)
 *  - upsertEntry(tenantId, entry, internalMemberId)
 *  - logSyncJob(tenantId, type, status, msg)
 *  - updateLastSync(integrationId)
 */

const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const ApiIntegration = require('../models/ApiIntegration');
const AccessLog = require('../models/AccessLog');
const Cliente = require('../models/Cliente');
const repositories = require('./repositories'); // reuse upsertVenta / upsertLead etc.

async function getActiveIntegrations() {
  const docs = await ApiIntegration.find({ status: 'active' }).lean();
  return docs.map(d => ({
    id: d._id?.toString(),
    tenant_id: d.tenantId,
    dns: d.dns,
    encrypted_token: d.encryptedToken,
    encryption_iv: d.encryptionIv,
    last_sync_at: d.lastSyncAt || null,
    status: d.status
  }));
}

async function getOrUpsertStubMember(tenantId, evoMemberId) {
  if (!evoMemberId) return null;
  const memberKey = String(evoMemberId);

  const doc = await Cliente.findOneAndUpdate(
    { idMember: memberKey, idBranch: tenantId },
    {
      $setOnInsert: {
        uniqueId: uuidv4(),
        idMember: memberKey,
        name: `EVO Member ${memberKey}`,
        idBranch: tenantId,
        source: 'evo',
        registrationDate: new Date()
      }
    },
    { upsert: true, new: true }
  );

  return doc?._id?.toString() || null;
}

async function upsertProspect(tenantId, prospect) {
  // Map EVO prospect -> internal Lead shape and reuse existing upsertLead
  try {
    const payload = {
      eventoId: tenantId,
      email: prospect.email || prospect.emailAddress || null,
      nombre: prospect.name || prospect.fullName || null,
      leadId: prospect.id || prospect.prospect_id || null,
      fuente: 'evo',
      data: prospect || {},
      syncedAt: new Date()
    };

    return await repositories.upsertLead(payload);
  } catch (err) {
    // bubble up
    throw err;
  }
}

async function upsertSale(tenantId, sale, internalMemberId) {
  try {
    const payload = {
      ventaId: sale.id || sale.idSale || sale.saleId || null,
      clienteId: internalMemberId || sale.memberInternalId || null,
      concepto: sale.description || sale.concept || sale.code || null,
      monto: Number.isFinite(Number(sale.value || sale.amount || sale.total)) ? Number(sale.value || sale.amount || sale.total) : 0,
      moneda: sale.currency || 'MXN',
      estatus: sale.status || (sale.state ? String(sale.state) : undefined),
      fecha: sale.saleDate || sale.date || sale.createdAt || null,
      eventoVentaId: sale.id || sale.code || null,
      fuente: 'evo',
      syncedAt: new Date()
    };

    return await repositories.upsertVenta(payload);
  } catch (err) {
    throw err;
  }
}

async function upsertEntry(tenantId, entry, internalMemberId) {
  try {
    const evoEntryId = String(entry.id || entry.entry_id || entry.evo_entry_id || entry.code || '');
    const accessTime = entry.accessTime || entry.time || entry.createdAt || null;

    const doc = await AccessLog.findOneAndUpdate(
      { tenantId: tenantId, evoEntryId: evoEntryId },
      {
        $set: {
          memberId: internalMemberId || null,
          accessTime: accessTime ? new Date(accessTime) : undefined,
          location: entry.location || entry.gym || null,
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return doc;
  } catch (err) {
    throw err;
  }
}

async function logSyncJob(tenantId, type, status, msg = null) {
  // Use existing createSyncLog shape (keeps compatibility with other code that
  // reads `sync_logs`). We save minimal useful info: fuente, estatus, cambios/error.
  const syncData = {
    fuente: 'EVO',
    estatus: status,
    errores: msg ? [msg] : [],
    cambios: { jobType: type },
    iniciado: new Date(),
    tenant_id: tenantId
  };

  // repositories.createSyncLog returns a normalized object
  if (typeof repositories.createSyncLog === 'function') {
    return await repositories.createSyncLog(syncData);
  }

  // fallback: insert directly
  const col = mongoose.connection.collection('sync_logs');
  const now = new Date();
  const payload = Object.assign({ sync_id: uuidv4(), createdAt: now }, syncData);
  const result = await col.insertOne(payload);
  return Object.assign({}, payload, { id: result.insertedId.toString() });
}

async function updateLastSync(integrationId) {
  if (!integrationId) return null;
  // integrationId is expected to be the Mongo _id string
  try {
    const updated = await ApiIntegration.findByIdAndUpdate(integrationId, { $set: { lastSyncAt: new Date() } }, { new: true }).lean();
    return updated || null;
  } catch (err) {
    // try to update by tenantId as fallback
    await ApiIntegration.updateOne({ tenantId: integrationId }, { $set: { lastSyncAt: new Date() } });
    return null;
  }
}

// ------------------------- Locking (DB-backed) ------------------------------
// Provides an atomic, persistent lock so we don't rely on process-local
// GLOBAL_SYNC_LOCK. Uses a single document in `locks` collection.
async function acquireSyncLock(ttlMs = 5 * 60 * 1000) {
  // Always use the DB-backed lock (call findOneAndUpdate) to provide a
  // consistent, observable lock behavior for production and tests.
  const col = mongoose.connection.collection('locks');
  const now = new Date();
  const expiresAt = new Date(Date.now() + ttlMs);

  const filter = {
    _id: 'sync_lock',
    $or: [
      { locked: { $exists: false } },
      { locked: false },
      { expiresAt: { $lt: now } }
    ]
  };

  const update = {
    $set: { locked: true, owner: uuidv4(), acquiredAt: now, expiresAt }
  };

  const opts = { upsert: true, returnDocument: 'after' };
  const res = await col.findOneAndUpdate(filter, update, opts);
  return !!(res && res.value && res.value.locked === true);
}

async function releaseSyncLock() {
  const col = mongoose.connection.collection('locks');
  await col.updateOne({ _id: 'sync_lock' }, { $set: { locked: false }, $unset: { owner: 1, acquiredAt: 1, expiresAt: 1 } });
  return true;
}

module.exports = {
  getActiveIntegrations,
  getOrUpsertStubMember,
  upsertProspect,
  upsertSale,
  upsertEntry,
  logSyncJob,
  updateLastSync,
  acquireSyncLock,
  releaseSyncLock
};
