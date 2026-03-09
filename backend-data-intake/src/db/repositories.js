const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');
const Lead = require('../models/Lead');

// SyncLog model might not be defined at startup; load lazily and guard
let SyncLog;
try {
  SyncLog = require('../models/MongoModels').SyncLog;
} catch (e) {
  // ignore: use raw collection fallback later
}

// Utilities
function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function parseJson(value, fallback) { try { return value ? JSON.parse(value) : fallback; } catch (e) { return fallback; } }

function mapCliente(doc) { if (!doc) return null; return { id: doc._id?.toString(), clienteId: doc.idMember || doc.externalId || null, eventoId: doc.idBranch || null, nombre: doc.name || null, email: doc.email || null, telefono: doc.cellPhone || doc.telefono || null, empresa: doc.branchName || null, rfc: doc.cpf || null, estado: doc.status || null, fuente: doc.source || 'mongodb', membresiaEstado: doc.membershipStatus || null, membresiaFechaVencimiento: doc.membershipEndDate || null, data: doc.customFields || {}, createdAt: doc.registrationDate || doc.createdAt || null, updatedAt: doc.lastUpdate || doc.updatedAt || null, syncedAt: doc.lastSyncAt || null }; }
function mapVenta(doc) { if (!doc) return null; return { id: doc._id?.toString(), ventaId: doc.idSale || doc.externalId || null, eventoVentaId: doc.externalId || null, clienteId: doc.idMember || null, concepto: doc.description || doc.concepto || null, monto: Number.isFinite(Number(doc.amount || doc.totalAmount)) ? Number(doc.amount || doc.totalAmount) : 0, moneda: doc.currency || 'MXN', estatus: doc.paymentStatus || 'Completada', fecha: doc.saleDate || null, fuente: doc.source || 'mongodb', data: doc, createdAt: doc.createdAt || null, updatedAt: doc.updatedAt || null, syncedAt: doc.lastSyncAt || null }; }
function mapLead(doc) { if (!doc) return null; return { id: doc._id?.toString(), leadId: doc.leadId || null, eventoId: doc.eventoId || null, clienteId: doc.clienteId || null, nombre: doc.nombre || doc.name || null, email: doc.email || null, telefono: doc.telefono || doc.cellPhone || null, empresa: doc.empresa || null, estatus: doc.estatus || null, probabilidad: doc.probabilidad || doc.probability || 0, leadScore: doc.leadScore || 0, fuente: doc.fuente || 'mongodb', data: doc.data || {}, createdAt: doc.createdAt || null, updatedAt: doc.updatedAt || null, syncedAt: doc.syncedAt || null }; }

// SYNC LOGS (Mongo)
async function createSyncLog(data = {}) {
  // pick syncId upfront so every return path can include it
  const syncId = data.syncId || uuidv4();

  // guard: don't try when the connection isn't open
  if (mongoose.connection.readyState !== 1) {
    return { syncId, ok: false, exito: false, error: 'DB_NOT_READY' };
  }

  const now = new Date();

  // logging convenience when id was generated locally
  if (!data.syncId) {
    logger.debug('generated syncId for createSyncLog', { syncId });
  }

  const payload = {
    sync_id: syncId,
    entidad: data.entidad || data.entity || null,
    fuente: data.fuente || data.source || 'API',
    estatus: data.estatus || data.status || 'Procesando',
    registos_procesados: data.registosProcesados || data.processed || 0,
    registos_inseridos: data.registosInseridos || data.created || 0,
    registos_actualizados: data.registosActualizados || data.updated || 0,
    registos_fallidos: data.registosFallidos || data.failed || 0,
    errores: JSON.stringify(data.errores || []),
    // additional fields for detailed import history
    total_rows: data.totalRows || data.registosProcesados || 0,
    inserted_count: data.insertedCount || data.registosInseridos || 0,
    updated_count: data.updatedCount || data.registosActualizados || 0,
    skipped_count: data.skippedCount || 0,
    invalid_count: data.invalidCount || 0,
    warnings: JSON.stringify(data.warnings || []),
    mapping_used: JSON.stringify(data.mappingUsed || {}),
    detected_headers: JSON.stringify(data.detectedHeaders || []),
    sheet_name: data.sheetName || null,
    file_meta: JSON.stringify(data.fileMeta || {}),
    error_message: data.errorMessage || null,
    error_code: data.errorCode || null,
    error_stack: data.errorStack ? data.errorStack.toString().slice(0, 2000) : null,
    iniciado: toIso(data.iniciado || now),
    finalizado: toIso(data.finalizado || null),
    duracion_ms: data.duracionMs || data.duration || null,
    cambios: JSON.stringify(data.cambios || {}),
    proximo_intento: toIso(data.proximoIntento || null),
    reintento_count: data.reintentoCount || 0,
    createdAt: now
  };

  // split payload into $set and $setOnInsert for mongoose upsert
  const setPayload = Object.assign({}, payload);
  delete setPayload.sync_id;
  delete setPayload.createdAt;
  const setOnInsert = { sync_id: syncId, createdAt: now };

  // choose update strategy depending on model availability
  if (SyncLog && typeof SyncLog.findOneAndUpdate === 'function') {
    try {
      const doc = await SyncLog.findOneAndUpdate(
        { sync_id: syncId },
        { $set: setPayload, $setOnInsert: setOnInsert },
        { new: true, upsert: true, setDefaultsOnInsert: true, lean: true }
      );

      if (!doc) {
        return { syncId, ok: false, exito: false, error: 'SYNCLOG_WRITE_FAILED' };
      }

      return Object.assign({}, payload, { id: doc._id?.toString(), syncId: doc.sync_id });
    } catch (err) {
      // log and swallow any errors so import/sync flows continue
      logger.warn('syncLog failed but import continues', { syncId, err: err.message });
      if (err && err.code === 11000) {
        const existing = await SyncLog.findOne({ sync_id: syncId }).lean().catch(() => null);
        if (existing) {
          return Object.assign({}, payload, { id: existing._id?.toString(), syncId: existing.sync_id });
        }
      }
      return { syncId, ok: false, exito: false, error: 'SYNCLOG_WRITE_FAILED' };
    }
  } else {
    // fallback to raw collection operation
    try {
      const col = mongoose.connection.collection('sync_logs');
      const result = await col.findOneAndUpdate(
        { sync_id: syncId },
        { $set: setPayload, $setOnInsert: setOnInsert },
        {
          upsert: true,
          returnDocument: 'after',   // driver v4+
          returnOriginal: false      // driver v3 (compat)
        }
      );
      const doc = result?.value;
      if (!doc) {
        // compat: algunos drivers devuelven value=null en upsert (pre-image)
        const existing = await col.findOne({ sync_id: syncId });
        if (!existing) {
          return { syncId, ok: false, exito: false, error: 'SYNCLOG_WRITE_FAILED' };
        }
        return Object.assign({}, payload, { id: existing._id?.toString(), syncId: existing.sync_id });
      }
      return Object.assign({}, payload, { id: doc._id?.toString(), syncId: doc.sync_id });
    } catch (err) {
      // log and swallow so the caller can continue
      logger.warn('syncLog failed but import continues', { syncId, err: err.message });
      if (err && err.code === 11000) {
        const existing = await mongoose.connection.collection('sync_logs').findOne({ sync_id: syncId });
        if (existing) {
          return Object.assign({}, payload, { id: existing._id?.toString(), syncId: existing.sync_id });
        }
      }
      return { syncId, ok: false, exito: false, error: 'SYNCLOG_WRITE_FAILED' };
    }
  }
}
async function updateSyncLog(syncId, updates = {}) { const col = mongoose.connection.collection('sync_logs'); const query = { $or: [{ sync_id: syncId }] }; if (/^[0-9a-fA-F]{24}$/.test(syncId)) { try { query.$or.push({ _id: new mongoose.Types.ObjectId(syncId) }); } catch (e) {} } const doc = await col.findOne(query); if (!doc) return null; const payload = {}; if (updates.entidad !== undefined) payload.entidad = updates.entidad; if (updates.estatus !== undefined) payload.estatus = updates.estatus; if (updates.registosProcesados !== undefined) payload.registos_procesados = updates.registosProcesados; if (updates.registosInseridos !== undefined) payload.registos_inseridos = updates.registosInseridos; if (updates.registosActualizados !== undefined) payload.registos_actualizados = updates.registosActualizados;
    if (updates.updatedCount !== undefined) payload.updated_count = updates.updatedCount;
    if (updates.registosFallidos !== undefined) payload.registos_fallidos = updates.registosFallidos; if (updates.errores !== undefined) payload.errores = JSON.stringify(updates.errores);
    if (updates.totalRows !== undefined) payload.total_rows = updates.totalRows;
    if (updates.insertedCount !== undefined) payload.inserted_count = updates.insertedCount;
    if (updates.skippedCount !== undefined) payload.skipped_count = updates.skippedCount;
    if (updates.invalidCount !== undefined) payload.invalid_count = updates.invalidCount;
    if (updates.warnings !== undefined) payload.warnings = JSON.stringify(updates.warnings);
    if (updates.mappingUsed !== undefined) payload.mapping_used = JSON.stringify(updates.mappingUsed);
    if (updates.detectedHeaders !== undefined) payload.detected_headers = JSON.stringify(updates.detectedHeaders);
    if (updates.sheetName !== undefined) payload.sheet_name = updates.sheetName;
    if (updates.fileMeta !== undefined) payload.file_meta = JSON.stringify(updates.fileMeta);
    if (updates.errorMessage !== undefined) payload.error_message = updates.errorMessage;
    if (updates.errorCode !== undefined) payload.error_code = updates.errorCode;
    if (updates.errorStack !== undefined) payload.error_stack = updates.errorStack ? updates.errorStack.toString().slice(0,2000) : null;
    if (updates.finalizado !== undefined) payload.finalizado = toIso(updates.finalizado); if (updates.duracionMs !== undefined) payload.duracion_ms = updates.duracionMs; if (updates.cambios !== undefined) payload.cambios = JSON.stringify(updates.cambios); if (updates.proximoIntento !== undefined) payload.proximo_intento = toIso(updates.proximoIntento); if (updates.reintentoCount !== undefined) payload.reintento_count = updates.reintentoCount; await col.updateOne({ _id: doc._id }, { $set: payload }); return await col.findOne({ _id: doc._id }); }
async function findSyncLogById(syncId) { const col = mongoose.connection.collection('sync_logs'); const query = { $or: [{ sync_id: syncId }] }; if (/^[0-9a-fA-F]{24}$/.test(syncId)) { try { query.$or.push({ _id: new mongoose.Types.ObjectId(syncId) }); } catch (e) {} } const row = await col.findOne(query); if (!row) return null; return { id: row._id?.toString(), syncId: row.sync_id, fuente: row.fuente, estatus: row.estatus, registosProcesados: row.registos_procesados, registosInseridos: row.registos_inseridos, registosActualizados: row.registos_actualizados, registosFallidos: row.registos_fallidos, errores: parseJson(row.errores, []), iniciado: row.iniciado, finalizado: row.finalizado, duracionMs: row.duracion_ms, cambios: parseJson(row.cambios, {}), proximoIntento: row.proximo_intento, reintentoCount: row.reintento_count }; }

async function getLastSuccessfulSyncBySource(fuente) {
  const col = mongoose.connection.collection('sync_logs');
  const row = await col.find({ fuente, estatus: 'Exitoso' }).sort({ finalizado: -1 }).limit(1).next();
  return row ? { syncId: row.sync_id, finalizado: row.finalizado } : null;
}

// CLIENTE / VENTA / LEAD - Mongoose implementations
async function findClienteByIdentifiers({ eventoId, email, rfc, clienteId }) { const or = []; if (eventoId) or.push({ idBranch: eventoId }); if (email) or.push({ email: (email || '').toLowerCase() }); if (rfc) or.push({ cpf: rfc }); if (clienteId) or.push({ idMember: clienteId }, { externalId: clienteId }); if (!or.length) return null; const doc = await Cliente.findOne({ $or }).lean(); return mapCliente(doc); }
async function findClienteByEmail(email) { if (!email) return null; const doc = await Cliente.findOne({ email: email.toLowerCase() }).lean(); return mapCliente(doc); }
async function upsertCliente(data) { const existing = await findClienteByIdentifiers({ eventoId: data.eventoId, email: data.email, rfc: data.rfc, clienteId: data.clienteId }); const now = new Date(); const docData = { idMember: data.clienteId || existing?.clienteId || uuidv4(), name: data.nombre || existing?.nombre || data.name || null, email: data.email ? data.email.toLowerCase() : existing?.email || null, cellPhone: data.telefono || existing?.telefono || null, branchName: data.empresa || existing?.empresa || null, cpf: data.rfc || existing?.rfc || null, status: data.estado || existing?.estado || null, source: data.fuente || existing?.fuente || 'import', membershipStatus: data.membresia?.estado || existing?.membresiaEstado || null, membershipEndDate: data.membresia?.fechaVencimiento ? new Date(data.membresia.fechaVencimiento) : existing?.membresiaFechaVencimiento || null, customFields: data.data || existing?.data || {}, lastSyncAt: data.syncedAt ? new Date(data.syncedAt) : now }; if (existing && existing.id) { const updated = await Cliente.findByIdAndUpdate(existing.id, { $set: docData }, { new: true, upsert: false }).lean(); return { id: updated._id.toString(), updated: true, inserted: false }; } const created = await Cliente.create(docData); return { id: created._id.toString(), updated: false, inserted: true }; }
async function findVentaByIdentifiers({ eventoVentaId, ventaId }) { const or = []; if (eventoVentaId) or.push({ externalId: eventoVentaId }); if (ventaId) or.push({ idSale: ventaId }, { externalId: ventaId }); if (!or.length) return null; const doc = await Venta.findOne({ $or }).lean(); return mapVenta(doc); }
async function upsertVenta(data) { const existing = await findVentaByIdentifiers({ eventoVentaId: data.eventoVentaId, ventaId: data.ventaId }); const now = new Date(); const docData = {
    idSale: data.ventaId || data.idSale || existing?.idSale || uuidv4(),
    idMember: data.clienteId || data.idMember || existing?.idMember || null,
    memberName: data.memberName || data.nombreCliente || existing?.memberName || null,
    description: data.concepto || data.description || data.planName || existing?.description || null,
    amount: Number.isFinite(Number(data.amount || data.monto)) ? Number(data.amount || data.monto) : (existing?.amount || 0),
    totalAmount: Number.isFinite(Number(data.totalAmount || data.monto)) ? Number(data.totalAmount || data.monto) : (existing?.totalAmount || 0),
    discount: Number.isFinite(Number(data.discount)) ? Number(data.discount) : (existing?.discount || 0),
    currency: data.moneda || data.currency || existing?.currency || 'MXN',
    paymentStatus: data.paymentStatus || data.estatus || existing?.paymentStatus || 'Pendiente',
    employeeName: data.employeeName || data.vendedor || existing?.employeeName || null,
    branchName: data.branchName || data.sede || existing?.branchName || null,
    planName: data.planName || data.plan || existing?.planName || null,
    saleType: data.saleType || data.tipo || existing?.saleType || null,
    saleDate: data.saleDate ? new Date(data.saleDate) : (data.fecha ? new Date(data.fecha) : (existing?.saleDate || now)),
    dueDate: data.dueDate ? new Date(data.dueDate) : (existing?.dueDate || null),
    cellPhone: data.cellPhone || data.whatsapp || existing?.cellPhone || null,
    source: data.fuente || data.source || existing?.source || 'import',
    externalId: data.eventoVentaId || data.externalId || existing?.externalId || null,
    lastSyncAt: data.syncedAt ? new Date(data.syncedAt) : now
  }; if (existing && existing.id) { const updated = await Venta.findByIdAndUpdate(existing.id, { $set: docData }, { new: true, upsert: false }).lean(); return { id: updated._id.toString(), updated: true, inserted: false }; } const created = await Venta.create(docData); return { id: created._id.toString(), updated: false, inserted: true }; }
async function findLeadByIdentifiers({ eventoId, email, leadId }) { const or = []; if (eventoId) or.push({ eventoId }); if (email) or.push({ email: (email || '').toLowerCase() }); if (leadId) or.push({ leadId }); if (!or.length) return null; const LeadModel = mongoose.models.Lead || Lead; const doc = await LeadModel.findOne({ $or }).lean(); return mapLead(doc); }
async function upsertLead(data) { const existing = await findLeadByIdentifiers({ eventoId: data.eventoId, email: data.email, leadId: data.leadId }); const now = new Date(); const LeadModel = mongoose.models.Lead || Lead; const docData = { leadId: data.leadId || existing?.leadId || uuidv4(), eventoId: data.eventoId || existing?.eventoId || null, clienteId: data.clienteId || existing?.clienteId || null, nombre: data.nombre || existing?.nombre || null, email: data.email ? data.email.toLowerCase() : existing?.email || null, telefono: data.telefono || existing?.telefono || null, empresa: data.empresa || existing?.empresa || null, estatus: data.estatus || existing?.estatus || 'Nuevo', probabilidad: Number.isFinite(Number(data.probabilidad)) ? Number(data.probabilidad) : existing?.probabilidad || 0, leadScore: Number.isFinite(Number(data.leadScore)) ? Number(data.leadScore) : existing?.leadScore || 0, fuente: data.fuente || existing?.fuente || 'import', data: data.data || existing?.data || {}, syncedAt: data.syncedAt ? new Date(data.syncedAt) : now }; if (existing && existing.id) { const updated = await LeadModel.findByIdAndUpdate(existing.id, { $set: docData }, { new: true, upsert: false }).lean(); return { id: updated._id.toString(), updated: true, inserted: false }; } const created = await LeadModel.create(docData); return { id: created._id.toString(), updated: false, inserted: true }; }

// Helper para mapear documento `sync_logs` (forma compatible con el repo legacy)
function mapSyncLog(doc) {
  if (!doc) return null;
  const safeJson = (v, fallback) => {
    try { return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  };

  return {
    id: doc._id?.toString() || null,
    syncId: doc.sync_id || doc.syncId || null,
    fuente: doc.fuente || doc.source || null,
    entidad: doc.entidad || doc.entity || null,
    estatus: doc.estatus || doc.estado || doc.status || null,
    iniciado: doc.iniciado || doc.iniciado_en || doc.createdAt || null,
    finalizado: doc.finalizado || doc.completado_en || null,
    totalRows: doc.total_rows || doc.registos_procesados || 0,
    insertedCount: doc.inserted_count || doc.registos_inseridos || 0,
    updatedCount: doc.updated_count || doc.registos_actualizados || 0,
    skippedCount: doc.skipped_count || 0,
    invalidCount: doc.invalid_count || 0,
    errorMessage: doc.error_message || null,
    errorCode: doc.error_code || null,
    warnings: safeJson(doc.warnings, []),
    mappingUsed: safeJson(doc.mapping_used, {}),
    detectedHeaders: safeJson(doc.detected_headers, []),
    sheetName: doc.sheet_name || null,
    fileMeta: safeJson(doc.file_meta, {}),

    // legacy/optional fields retained
    registosProcesados: doc.registos_procesados,
    registosInseridos: doc.registos_inseridos,
    registosActualizados: doc.registos_actualizados,
    registosFallidos: doc.registos_fallidos,
    errorStack: doc.error_stack,
    errores: safeJson(doc.errores, []),
    duracionMs: doc.duracion_ms,
    cambios: safeJson(doc.cambios, {}),
    proximoIntento: doc.proximo_intento,
    reintentoCount: doc.reintento_count
  };
}

async function listSyncLogs({ sourceId, desde, hasta, limit = 20 } = {}) {
  const col = mongoose.connection.collection('sync_logs');
  const query = {};
  if (sourceId) query.fuente = sourceId;
  if (desde || hasta) query.iniciado = {};
  if (desde) query.iniciado.$gte = toIso(desde);
  if (hasta) query.iniciado.$lte = toIso(hasta);

  const rows = await col.find(query).sort({ iniciado: -1 }).limit(Number(limit)).toArray();
  return rows.map(mapSyncLog);
}

async function listImportHistory(limit = 50) {
  const col = mongoose.connection.collection('sync_logs');
  if (!col || typeof col.find !== 'function') {
    return [];
  }
  // buscar por fuente Excel/CSV/Preview O por entidad clientes/ventas/leads
  const rows = await col.find({
    $or: [
      { fuente: { $in: ['Excel', 'CSV', 'Preview'] } },
      { entidad: { $in: ['clientes', 'ventas', 'leads'] } }
    ]
  })
  .sort({ iniciado: -1, createdAt: -1 })
  .limit(Number(limit))
  .toArray();
  return rows.map(mapSyncLog);
}

module.exports = {
  findClienteByIdentifiers,
  findClienteByEmail,
  upsertCliente,
  findVentaByIdentifiers,
  upsertVenta,
  findLeadByIdentifiers,
  upsertLead,
  createSyncLog,
  updateSyncLog,
  getLastSuccessfulSyncBySource,
  findSyncLogById,
  listSyncLogs,
  listImportHistory,
  // re-export idempotency helpers from MongoModels (used by workers)
  checkWebhookIdempotency: require('../models/MongoModels').queries.checkWebhookIdempotency,
  markWebhookProcessed: require('../models/MongoModels').queries.markWebhookProcessed
};
