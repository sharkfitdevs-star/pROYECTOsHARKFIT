'use strict';
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getConnector } = require('../connectors');
const { requireAuth } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const upload = multer({
  dest: './uploads/',
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['db', 'sqlite', 'sqlite3'].includes(ext)) cb(null, true);
    else cb(new Error('Solo archivos .db/.sqlite'));
  }
});

// Función de mensajes amigables
function friendlyError(err, dbType) {
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('authentication') || msg.includes('auth') || msg.includes('credentials') || msg.includes('password'))
    return 'Credenciales incorrectas. Verifica usuario y contraseña.';
  if (msg.includes('econnrefused') || msg.includes('connect') || msg.includes('refused'))
    return `No se pudo conectar al servidor ${dbType.toUpperCase()}. Verifica host y puerto.`;
  if (msg.includes('timeout') || msg.includes('timed out'))
    return 'Tiempo de conexión agotado. El servidor no respondió en 10 segundos.';
  if (msg.includes('not found') || msg.includes('unknown database') || msg.includes('does not exist'))
    return 'Base de datos no encontrada. Verifica el nombre de la BD.';
  if (msg.includes('ssl') || msg.includes('tls'))
    return 'Error de SSL/TLS. Intenta con ssl: false o verifica el certificado.';
  if (msg.includes('permission') || msg.includes('access denied') || msg.includes('not authorized'))
    return 'Sin permisos. El usuario no tiene acceso a esta base de datos.';
  return `Error de conexión: ${err.message}`;
}

// POST /api/migration/analyze
// Analiza la BD externa y retorna lista de tablas/colecciones con preview
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { type, host, port, database, user, password, uri, collections } = req.body;
    if (!type) return res.status(400).json({ ok: false, error: 'Falta el tipo de BD' });

    const connector = getConnector(type);
    const cfg = { host, port, database, user, password, uri, collections, limit: 5 };
    const frames = await connector.read('', cfg);

    const analysis = Object.entries(frames).map(([name, rows]) => ({
      name,
      rowCount: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      preview: rows.slice(0, 3)
    }));

    res.json({ ok: true, tables: analysis, totalTables: analysis.length });
  } catch (err) {
    logger.error('[migration/analyze]', err.message);
    res.status(500).json({ ok: false, error: friendlyError(err, type || 'bd') });
  }
});

// POST /api/migration/analyze-sqlite
// Analiza archivo SQLite subido
router.post('/analyze-sqlite', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'Falta el archivo' });
    const connector = getConnector('sqlite');
    const frames = await connector.read(req.file.path, { limit: 5 });
    const analysis = Object.entries(frames).map(([name, rows]) => ({
      name,
      rowCount: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      preview: rows.slice(0, 3)
    }));
    res.json({ ok: true, tables: analysis, totalTables: analysis.length, filePath: req.file.path });
  } catch (err) {
    logger.error('[migration/analyze-sqlite]', err.message);
    res.status(500).json({ ok: false, error: friendlyError(err, 'sqlite') });
  }
});

// POST /api/migration/import
// Importa tablas seleccionadas mapeando a entidades SharkFit
router.post('/import', requireAuth, async (req, res) => {
  try {
    const { type, connectionConfig, tableMappings, filePath } = req.body;
    // tableMappings: [{ tableName, entity, columnMappings }]
    if (!type || !tableMappings?.length) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros' });
    }

    const connector = getConnector(type);
    const source = filePath || '';
    const cfg = { ...connectionConfig, limit: 50000 };
    const frames = await connector.read(source, cfg);

    const results = [];
    for (const mapping of tableMappings) {
      const { tableName, entity, columnMappings } = mapping;
      const rows = frames[tableName] || [];
      results.push({
        tableName,
        entity,
        rowCount: rows.length,
        status: 'mapped',
        message: `${rows.length} filas listas para importar a ${entity}`
      });
    }

    res.json({ ok: true, results, totalRows: results.reduce((s, r) => s + r.rowCount, 0) });
  } catch (err) {
    logger.error('[migration/import]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// POST /api/migration/test-connection
router.post('/test-connection', requireAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { type, host, port, database, user, password, uri } = req.body;
    if (!type) return res.status(400).json({ ok: false, error: 'Falta el tipo de BD' });
    const connector = getConnector(type);
    const cfg = { host, port, database, user, password, uri, limit: 1 };
    await connector.read('', cfg);
    const ms = Date.now() - startTime;
    res.json({ ok: true, message: `Conexión exitosa en ${ms}ms`, latency: ms });
  } catch (err) {
    const { type } = req.body;
    res.status(400).json({ ok: false, error: friendlyError(err, type || 'bd') });
  }
});

// POST /api/migration/export-excel
router.post('/export-excel', requireAuth, async (req, res) => {
  try {
    const { type, connectionConfig, collections, filePath, title } = req.body;
    const connector = getConnector(type);
    const cfg = { ...connectionConfig, limit: 50000, collections };
    const frames = await connector.read(filePath || '', cfg);
    const { generateExcel } = require('../excel/generator');
    const os = require('os');
    const path = require('path');
    const outputPath = path.join(os.tmpdir(), `sharkfit_export_${Date.now()}.xlsx`);
    await generateExcel(frames, outputPath, {
      title: title || 'Exportación SharkFit',
      generatedAt: new Date().toLocaleString('es-CL'),
      sourceLabel: connectionConfig?.database || type,
      dbType: type,
    });
    res.download(outputPath, `export_${Date.now()}.xlsx`, (err) => {
      if (err) logger.error('[migration/export-excel] download error', err.message);
      require('fs').unlink(outputPath, () => {});
    });
  } catch (err) {
    logger.error('[migration/export-excel]', err.message);
    res.status(500).json({ ok: false, error: friendlyError(err, req.body?.type || 'bd') });
  }
});

module.exports = router;
