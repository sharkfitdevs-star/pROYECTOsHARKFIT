/**
 * ROUTES: Import
 * Endpoints para importar archivos Excel y CSV
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ImportService = require('../services/ImportService');
const { v4: uuidv4 } = require('uuid');
const { listImportHistory, createSyncLog, updateSyncLog } = require('../db/repositories');
const { logger } = require('../utils/logger');
const { queueImportTask } = require('../workers/api-worker');
const { normalizeHeader, suggestMapping } = require('../utils/importUtils');

// habilita procesamiento inline cuando no haya worker
const INLINE_MODE = process.env.IMPORT_INLINE_MODE === 'true';

// Configurar multer para subida de archivos
const upload = multer({
  dest: './uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

/**
 * POST /api/import/excel
 * Importar archivo Excel
 */
// synchronous commit API: process and return result immediately (no worker queue)
router.post('/excel/commit', upload.single('file'), async (req, res) => {
  const syncId = req.body.importId || uuidv4();
  // record initial history immediately so there's always a log entry
  const fileMeta = req.file ? { originalName: req.file.originalname } : {};
  const mappingMeta = {};
  try {
    const maybeMapping = req.body.mapeo;
    if (maybeMapping && typeof maybeMapping === 'object') {
      Object.entries(maybeMapping).forEach(([k, v]) => {
        mappingMeta[normalizeHeader(k)] = v;
      });
    } else if (typeof maybeMapping === 'string') {
      try { 
        const parsed = JSON.parse(maybeMapping);
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

    const { mapeo, entidad = 'clientes' } = req.body;
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

// existing /excel route (queueing)
router.post('/excel', upload.single('file'), async (req, res) => {
  // each import attempt gets its own syncId/runId
  const syncId = uuidv4();
  try {
    if (!req.file) {
      await createSyncLog({ syncId, fuente: 'Excel', estatus: 'Fallido', errorMessage: 'No se recibió archivo' });
      return res.status(400).json({ exito: false, error: 'No se recibió archivo', details: { syncId } });
    }

    const { mapeo, entidad = 'clientes' } = req.body;

    // validar entidad
    const validEntidades = ['clientes', 'ventas', 'leads'];
    if (!validEntidades.includes(entidad)) {
      await createSyncLog({ syncId, fuente: 'Excel', estatus: 'Fallido', errorMessage: 'Entidad inválida' });
      return res.status(400).json({ exito: false, error: 'Entidad inválida', details: { syncId } });
    }

    // Parsear mapeo si es string JSON
    let mapeoObj;
    try {
      mapeoObj = typeof mapeo === 'string' ? JSON.parse(mapeo) : mapeo;
    } catch (err) {
      await createSyncLog({ syncId, fuente: 'Excel', estatus: 'Fallido', errorMessage: 'Mapeo JSON inválido' });
      return res.status(400).json({ exito: false, error: 'Mapeo JSON inválido', details: { syncId } });
    }

    // si no se proporcionó mapeo y la entidad es clientes, usamos un preset seguro
    if (entidad === 'clientes' && (!mapeoObj || Object.keys(mapeoObj).length === 0)) {
      mapeoObj = {
        "ID Miembro": "idMember",
        "Nombre": "name",
        "Apellido": "lastName",
        "Teléfono": "cellPhone",
        "Email": "email"
      };
    }

    if (INLINE_MODE) {
      try {
        const result = await ImportService.processExcelFile(req.file, mapeoObj, entidad, syncId);
        logger.info('Import inline completado', { tipo: 'excel', entidad, archivo: req.file.originalname, syncId, resultado: result });
        return res.json({
          exito: true,
          inline: true,
          resultado: result,
          syncId,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        logger.error('Error importando Excel (inline):', err, { syncId });
        await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: err.message, errorStack: err.stack });
        return res.status(500).json({ exito: false, error: err.message, details: { syncId } });
      }
    }

    // create initial log entry even before worker picks it up
    await createSyncLog({ syncId, fuente: 'Excel', entidad, estatus: 'Procesando', fileMeta: { originalName: req.file.originalname } });
    const job = await queueImportTask('excel', { path: req.file.path, originalname: req.file.originalname }, mapeoObj, entidad, { syncId });
    logger.info('Import job encolado', { tipo: 'excel', entidad, archivo: req.file.originalname, jobId: job?.id, syncId });

    res.json({
      exito: true,
      queued: true,
      jobId: job?.id || null,
      syncId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error importando Excel:', error, { syncId });
    await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: error.message, errorStack: error.stack });
    res.status(500).json({
      exito: false,
      error: error.message,
      details: { syncId }
    });
  }
});

/**
 * POST /api/import/csv
 * Importar archivo CSV
 */
// commit endpoint for CSV imports
router.post('/csv/commit', upload.single('file'), async (req, res) => {
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
router.post('/csv', upload.single('file'), async (req, res) => {
  const syncId = uuidv4();
  try {
    if (!req.file) {
      await createSyncLog({ syncId, fuente: 'CSV', estatus: 'Fallido', errorMessage: 'No se recibió archivo' });
      return res.status(400).json({ exito: false, error: 'No se recibió archivo', details: { syncId } });
    }

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

    // apply default client mapping when missing
    if (entidad === 'clientes' && (!mapeoObj || Object.keys(mapeoObj).length === 0)) {
      mapeoObj = {
        "ID Miembro": "idMember",
        "Nombre": "name",
        "Apellido": "lastName",
        "Teléfono": "cellPhone",
        "Email": "email"
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
router.post('/preview', upload.single('file'), async (req, res) => {
  const syncId = req.body.importId || uuidv4();
  const entidad = req.body.entity || req.body.entidad || 'clientes';

  // log the upload for debugging
  logger.info({ hasFile: !!req.file, fileField: req.file?.fieldname, original: req.file?.originalname, size: req.file?.size }, 'preview upload');

  if (!req.file) {
    await createSyncLog({ syncId, fuente: 'Preview', estatus: 'Fallido', errorMessage: 'No se recibió archivo' });
    return res.status(400).json({ ok: false, importId: syncId, error: 'NO_FILE', details: "No file received. Expected multipart/form-data field 'file'." });
  }

  try {
    const preview = await ImportService.previewExcelFile(req.file);
    const headers = preview.columnas || [];
    const normalizedHeaders = headers.map((h) => normalizeHeader(h || ''));
    const sampleRows = (preview.primerosRegistros || []).slice(0,3);
    const suggestedMapping = require('../utils/importUtils').suggestMapping(headers, entidad);

    const empty = (!headers.length) && (!sampleRows.length);
    if (empty) {
      await createSyncLog({ syncId, fuente: 'Preview', estatus: 'Fallido', errorMessage: 'Archivo vacío' });
      return res.json({ ok: false, importId: syncId, error: 'EMPTY', details: { headers: headers.length, rows: sampleRows.length } });
    }

    await createSyncLog({ syncId, fuente: 'Preview', estatus: 'Exitoso' });
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
    logger.error('Error en preview:', error, { syncId });
    try { await updateSyncLog(syncId, { estatus: 'Fallido', errorMessage: error.message, errorStack: error.stack }); } catch {}
    return res.status(200).json({ ok: false, importId: syncId, error: error.message, details: error.stack });
  }
});

/**
 * GET /api/import/history
 * Historial de importaciones
 */
router.get('/history', async (req, res) => {
  try {
    const historial = (await listImportHistory(50)).map((log) => ({
      syncId: log.syncId,
      iniciado: log.iniciado,
      fuente: log.fuente,
      entidad: log.entidad || 'clientes',
      estatus: log.estatus,
      totalRows: log.totalRows,
      insertedCount: log.insertedCount,
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
