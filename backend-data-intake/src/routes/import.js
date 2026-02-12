/**
 * ROUTES: Import
 * Endpoints para importar archivos Excel y CSV
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ImportService = require('../services/ImportService');
const { listImportHistory } = require('../db/repositories');
const { logger } = require('../utils/logger');

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
router.post('/excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        exito: false,
        error: 'No se recibió archivo'
      });
    }

    const { mapeo, entidad = 'clientes' } = req.body;

    // Parsear mapeo si es string JSON
    const mapeoObj = typeof mapeo === 'string' ? JSON.parse(mapeo) : mapeo;

    const resultado = await ImportService.processExcelFile(
      req.file,
      mapeoObj,
      entidad
    );

    res.json({
      exito: true,
      datos: resultado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error importando Excel:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * POST /api/import/csv
 * Importar archivo CSV
 */
router.post('/csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        exito: false,
        error: 'No se recibió archivo'
      });
    }

    const { mapeo, entidad = 'clientes', delimitador = ',' } = req.body;
    const mapeoObj = typeof mapeo === 'string' ? JSON.parse(mapeo) : mapeo;

    const resultado = await ImportService.processCSVFile(
      req.file,
      mapeoObj,
      entidad,
      delimitador
    );

    res.json({
      exito: true,
      datos: resultado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error importando CSV:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * POST /api/import/preview
 * Vista previa del archivo (primeros registros)
 */
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        exito: false,
        error: 'No se recibió archivo'
      });
    }

    const preview = await ImportService.previewExcelFile(req.file);

    res.json({
      exito: true,
      datos: preview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error en preview:', error);
    res.status(500).json({
      exito: false,
      error: error.message
    });
  }
});

/**
 * GET /api/import/history
 * Historial de importaciones
 */
router.get('/history', async (req, res) => {
  try {
    const historial = listImportHistory(50).map((log) => ({
      syncId: log.syncId,
      fuente: log.fuente,
      registosProcesados: log.registosProcesados,
      registosInseridos: log.registosInseridos,
      estatus: log.estatus,
      iniciado: log.iniciado,
      duracionMs: log.duracionMs
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
