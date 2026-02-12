const { v4: uuidv4 } = require('uuid');
const { db } = require('./sqlite');

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function buildOrWhere(conditions) {
  const clauses = [];
  const params = [];

  conditions.forEach((condition) => {
    if (condition.value !== undefined && condition.value !== null && condition.value !== '') {
      clauses.push(`${condition.column} = ?`);
      params.push(condition.value);
    }
  });

  if (!clauses.length) {
    return null;
  }

  return {
    where: clauses.join(' OR '),
    params
  };
}

function mapCliente(row) {
  if (!row) return null;
  return {
    id: row.id,
    clienteId: row.cliente_id,
    eventoId: row.evento_id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    empresa: row.empresa,
    rfc: row.rfc,
    estado: row.estado,
    fuente: row.fuente,
    membresiaEstado: row.membresia_estado,
    membresiaFechaVencimiento: row.membresia_fecha_vencimiento,
    data: parseJson(row.data_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at
  };
}

function mapVenta(row) {
  if (!row) return null;
  return {
    id: row.id,
    ventaId: row.venta_id,
    eventoVentaId: row.evento_venta_id,
    clienteId: row.cliente_id,
    concepto: row.concepto,
    monto: row.monto,
    moneda: row.moneda,
    estatus: row.estatus,
    fecha: row.fecha,
    fuente: row.fuente,
    data: parseJson(row.data_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at
  };
}

function mapLead(row) {
  if (!row) return null;
  return {
    id: row.id,
    leadId: row.lead_id,
    eventoId: row.evento_id,
    clienteId: row.cliente_id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    empresa: row.empresa,
    estatus: row.estatus,
    probabilidad: row.probabilidad,
    leadScore: row.lead_score,
    fuente: row.fuente,
    data: parseJson(row.data_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at
  };
}

function mapSyncLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    syncId: row.sync_id,
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

function findClienteByIdentifiers({ eventoId, email, rfc, clienteId }) {
  const whereClause = buildOrWhere([
    { column: 'evento_id', value: eventoId },
    { column: 'email', value: email ? email.toLowerCase() : null },
    { column: 'rfc', value: rfc },
    { column: 'cliente_id', value: clienteId }
  ]);

  if (!whereClause) return null;

  const row = db
    .prepare(`SELECT * FROM clientes WHERE ${whereClause.where} LIMIT 1`)
    .get(...whereClause.params);

  return mapCliente(row);
}

function findClienteByEmail(email) {
  if (!email) return null;
  const row = db.prepare('SELECT * FROM clientes WHERE email = ? LIMIT 1').get(email.toLowerCase());
  return mapCliente(row);
}

function upsertCliente(data) {
  const existing = findClienteByIdentifiers({
    eventoId: data.eventoId,
    email: data.email,
    rfc: data.rfc,
    clienteId: data.clienteId
  });

  const now = new Date();
  const payload = {
    id: existing?.id || uuidv4(),
    cliente_id: data.clienteId || existing?.clienteId || uuidv4(),
    evento_id: data.eventoId || existing?.eventoId || null,
    nombre: data.nombre || existing?.nombre || null,
    email: data.email ? data.email.toLowerCase() : existing?.email || null,
    telefono: data.telefono || existing?.telefono || null,
    empresa: data.empresa || existing?.empresa || null,
    rfc: data.rfc || existing?.rfc || null,
    estado: data.estado || existing?.estado || null,
    fuente: data.fuente || existing?.fuente || null,
    membresia_estado: data.membresia?.estado || existing?.membresiaEstado || null,
    membresia_fecha_vencimiento: toIso(data.membresia?.fechaVencimiento) || existing?.membresiaFechaVencimiento || null,
    data_json: JSON.stringify(data),
    created_at: existing?.createdAt || toIso(now),
    updated_at: toIso(now),
    synced_at: toIso(data.syncedAt || now)
  };

  if (existing) {
    db.prepare(`
      UPDATE clientes SET
        cliente_id = @cliente_id,
        evento_id = @evento_id,
        nombre = @nombre,
        email = @email,
        telefono = @telefono,
        empresa = @empresa,
        rfc = @rfc,
        estado = @estado,
        fuente = @fuente,
        membresia_estado = @membresia_estado,
        membresia_fecha_vencimiento = @membresia_fecha_vencimiento,
        data_json = @data_json,
        updated_at = @updated_at,
        synced_at = @synced_at
      WHERE id = @id
    `).run(payload);
    return { id: payload.id, updated: true, inserted: false };
  }

  db.prepare(`
    INSERT INTO clientes (
      id, cliente_id, evento_id, nombre, email, telefono, empresa, rfc, estado,
      fuente, membresia_estado, membresia_fecha_vencimiento, data_json,
      created_at, updated_at, synced_at
    ) VALUES (
      @id, @cliente_id, @evento_id, @nombre, @email, @telefono, @empresa, @rfc, @estado,
      @fuente, @membresia_estado, @membresia_fecha_vencimiento, @data_json,
      @created_at, @updated_at, @synced_at
    )
  `).run(payload);

  return { id: payload.id, updated: false, inserted: true };
}

function findVentaByIdentifiers({ eventoVentaId, ventaId }) {
  const whereClause = buildOrWhere([
    { column: 'evento_venta_id', value: eventoVentaId },
    { column: 'venta_id', value: ventaId }
  ]);

  if (!whereClause) return null;

  const row = db
    .prepare(`SELECT * FROM ventas WHERE ${whereClause.where} LIMIT 1`)
    .get(...whereClause.params);

  return mapVenta(row);
}

function upsertVenta(data) {
  const existing = findVentaByIdentifiers({
    eventoVentaId: data.eventoVentaId,
    ventaId: data.ventaId
  });

  const now = new Date();
  const payload = {
    id: existing?.id || uuidv4(),
    venta_id: data.ventaId || existing?.ventaId || uuidv4(),
    evento_venta_id: data.eventoVentaId || existing?.eventoVentaId || null,
    cliente_id: data.clienteId || existing?.clienteId || null,
    concepto: data.concepto || existing?.concepto || null,
    monto: Number.isFinite(Number(data.monto)) ? Number(data.monto) : existing?.monto || 0,
    moneda: data.moneda || existing?.moneda || 'MXN',
    estatus: data.estatus || existing?.estatus || 'Completada',
    fecha: toIso(data.fecha || existing?.fecha || now),
    fuente: data.fuente || existing?.fuente || null,
    data_json: JSON.stringify(data),
    created_at: existing?.createdAt || toIso(now),
    updated_at: toIso(now),
    synced_at: toIso(data.syncedAt || now)
  };

  if (existing) {
    db.prepare(`
      UPDATE ventas SET
        venta_id = @venta_id,
        evento_venta_id = @evento_venta_id,
        cliente_id = @cliente_id,
        concepto = @concepto,
        monto = @monto,
        moneda = @moneda,
        estatus = @estatus,
        fecha = @fecha,
        fuente = @fuente,
        data_json = @data_json,
        updated_at = @updated_at,
        synced_at = @synced_at
      WHERE id = @id
    `).run(payload);
    return { id: payload.id, updated: true, inserted: false };
  }

  db.prepare(`
    INSERT INTO ventas (
      id, venta_id, evento_venta_id, cliente_id, concepto, monto, moneda,
      estatus, fecha, fuente, data_json, created_at, updated_at, synced_at
    ) VALUES (
      @id, @venta_id, @evento_venta_id, @cliente_id, @concepto, @monto, @moneda,
      @estatus, @fecha, @fuente, @data_json, @created_at, @updated_at, @synced_at
    )
  `).run(payload);

  return { id: payload.id, updated: false, inserted: true };
}

function findLeadByIdentifiers({ eventoId, email, leadId }) {
  const whereClause = buildOrWhere([
    { column: 'evento_id', value: eventoId },
    { column: 'email', value: email ? email.toLowerCase() : null },
    { column: 'lead_id', value: leadId }
  ]);

  if (!whereClause) return null;

  const row = db
    .prepare(`SELECT * FROM leads WHERE ${whereClause.where} LIMIT 1`)
    .get(...whereClause.params);

  return mapLead(row);
}

function upsertLead(data) {
  const existing = findLeadByIdentifiers({
    eventoId: data.eventoId,
    email: data.email,
    leadId: data.leadId
  });

  const now = new Date();
  const payload = {
    id: existing?.id || uuidv4(),
    lead_id: data.leadId || existing?.leadId || uuidv4(),
    evento_id: data.eventoId || existing?.eventoId || null,
    cliente_id: data.clienteId || existing?.clienteId || null,
    nombre: data.nombre || existing?.nombre || null,
    email: data.email ? data.email.toLowerCase() : existing?.email || null,
    telefono: data.telefono || existing?.telefono || null,
    empresa: data.empresa || existing?.empresa || null,
    estatus: data.estatus || existing?.estatus || 'Nuevo',
    probabilidad: Number.isFinite(Number(data.probabilidad)) ? Number(data.probabilidad) : existing?.probabilidad || 0,
    lead_score: Number.isFinite(Number(data.leadScore)) ? Number(data.leadScore) : existing?.leadScore || 0,
    fuente: data.fuente || existing?.fuente || null,
    data_json: JSON.stringify(data),
    created_at: existing?.createdAt || toIso(now),
    updated_at: toIso(now),
    synced_at: toIso(data.syncedAt || now)
  };

  if (existing) {
    db.prepare(`
      UPDATE leads SET
        lead_id = @lead_id,
        evento_id = @evento_id,
        cliente_id = @cliente_id,
        nombre = @nombre,
        email = @email,
        telefono = @telefono,
        empresa = @empresa,
        estatus = @estatus,
        probabilidad = @probabilidad,
        lead_score = @lead_score,
        fuente = @fuente,
        data_json = @data_json,
        updated_at = @updated_at,
        synced_at = @synced_at
      WHERE id = @id
    `).run(payload);
    return { id: payload.id, updated: true, inserted: false };
  }

  db.prepare(`
    INSERT INTO leads (
      id, lead_id, evento_id, cliente_id, nombre, email, telefono, empresa,
      estatus, probabilidad, lead_score, fuente, data_json, created_at,
      updated_at, synced_at
    ) VALUES (
      @id, @lead_id, @evento_id, @cliente_id, @nombre, @email, @telefono, @empresa,
      @estatus, @probabilidad, @lead_score, @fuente, @data_json, @created_at,
      @updated_at, @synced_at
    )
  `).run(payload);

  return { id: payload.id, updated: false, inserted: true };
}

function createSyncLog(data) {
  const now = new Date();
  const payload = {
    id: uuidv4(),
    sync_id: data.syncId || uuidv4(),
    fuente: data.fuente || 'API',
    estatus: data.estatus || 'Procesando',
    registos_procesados: data.registosProcesados || 0,
    registos_inseridos: data.registosInseridos || 0,
    registos_actualizados: data.registosActualizados || 0,
    registos_fallidos: data.registosFallidos || 0,
    errores: JSON.stringify(data.errores || []),
    iniciado: toIso(data.iniciado || now),
    finalizado: toIso(data.finalizado || null),
    duracion_ms: data.duracionMs || null,
    cambios: JSON.stringify(data.cambios || {}),
    proximo_intento: toIso(data.proximoIntento || null),
    reintento_count: data.reintentoCount || 0
  };

  db.prepare(`
    INSERT INTO sync_logs (
      id, sync_id, fuente, estatus, registos_procesados, registos_inseridos,
      registos_actualizados, registos_fallidos, errores, iniciado, finalizado,
      duracion_ms, cambios, proximo_intento, reintento_count
    ) VALUES (
      @id, @sync_id, @fuente, @estatus, @registos_procesados, @registos_inseridos,
      @registos_actualizados, @registos_fallidos, @errores, @iniciado, @finalizado,
      @duracion_ms, @cambios, @proximo_intento, @reintento_count
    )
  `).run(payload);

  return mapSyncLog(payload);
}

function updateSyncLog(syncId, updates) {
  const existing = findSyncLogById(syncId);
  if (!existing) return null;

  const payload = {
    sync_id: syncId,
    estatus: updates.estatus ?? existing.estatus,
    registos_procesados: updates.registosProcesados ?? existing.registosProcesados,
    registos_inseridos: updates.registosInseridos ?? existing.registosInseridos,
    registos_actualizados: updates.registosActualizados ?? existing.registosActualizados,
    registos_fallidos: updates.registosFallidos ?? existing.registosFallidos,
    errores: JSON.stringify(updates.errores ?? existing.errores ?? []),
    finalizado: toIso(updates.finalizado ?? existing.finalizado),
    duracion_ms: updates.duracionMs ?? existing.duracionMs,
    cambios: JSON.stringify(updates.cambios ?? existing.cambios ?? {}),
    proximo_intento: toIso(updates.proximoIntento ?? existing.proximoIntento),
    reintento_count: updates.reintentoCount ?? existing.reintentoCount
  };

  db.prepare(`
    UPDATE sync_logs SET
      estatus = @estatus,
      registos_procesados = @registos_procesados,
      registos_inseridos = @registos_inseridos,
      registos_actualizados = @registos_actualizados,
      registos_fallidos = @registos_fallidos,
      errores = @errores,
      finalizado = @finalizado,
      duracion_ms = @duracion_ms,
      cambios = @cambios,
      proximo_intento = @proximo_intento,
      reintento_count = @reintento_count
    WHERE sync_id = @sync_id
  `).run(payload);

  return findSyncLogById(syncId);
}

function getLastSuccessfulSyncBySource(fuente) {
  const row = db
    .prepare(`SELECT * FROM sync_logs WHERE fuente = ? AND estatus = 'Exitoso' ORDER BY finalizado DESC LIMIT 1`)
    .get(fuente);
  return mapSyncLog(row);
}

function findSyncLogById(syncId) {
  const row = db.prepare('SELECT * FROM sync_logs WHERE sync_id = ? LIMIT 1').get(syncId);
  return mapSyncLog(row);
}

function listSyncLogs({ sourceId, desde, hasta, limit = 20 }) {
  const clauses = [];
  const params = [];

  if (sourceId) {
    clauses.push('fuente = ?');
    params.push(sourceId);
  }

  if (desde) {
    clauses.push('iniciado >= ?');
    params.push(toIso(desde));
  }

  if (hasta) {
    clauses.push('iniciado <= ?');
    params.push(toIso(hasta));
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db
    .prepare(`SELECT * FROM sync_logs ${where} ORDER BY iniciado DESC LIMIT ?`)
    .all(...params, Number(limit));

  return rows.map(mapSyncLog);
}

function listImportHistory(limit = 50) {
  const rows = db
    .prepare(`
      SELECT * FROM sync_logs
      WHERE fuente IN ('Excel', 'CSV')
      ORDER BY iniciado DESC
      LIMIT ?
    `)
    .all(Number(limit));

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
  listImportHistory
};
