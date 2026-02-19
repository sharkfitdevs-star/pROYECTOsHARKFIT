const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');
const Lead = require('../models/Lead');

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
async function createSyncLog(data = {}) { const col = mongoose.connection.collection('sync_logs'); const now = new Date(); const payload = { sync_id: data.syncId || uuidv4(), fuente: data.fuente || data.source || 'API', estatus: data.estatus || data.status || 'Procesando', registos_procesados: data.registosProcesados || data.processed || 0, registos_inseridos: data.registosInseridos || data.created || 0, registos_actualizados: data.registosActualizados || data.updated || 0, registos_fallidos: data.registosFallidos || data.failed || 0, errores: JSON.stringify(data.errores || []), iniciado: toIso(data.iniciado || now), finalizado: toIso(data.finalizado || null), duracion_ms: data.duracionMs || data.duration || null, cambios: JSON.stringify(data.cambios || {}), proximo_intento: toIso(data.proximoIntento || null), reintento_count: data.reintentoCount || 0, createdAt: now }; const result = await col.insertOne(payload); return Object.assign({}, payload, { id: result.insertedId.toString(), syncId: payload.sync_id }); }
async function updateSyncLog(syncId, updates = {}) { const col = mongoose.connection.collection('sync_logs'); const query = { $or: [{ sync_id: syncId }] }; if (/^[0-9a-fA-F]{24}$/.test(syncId)) { try { query.$or.push({ _id: new mongoose.Types.ObjectId(syncId) }); } catch (e) {} } const doc = await col.findOne(query); if (!doc) return null; const payload = {}; if (updates.estatus !== undefined) payload.estatus = updates.estatus; if (updates.registosProcesados !== undefined) payload.registos_procesados = updates.registosProcesados; if (updates.registosInseridos !== undefined) payload.registos_inseridos = updates.registosInseridos; if (updates.registosActualizados !== undefined) payload.registos_actualizados = updates.registosActualizados; if (updates.registosFallidos !== undefined) payload.registos_fallidos = updates.registosFallidos; if (updates.errores !== undefined) payload.errores = JSON.stringify(updates.errores); if (updates.finalizado !== undefined) payload.finalizado = toIso(updates.finalizado); if (updates.duracionMs !== undefined) payload.duracion_ms = updates.duracionMs; if (updates.cambios !== undefined) payload.cambios = JSON.stringify(updates.cambios); if (updates.proximoIntento !== undefined) payload.proximo_intento = toIso(updates.proximoIntento); if (updates.reintentoCount !== undefined) payload.reintento_count = updates.reintentoCount; await col.updateOne({ _id: doc._id }, { $set: payload }); return await col.findOne({ _id: doc._id }); }
async function findSyncLogById(syncId) { const col = mongoose.connection.collection('sync_logs'); const query = { $or: [{ sync_id: syncId }] }; if (/^[0-9a-fA-F]{24}$/.test(syncId)) { try { query.$or.push({ _id: new mongoose.Types.ObjectId(syncId) }); } catch (e) {} } const row = await col.findOne(query); if (!row) return null; return { id: row._id?.toString(), syncId: row.sync_id, fuente: row.fuente, estatus: row.estatus, registosProcesados: row.registos_procesados, registosInseridos: row.registos_inseridos, registosActualizados: row.registos_actualizados, registosFallidos: row.registos_fallidos, errores: parseJson(row.errores, []), iniciado: row.iniciado, finalizado: row.finalizado, duracionMs: row.duracion_ms, cambios: parseJson(row.cambios, {}), proximoIntento: row.proximo_intento, reintentoCount: row.reintento_count }; }

async function getLastSuccessfulSyncBySource(fuente) {
  const col = mongoose.connection.collection('sync_logs');
  const row = await col.find({ fuente, estatus: 'Exitoso' }).sort({ finalizado: -1 }).limit(1).next();
  return row ? { syncId: row.sync_id, finalizado: row.finalizado } : null;
}

// CLIENTE / VENTA / LEAD - Mongoose implementations
async function findClienteByIdentifiers({ eventoId, email, rfc, clienteId }) { const or = []; if (eventoId) or.push({ idBranch: eventoId }); if (email) or.push({ email: (email || '').toLowerCase() }); if (rfc) or.push({ cpf: rfc }); if (clienteId) or.push({ idMember: clienteId }, { externalId: clienteId }); if (!or.length) return null; const doc = await Cliente.findOne({ $or: or }).lean(); return mapCliente(doc); }
async function findClienteByEmail(email) { if (!email) return null; const doc = await Cliente.findOne({ email: email.toLowerCase() }).lean(); return mapCliente(doc); }
async function upsertCliente(data) { const existing = await findClienteByIdentifiers({ eventoId: data.eventoId, email: data.email, rfc: data.rfc, clienteId: data.clienteId }); const now = new Date(); const docData = { idMember: data.clienteId || existing?.clienteId || uuidv4(), name: data.nombre || existing?.nombre || data.name || null, email: data.email ? data.email.toLowerCase() : existing?.email || null, cellPhone: data.telefono || existing?.telefono || null, branchName: data.empresa || existing?.empresa || null, cpf: data.rfc || existing?.rfc || null, status: data.estado || existing?.estado || null, source: data.fuente || existing?.fuente || 'import', membershipStatus: data.membresia?.estado || existing?.membresiaEstado || null, membershipEndDate: data.membresia?.fechaVencimiento ? new Date(data.membresia.fechaVencimiento) : existing?.membresiaFechaVencimiento || null, customFields: data.data || existing?.data || {}, lastSyncAt: data.syncedAt ? new Date(data.syncedAt) : now }; if (existing && existing.id) { const updated = await Cliente.findByIdAndUpdate(existing.id, { $set: docData }, { new: true, upsert: false }).lean(); return { id: updated._id.toString(), updated: true, inserted: false }; } const created = await Cliente.create(docData); return { id: created._id.toString(), updated: false, inserted: true }; }
async function findVentaByIdentifiers({ eventoVentaId, ventaId }) { const or = []; if (eventoVentaId) or.push({ externalId: eventoVentaId }); if (ventaId) or.push({ idSale: ventaId }, { externalId: ventaId }); if (!or.length) return null; const doc = await Venta.findOne({ $or: or }).lean(); return mapVenta(doc); }
async function upsertVenta(data) {
  const existing = await findVentaByIdentifiers({ eventoVentaId: data.eventoVentaId, ventaId: data.ventaId });
  const now = new Date();

  const rawStatus = String(data.estatus || existing?.estatus || 'Completada').trim();
  const s = rawStatus.toLowerCase();
  let normalizedPaymentStatus;

  if (['completada','pagada','paid','completed'].includes(s)) normalizedPaymentStatus = 'pagado';
  else if (['parcial','partial'].includes(s)) normalizedPaymentStatus = 'parcial';
  else if (['cancelada','cancelado','cancelled'].includes(s)) normalizedPaymentStatus = 'cancelado';
  else if (['reembolsado','refunded'].includes(s)) normalizedPaymentStatus = 'reembolsado';
  else normalizedPaymentStatus = 'pendiente';

  const saleTypeValue = data.saleType || existing?.saleType || 'plan';

  const docData = {
    idSale: data.ventaId || existing?.ventaId || uuidv4(),
    idMember: data.clienteId || existing?.clienteId || null,
    description: data.concepto || existing?.concepto || null,
    amount: Number(data.monto) || 0,
    totalAmount: Number(data.monto) || 0,
    currency: data.moneda || existing?.moneda || 'MXN',
    paymentStatus: normalizedPaymentStatus,
    saleType: saleTypeValue,
    saleDate: data.fecha ? new Date(data.fecha) : now,
    source: data.fuente || existing?.fuente || 'import',
    externalId: data.eventoVentaId || null,
    lastSyncAt: new Date()
  };

  if (existing && existing.id) {
    const updated = await Venta.findByIdAndUpdate(
      existing.id,
      { $set: docData },
      { new: true }
    ).lean();

    return { id: updated._id.toString(), updated: true, inserted: false };
  }

  const created = await Venta.create(docData);
  return { id: created._id.toString(), updated: false, inserted: true };
}
async function findLeadByIdentifiers({ eventoId, email, leadId }) { const or = []; if (eventoId) or.push({ eventoId }); if (email) or.push({ email: (email || '').toLowerCase() }); if (leadId) or.push({ leadId }); if (!or.length) return null; const LeadModel = mongoose.models.Lead || Lead; const doc = await LeadModel.findOne({ $or: or }).lean(); return mapLead(doc); }
async function upsertLead(data) { const existing = await findLeadByIdentifiers({ eventoId: data.eventoId, email: data.email, leadId: data.leadId }); const now = new Date(); const LeadModel = mongoose.models.Lead || Lead; const docData = { leadId: data.leadId || existing?.leadId || uuidv4(), eventoId: data.eventoId || existing?.eventoId || null, clienteId: data.clienteId || existing?.clienteId || null, nombre: data.nombre || existing?.nombre || null, email: data.email ? data.email.toLowerCase() : existing?.email || null, telefono: data.telefono || existing?.telefono || null, empresa: data.empresa || existing?.empresa || null, estatus: data.estatus || existing?.estatus || 'Nuevo', probabilidad: Number.isFinite(Number(data.probabilidad)) ? Number(data.probabilidad) : existing?.probabilidad || 0, leadScore: Number.isFinite(Number(data.leadScore)) ? Number(data.leadScore) : existing?.leadScore || 0, fuente: data.fuente || existing?.fuente || 'import', data: data.data || existing?.data || {}, syncedAt: data.syncedAt ? new Date(data.syncedAt) : now }; if (existing && existing.id) { const updated = await LeadModel.findByIdAndUpdate(existing.id, { $set: docData }, { new: true, upsert: false }).lean(); return { id: updated._id.toString(), updated: true, inserted: false }; } const created = await LeadModel.create(docData); return { id: created._id.toString(), updated: false, inserted: true }; }

// Helper para mapear documento `sync_logs` (forma compatible con el repo legacy)
function mapSyncLog(row) {
  if (!row) return null;
  return {
    id: row._id?.toString(),
    syncId: row.sync_id || row._id?.toString(),
    fuente: row.fuente,
    estatus: row.estatus,
    registosProcesados: row.registos_procesados,
    registosInseridos: row.registos_inseridos,
    registosActualizados: row.registos_actualizados,
    registosFallidos: row.registos_fallidos,
    errores: parseJson(row.errores, []),
    iniciado: row.iniciado,
    finalizado: row.finalizado,
    duracionMs: row.duracion_ms,
    cambios: parseJson(row.cambios, {}),
    proximoIntento: row.proximo_intento,
    reintentoCount: row.reintento_count
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
  const rows = await col.find({ fuente: { $in: ['Excel', 'CSV'] } }).sort({ iniciado: -1 }).limit(Number(limit)).toArray();
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
