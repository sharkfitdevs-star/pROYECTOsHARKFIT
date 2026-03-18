/**
 * ROUTES: Import
 * Endpoints para importar archivos Excel y CSV
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ImportService = require('../services/ImportService');
const { v4: uuidv4 } = require('uuid');
const { listImportHistory, createSyncLog, updateSyncLog, findSyncLogById } = require('../db/repositories');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');
const { queueImportTask } = require('../workers/api-worker');
// middleware de autenticación (commit/import history deben requerir token)
const { requireAuth } = require('../middleware/auth');
const { normalizeHeader, suggestMapping } = require('../utils/importUtils');

// habilita procesamiento inline cuando no haya worker
const INLINE_MODE = process.env.IMPORT_INLINE_MODE === 'true';

// Configurar multer para subida de archivos
const upload = multer({
  dest: './uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo
  fileFilter: (req, file, cb) => {
    // allow by mimetype or, if mimetype is missing/generic, by extension
    const allowedExt = ['xlsx', 'xls', 'csv'];
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel',                                       // xls or csv
      'text/csv',
      'application/csv'
    ];

    const original = file.originalname || '';
    const ext = original.split('.').pop().toLowerCase();
    const mimetype = file.mimetype || '';
    const isGeneric = !mimetype || mimetype === 'application/octet-stream';

    let ok = false;
    if (allowedMime.includes(mimetype)) {
      ok = true;
    } else if ((isGeneric || !mimetype) && allowedExt.includes(ext)) {
      ok = true;
    }

    if (ok) {
      cb(null, true);
    } else {
      // build error for unsupported type
      const err = new Error('UNSUPPORTED_FILE_TYPE');
      err.statusCode = 415;
      err.details = { mimetype, originalname: original, ext };
      cb(err);
    }
  }
});

// wrapper para manejar el upload y transformar errores de tipo
function uploadHandler(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.statusCode === 415 && err.message === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(415).json({
          ok: false,
          exito: false,
          error: 'UNSUPPORTED_FILE_TYPE',
          allowed: ['xlsx','xls','csv'],
          got: err.details || {}
        });
      }
      return next(err);
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, exito: false, error: 'MISSING_FILE' });
    }
    next();
  });
}

/**
 * POST /api/import/excel
 * Importar archivo Excel
 */
// synchronous commit API: process and return result immediately (no worker queue)
router.post('/excel/commit', requireAuth, uploadHandler, async (req, res) => {
  const syncId = req.body.importId || uuidv4();
  // record initial history immediately so there's always a log entry
  const fileMeta = req.file ? { originalName: req.file.originalname } : {};
  const mappingMeta = {};
  // accept either `mapping` or legacy `mapeo` field
  const rawMapping = req.body.mapping ?? req.body.mapeo;
  try {
    if (rawMapping && typeof rawMapping === 'object') {
      Object.entries(rawMapping).forEach(([k, v]) => {
        mappingMeta[normalizeHeader(k)] = v;
      });
    } else if (typeof rawMapping === 'string') {
      try {
        const parsed = JSON.parse(rawMapping);
        Object.entries(parsed).forEach(([k, v]) => {
          mappingMeta[normalizeHeader(k)] = v;
        });
      } catch {}
    }
  } catch {}
  // upsert initial log
  await createSyncLog({
    syncId,
    entidad: req.body.entidad || 'clientes',
    fuente: 'Excel',
    estatus: 'Procesando',
    iniciado: new Date(),
    fileMeta,
    mappingUsed: mappingMeta,
    registosProcesados: 0,
    registosInseridos: 0,
    registosActualizados: 0,
    registosFallidos: 0,
    totalRows: 0,
    insertedCount: 0,
    skippedCount: 0,
    invalidCount: 0,
    warnings: []
  });

  try {
    if (!req.file) {
      await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: 'No se recibió archivo' });
      return res.status(400).json({ ok: false, error: 'No se recibió archivo', details: { importId: syncId }, status: 'failed' });
    }

    const { entidad = 'clientes' } = req.body;
    const validEntidades = ['clientes', 'ventas', 'leads'];
    if (!validEntidades.includes(entidad)) {
      await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: 'Entidad inválida' });
      return res.status(400).json({ ok: false, error: 'Entidad inválida', details: { importId: syncId }, status: 'failed' });
    }

    // mapping validation -------------------------------------------------
    let mapeoObj;
    try {
      if (rawMapping === undefined || rawMapping === null) {
        throw new Error('missing');
      }
      mapeoObj = typeof rawMapping === 'string' ? JSON.parse(rawMapping) : rawMapping;
    } catch (err) {
      await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: 'Mapeo inválido' });
      return res.status(400).json({ ok: false, error: 'INVALID_MAPPING', details: { importId: syncId }, status: 'failed' });
    }

    if (!mapeoObj || typeof mapeoObj !== 'object' || Object.keys(mapeoObj).length === 0) {
      await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: 'Mapeo vacío' });
      return res.status(400).json({ ok: false, error: 'INVALID_MAPPING', details: { importId: syncId }, status: 'failed' });
    }

    logger.info('import.start', { importId: syncId, rows: 'unknown' });
    const result = await ImportService.processExcelFile(req.file, mapeoObj, entidad, syncId);
    logger.info('import.done', { importId: syncId, inserted: result.insertedCount, skipped: result.skippedCount });

    // update sync log with final counts and warnings
    await updateSyncLog(syncId, {
      estatus: result.estatus || 'Exitoso',
      registosProcesados: result.totalRows,
      registosInseridos: result.insertedCount,
      registosActualizados: result.registosActualizados,
      registosFallidos: result.skippedCount + (result.invalidCount||0),
      totalRows: result.totalRows,
      insertedCount: result.insertedCount,
      skippedCount: result.skippedCount,
      invalidCount: result.invalidCount || 0,
      warnings: result.warnings || [],
      updatedCount: result.updatedCount || result.registosActualizados || 0
    });

    return res.json({
      ok: true,
      importId: syncId,
      status: result.estatus || 'success',
      // always include explicit fields for frontend
      totalRows: result.totalRows || 0,
      insertedCount: result.insertedCount || 0,
      updatedCount: result.updatedCount || result.registosActualizados || 0,
      skippedCount: result.skippedCount || 0,
      invalidCount: result.invalidCount || 0,
      warnings: result.warnings || [],
      counts: {
        processed: result.totalRows,
        inserted: result.insertedCount,
        skipped: result.skippedCount,
        invalid: result.invalidCount || 0
      }
    });
  } catch (err) {
    logger.error('[import][commit] failed', {
      importId: syncId,
      message: err?.message,
      stack: err?.stack
    });
    await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: err?.message, errorStack: err?.stack });
    return res.status(500).json({
      ok: false,
      importId: syncId,
      error: err?.message || 'COMMIT_FAILED',
      details: {
        importId: syncId,
        stack: (err?.stack || '').toString().slice(0, 1200)
      },
      status: "failed"
    });
  }
});

// helper model import required for duplicate detection
const Cliente = require('../models/Cliente');

// new endpoint: check duplicates for a just-processed import
router.post('/check-duplicates', requireAuth, async (req, res) => {
  const importId = req.body.importId || req.body.syncId;
  if (!importId) {
    return res.status(400).json({ ok: false, error: 'MISSING_IMPORT_ID' });
  }

  const registros = ImportService.getCachedImport
    ? ImportService.getCachedImport(importId)
    : null;

  if (!registros) {
    return res.status(404).json({ ok: false, error: 'IMPORT_DATA_NOT_FOUND' });
  }

  const grupos = { idMember: [], rut: [], cpf: [] };
  let sinDuplicados = 0;

  for (let i = 0; i < registros.length; i++) {
    const row = registros[i] || {};
    const idMember = row.idMember || row.idmember || row.id_member || null;
    const rut = row.rut || row.cpf || null;
    const cpf = row.cpf || row.rut || null;

    let cliente = null;
    let tipo = null;

    if (idMember) {
      cliente = await Cliente.findOne({ idMember }).lean();
      if (cliente) tipo = 'idMember';
    }
    if (!cliente && rut) {
      cliente = await Cliente.findOne({ cpf: rut }).lean();
      if (cliente) tipo = 'rut';
    }
    if (!cliente && cpf) {
      cliente = await Cliente.findOne({ cpf }).lean();
      if (cliente) tipo = 'cpf';
    }

    if (cliente) {
      const camposDiferentes = [];
      ['name','email','cellPhone','planName','branchName'].forEach(f => {
        const valBD = cliente[f] ?? null;
        const valExcel = row[f] ?? null;
        if ((valBD || '') !== (valExcel || '')) {
          camposDiferentes.push({ campo: f, valorBD: valBD, valorExcel: valExcel });
        }
      });

      grupos[tipo].push({
        rowIndex: i + 1,
        identificador: tipo === 'idMember' ? idMember : (tipo === 'rut' ? rut : cpf),
        clienteIdBD: cliente._id,
        nombreBD: cliente.name || null,
        nombreExcel: row.name || null,
        camposDiferentes
      });
    } else {
      sinDuplicados++;
    }
  }

  const gruposArray = Object.entries(grupos)
    .filter(([_, arr]) => arr.length > 0)
    .map(([tipo, arr]) => ({ tipo, cantidad: arr.length, registros: arr }));

  // NOTE: leave cache in place until resolve-and-commit is invoked
  // (frontend should call commit after user makes decisions)

  return res.json({
    importId,
    totalDuplicados: gruposArray.reduce((a, g) => a + g.cantidad, 0),
    grupos: gruposArray,
    sinDuplicados
  });
});

// new endpoint: apply user decisions and finish import
router.post('/resolve-and-commit', requireAuth, async (req, res) => {
  const { importId, accionGlobal, decisiones } = req.body;
  if (!importId) {
    return res.status(400).json({ ok: false, error: 'MISSING_IMPORT_ID' });
  }

  const registros = ImportService.getCachedImport
    ? ImportService.getCachedImport(importId)
    : null;
  if (!registros) {
    return res.status(404).json({ ok: false, error: 'IMPORT_DATA_NOT_FOUND' });
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const totalProcesados = registros.length;

  // build lookup for individual decisions by rowIndex
  const decisionMap = new Map();
  if (Array.isArray(decisiones)) {
    decisiones.forEach(d => {
      if (d && typeof d.rowIndex === 'number') {
        decisionMap.set(d.rowIndex, d);
      }
    });
  }

  for (let i = 0; i < registros.length; i++) {
    const row = registros[i] || {};
    const rowIndex = i + 1;

    // first, detect if this row matches an existing cliente
    let cliente = null;
    const idMember = row.idMember || row.idmember || row.id_member || null;
    const rut = row.rut || row.cpf || null;
    const cpf = row.cpf || row.rut || null;

    if (idMember) {
      cliente = await Cliente.findOne({ idMember }).lean();
    }
    if (!cliente && rut) {
      cliente = await Cliente.findOne({ cpf: rut }).lean();
    }
    if (!cliente && cpf) {
      cliente = await Cliente.findOne({ cpf }).lean();
    }

    // apply global ignore all logic
    if (accionGlobal === 'ignorar_todos' && cliente) {
      skippedCount++;
      continue;
    }

    // handle per-row decision
    const dec = decisionMap.get(rowIndex);
    if (dec) {
      if (dec.accion === 'ignorar') {
        skippedCount++;
        continue;
      }
      if (dec.accion === 'actualizar' && cliente) {
        try {
          await Cliente.findByIdAndUpdate(dec.clienteIdBD, row, { new: true });
          updatedCount++;
        } catch (err) {
          skippedCount++;
        }
        continue;
      }
      // if there's a decision but no cliente or unrecognized action, fall through
    }

    // no decision or not duplicate: if there is an existing cliente and no dec, skip it
    if (cliente) {
      skippedCount++;
      continue;
    }

    // otherwise insert new document
    try {
      await Cliente.create(row);
      insertedCount++;
    } catch (err) {
      skippedCount++;
    }
  }

  // cleanup cache
  if (ImportService.deleteCachedImport) {
    ImportService.deleteCachedImport(importId);
  }

  // compute status for sync log
  let estatus = 'Exitoso';
  if (skippedCount > 0 && (insertedCount > 0 || updatedCount > 0)) estatus = 'Parcial';
  else if (skippedCount > 0 && insertedCount === 0 && updatedCount === 0) estatus = 'Fallido';

  await updateSyncLog(importId, {
    estatus,
    insertedCount,
    updatedCount,
    skippedCount,
    registosProcesados: totalProcesados
  });

  return res.json({
    ok: true,
    insertedCount,
    updatedCount,
    skippedCount,
    totalProcesados,
    warnings: []
  });
});


/**
 * POST /api/import/csv
 * Importar archivo CSV
 */
// commit endpoint for CSV imports
router.post('/csv/commit', requireAuth, uploadHandler, async (req, res) => {
  const syncId = req.body.importId || uuidv4();
  // initial history entry (upserted by createSyncLog)
  const fileMeta = req.file ? { originalName: req.file.originalname } : {};
  const mappingMeta = {};
  try {
    const maybeMap = req.body.mapeo;
    if (maybeMap && typeof maybeMap === 'object') {
      Object.entries(maybeMap).forEach(([k, v]) => {
        mappingMeta[normalizeHeader(k)] = v;
      });
    } else if (typeof maybeMap === 'string') {
      try {
        const parsed = JSON.parse(maybeMap);
        Object.entries(parsed).forEach(([k, v]) => {
          mappingMeta[normalizeHeader(k)] = v;
        });
      } catch {}
    }
  } catch {}
  await createSyncLog({
    syncId,
    entidad: req.body.entidad || 'clientes',
    fuente: 'CSV',
    estatus: 'Procesando',
    iniciado: new Date(),
    fileMeta,
    mappingUsed: mappingMeta,
    registosProcesados: 0,
    registosInseridos: 0,
    registosActualizados: 0,
    registosFallidos: 0,
    totalRows: 0,
    insertedCount: 0,
    skippedCount: 0,
    invalidCount: 0,
    warnings: []
  });

  try {
    if (!req.file) {
      await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: 'No se recibió archivo' });
      return res.status(400).json({ ok: false, error: 'No se recibió archivo', details: { importId: syncId }, status: 'failed' });
    }

    const { mapeo, entidad = 'clientes', delimitador = ',' } = req.body;
    const validEntidades = ['clientes', 'ventas', 'leads'];
    if (!validEntidades.includes(entidad)) {
      await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: 'Entidad inválida' });
      return res.status(400).json({ ok: false, error: 'Entidad inválida', details: { importId: syncId }, status: 'failed' });
    }

    let mapeoObj;
    try {
      mapeoObj = typeof mapeo === 'string' ? JSON.parse(mapeo) : mapeo;
    } catch (err) {
      await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: 'Mapeo JSON inválido' });
      return res.status(400).json({ ok: false, error: 'Mapeo JSON inválido', details: { importId: syncId }, status: 'failed' });
    }

    if (entidad === 'clientes' && (!mapeoObj || Object.keys(mapeoObj).length === 0)) {
      mapeoObj = {
        "ID Miembro": "idMember",
        "Nombre": "name",
        "Apellido": "lastName",
        "Teléfono": "cellPhone",
        "Email": "email"
      };
    }

    logger.info('import.start', { importId: syncId, rows: 'unknown' });
    const result = await ImportService.processCSVFile(req.file, mapeoObj, entidad, delimitador, syncId);
    logger.info('import.done', { importId: syncId, inserted: result.insertedCount, skipped: result.skippedCount });

    await updateSyncLog(syncId, {
      estatus: result.estatus || 'Exitoso',
      registosProcesados: result.totalRows,
      registosInseridos: result.insertedCount,
      registosActualizados: result.registosActualizados,
      registosFallidos: result.skippedCount + (result.invalidCount||0),
      totalRows: result.totalRows,
      insertedCount: result.insertedCount,
      skippedCount: result.skippedCount,
      invalidCount: result.invalidCount || 0,
      warnings: result.warnings || []
    });

    return res.json({
      ok: true,
      importId: syncId,
      status: result.estatus || 'success',
      counts: {
        processed: result.totalRows,
        inserted: result.insertedCount,
        skipped: result.skippedCount,
        invalid: result.invalidCount || 0
      },
      warnings: result.warnings || []
    });
  } catch (error) {
    logger.error('import.fail', { importId: syncId, error: error.message });
    await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: error.message, errorStack: error.stack });
    res.status(500).json({ ok: false, importId: syncId, error: error.message, details: { importId: syncId }, status: 'failed' });
  }
});

// original CSV route (queueing)
router.post('/csv', requireAuth, uploadHandler, async (req, res) => {
  const syncId = uuidv4();
  try {
    if (!req.file) {
      return res.status(400).json({ exito: false, error: 'No se recibió archivo', details: { syncId } });
    }

    // ✅ FIX: faltaba desestructurar estas variables del req.body
    const { mapeo, entidad = 'clientes', delimitador = ',' } = req.body;

    const validEntidades = ['clientes', 'ventas', 'leads'];
    if (!validEntidades.includes(entidad)) {
      await createSyncLog({ syncId, fuente: 'CSV', estatus: 'Fallido', errorMessage: 'Entidad inválida' });
      return res.status(400).json({ exito: false, error: 'Entidad inválida', details: { syncId } });
    }

    let mapeoObj;
    try {
      mapeoObj = typeof mapeo === 'string' ? JSON.parse(mapeo) : mapeo;
    } catch (err) {
      await createSyncLog({ syncId, fuente: 'CSV', estatus: 'Fallido', errorMessage: 'Mapeo JSON inválido' });
      return res.status(400).json({ exito: false, error: 'Mapeo JSON inválido', details: { syncId } });
    }

    if (entidad === 'clientes' && (!mapeoObj || Object.keys(mapeoObj).length === 0)) {
      mapeoObj = {
        "ID Miembro": "idMember",
        "Nombre":     "name",
        "Apellido":   "lastName",
        "Teléfono":   "cellPhone",
        "Email":      "email"
      };
    }

    if (INLINE_MODE) {
      try {
        const result = await ImportService.processCSVFile(req.file, mapeoObj, entidad, delimitador, syncId);
        logger.info('Import inline completado (CSV)', { tipo: 'csv', entidad, archivo: req.file.originalname, syncId, resultado: result });
        return res.json({
          exito: true,
          inline: true,
          resultado: result,
          syncId,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        logger.error('Error importando CSV (inline):', err, { syncId });
        await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: err.message, errorStack: err.stack });
        return res.status(500).json({ exito: false, error: err.message, details: { syncId } });
      }
    }

    await createSyncLog({ syncId, fuente: 'CSV', entidad, estatus: 'Procesando', fileMeta: { originalName: req.file.originalname } });
    // Enqueue CSV import job
    const job = await queueImportTask('csv', { path: req.file.path, originalname: req.file.originalname }, mapeoObj, entidad, { delimitador, syncId });
    logger.info('Import job encolado', { tipo: 'csv', entidad, archivo: req.file.originalname, jobId: job?.id, syncId });

    res.json({
      exito: true,
      queued: true,
      jobId: job?.id || null,
      syncId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error importando CSV:', error, { syncId });
    await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: error.message, errorStack: error.stack });
    res.status(500).json({
      exito: false,
      error: error.message,
      details: { syncId }
    });
  }
});

/**
 * POST /api/import/preview
 * Vista previa del archivo (primeros registros)
 */
router.post('/preview', requireAuth, uploadHandler, async (req, res) => {
  const syncId = req.body.importId || uuidv4();
  const entidad = req.body.entity || req.body.entidad || 'clientes';

  try {
    logger.info(`[preview] hasFile=${!!req.file} original=${req.file?.originalname || 'n/a'} size=${req.file?.size || 0}`);

    if (!req.file) {
      try {
        await createSyncLog({ syncId, fuente: 'Preview', estatus: 'Fallido', errorMessage: 'No se recibió archivo' });
      } catch (logErr) {
        logger.warn(`[preview] createSyncLog failed: ${logErr.message}`);
      }
      return res.status(400).json({
        ok: false,
        importId: syncId,
        error: 'NO_FILE',
        details: "No file received. Expected multipart/form-data field 'file'."
      });
    }

    // Detectar si es CSV o Excel por extensión
    const ext = (req.file.originalname || '').split('.').pop().toLowerCase();
    let preview;
    if (ext === 'csv') {
      preview = await ImportService.previewCSVFile(req.file);
    } else {
      preview = await ImportService.previewExcelFile(req.file);
    }

    const headers = preview.columnas || [];
    const normalizedHeaders = headers.map((h) => normalizeHeader(h || ''));
    const sampleRows = (preview.primerosRegistros || []).slice(0, 3);
    const { suggestMapping } = require('../utils/importUtils');
    const suggestedMapping = suggestMapping(headers, entidad);

    const empty = !headers.length && !sampleRows.length;
    if (empty) {
      try {
        await createSyncLog({ syncId, fuente: 'Preview', estatus: 'Fallido', errorMessage: 'Archivo vacío' });
      } catch (logErr) {
        logger.warn(`[preview] createSyncLog failed: ${logErr.message}`);
      }
      return res.json({
        ok: false,
        importId: syncId,
        error: 'EMPTY',
        details: { headers: headers.length, rows: sampleRows.length }
      });
    }

    try {
      await createSyncLog({ syncId, fuente: 'Preview', estatus: 'Exitoso' });
    } catch (logErr) {
      logger.warn(`[preview] createSyncLog failed: ${logErr.message}`);
    }

    return res.json({
      ok: true,
      importId: syncId,
      headers,
      normalizedHeaders,
      sampleRows,
      suggestedMapping,
      previewRows: preview.primerosRegistros || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`[preview] error: ${error.message}`, { syncId, stack: error.stack });
    try {
      await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: error.message, errorStack: error.stack });
    } catch (_ ) {}
    return res.status(500).json({
      ok: false,
      importId: syncId,
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * GET /api/import/history
 * Historial de importaciones
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    // ensure DB is connected
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
    }

    // pagination param, default 50 max 500
    let limit = parseInt(req.query.limit, 10) || 50;
    if (limit < 1) limit = 1;
    if (limit > 500) limit = 500;

    const historial = (await listImportHistory(limit)).map((log) => ({
      syncId: log.syncId,
      iniciado: log.iniciado,
      fuente: log.fuente,
      entidad: log.entidad || 'clientes',
      estatus: log.estatus,
      totalRows: log.totalRows,
      insertedCount: log.insertedCount,
      updatedCount: log.updatedCount || log.registosActualizados,
      skippedCount: log.skippedCount,
      invalidCount: log.invalidCount,
      errorMessage: log.errorMessage,
      errorCode: log.errorCode,
      warnings: log.warnings,
      mappingUsed: log.mappingUsed,
      detectedHeaders: log.detectedHeaders,
      sheetName: log.sheetName,
      fileMeta: log.fileMeta
    }));

    res.json({
      exito: true,
      datos: historial,
      cantidad: historial.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error obteniendo historial:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

// health check endpoint that verifies mongo can write/read a sync log
// This is intentionally O(1) and *does not* delete anything; it simply upserts
// a document with a known id and next reads it back.
router.get('/selftest', requireAuth, async (req, res) => {
  const syncId = 'selftest';
  try {
    const now = new Date();
    // upsert a record with current timestamps
    await createSyncLog({
      syncId,
      fuente: 'selftest',
      estatus: 'iniciado',
      iniciado: now,
      finalizado: now
    });

    const doc = await findSyncLogById(syncId);
    if (!doc) {
      throw new Error('document not found');
    }
    return res.json({ ok: true, mongo: true, syncLogsWritable: true });
  } catch (err) {
    logger.error('selftest failure', err);
    return res.json({ ok: false, mongo: false, error: err.message });
  }
});

// ── GET /api/import/status/:jobId ───────────────────────────────────────────
router.get('/status/:jobId', async (req, res) => {
  try {
    const { SyncLog } = require('../models');
    const log = await SyncLog.findOne({ jobId: req.params.jobId });
    if (!log) return res.status(404).json({ ok: false, error: 'Job no encontrado' });
    res.json({ ok: true, data: log });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/import/logs ─────────────────────────────────────────────────────
// Historial unificado: Excel (source:'excel') + API (source:'api')
router.get('/logs', async (req, res) => {
  try {
    const { SyncLog } = require('../models');
    const { source, status, limit = 20 } = req.query;
    const filtro = {};
    if (source) filtro.source = source;
    if (status) filtro.status = status;
    const logs = await SyncLog.find(filtro)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit) || 20, 100));
    res.json({ ok: true, data: logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

/*
 * [PLAN IA - FASE A2]
 * - Añadir script "worker" en package.json: "worker": "node src/workers/worker.js" (hecho)
 * - Asegurar que api-worker.js se conecta a Mongo y registra queue.process para los tipos 'excel' y 'csv'.
 *   -> api-worker ahora soporta ejecución directa con connectDB y mantiene proceso abierto.
 * - Hacer que al finalizar ImportService.processExcelFile se llame a createSyncLog / updateSyncLog con campos:
 *     syncId, entidad, fuente, estatus, registrosProcesados, registrosInseridos, iniciado, terminado.
 *   -> ImportService ya transmite `entidad` y actualiza el log internamente.
 * - Ajustar GET /api/import/history para devolver { datos: [...] } mapeando los nombres de campo a:
 *     syncId, iniciado, fuente, entidad, estatus, registrosProcesados, registrosInseridos.
 *   -> Corrección aplicada y se normalizaron nombres (antes eran "registos").
 * - Verificar manualmente: importar Excel → esperar → revisar /api/import/history → revisar /api/clientes.
 */

/*
 * RUNBOOK IMPORTACIÓN CLIENTES (dev):
 * 1) Terminal A: cd backend-data-intake && npm run dev
 * 2) Terminal B: cd backend-data-intake && npm run worker
 * 3) Navegador: abrir frontend, loguearse y entrar a "Importar Excel"
 * 4) Subir archivo .xlsx / .csv con entidad = clientes y mapeo correcto.
 * 5) Pulsar "Confirmar importación" → ver mensaje "Import queued (job ...)".
 * 6) Esperar unos segundos.
 * 7) Revisar "Historial de importaciones" en frontend (y/o GET /api/import/history).
 * 8) Revisar sección "Clientes" (y/o GET /api/clientes).
 */
