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
    res.status(500).json({ ok: false, error: err.message });
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
    res.status(500).json({ ok: false, error: err.message });
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

module.exports = router;
