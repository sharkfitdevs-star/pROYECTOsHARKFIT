const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExtractorService = require('../services/ExtractorService');
const { requireAuth } = require('../middleware/auth');

// Configurar multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Use .xlsx, .xls o .csv'));
    }
  }
});

// GET /api/extractor/entidades - Obtener entidades disponibles
router.get('/entidades', requireAuth, (req, res) => {
  try {
    const entidades = ExtractorService.getEntidadesDisponibles();
    res.json({ success: true, data: entidades });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/extractor/configuraciones
router.get('/configuraciones', requireAuth, async (req, res) => {
  try {
    const configuraciones = await ExtractorService.getConfiguraciones();
    res.json({ success: true, data: configuraciones });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/extractor/configuraciones/:id
router.get('/configuraciones/:id', requireAuth, async (req, res) => {
  try {
    const config = await ExtractorService.getConfiguracion(req.params.id);
    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    }
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/extractor/configuraciones
router.post('/configuraciones', requireAuth, async (req, res) => {
  try {
    const config = await ExtractorService.crearConfiguracion(req.body, req.user.id);
    res.status(201).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/extractor/configuraciones/:id
router.put('/configuraciones/:id', requireAuth, async (req, res) => {
  try {
    const config = await ExtractorService.actualizarConfiguracion(req.params.id, req.body);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/extractor/configuraciones/:id
router.delete('/configuraciones/:id', requireAuth, async (req, res) => {
  try {
    await ExtractorService.eliminarConfiguracion(req.params.id);
    res.json({ success: true, message: 'Configuración eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/extractor/validar - Validar archivo
router.post('/validar', requireAuth, upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se proporcionó archivo' });
    }
    const resultado = await ExtractorService.validarArchivo(req.file.path);
    fs.unlinkSync(req.file.path);
    res.json({ success: true, data: resultado });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/extractor/preview - Previsualizar archivo
router.post('/preview', requireAuth, upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se proporcionó archivo' });
    }
    
    let resultado;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (ext === '.xlsx' || ext === '.xls') {
      resultado = await ExtractorService.procesarExcel(req.file.path, { limite: 20 });
    } else if (ext === '.csv') {
      resultado = await ExtractorService.procesarCSV(req.file.path, { limite: 20 });
    }
    
    fs.unlinkSync(req.file.path);
    res.json({ success: true, data: resultado });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/extractor/importar - Importar datos
router.post('/importar', requireAuth, upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se proporcionó archivo' });
    }

    const opciones = {
      entidad: req.body.entidad,
      estrategia: req.body.estrategia || 'complement',
      mapeo: req.body.mapeo ? JSON.parse(req.body.mapeo) : null
    };

    const resultado = await ExtractorService.importarDatos(
      req.file.path,
      req.body.configuracionId,
      opciones
    );

    fs.unlinkSync(req.file.path);
    res.json({ success: true, data: resultado });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/extractor/plantilla/:entidad - Descargar plantilla
router.get('/plantilla/:entidad', requireAuth, async (req, res) => {
  try {
    const buffer = await ExtractorService.generarPlantilla(req.params.entidad);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=plantilla_${req.params.entidad}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/extractor/plantillas - Lista de plantillas
router.get('/plantillas', requireAuth, (req, res) => {
  try {
    const entidades = ExtractorService.getEntidadesDisponibles();
    const plantillas = entidades.map(e => ({
      id: e.id,
      nombre: `Importar ${e.nombre}`,
      campos: e.campos
    }));
    res.json({ success: true, data: plantillas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/extractor/historial
router.get('/historial', requireAuth, async (req, res) => {
  try {
    // TODO: Implementar modelo de historial de importaciones
    res.json({ success: true, data: [], total: 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;