const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/prospectos
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, origen, buscar } = req.query;
    // Placeholder - implementar con modelo Prospecto
    res.json({ 
      success: true, 
      data: [], 
      pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/prospectos/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/prospectos
router.post('/', requireAuth, async (req, res) => {
  try {
    res.status(201).json({ success: true, data: req.body, message: 'Prospecto creado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/prospectos/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: req.body, message: 'Prospecto actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/prospectos/:id
router.delete('/:id', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    res.json({ success: true, message: 'Prospecto eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/prospectos/:id/convertir
router.post('/:id/convertir', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, message: 'Prospecto convertido a cliente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/prospectos/estadisticas
router.get('/stats/resumen', requireAuth, async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: {
        total: 0,
        nuevos: 0,
        contactados: 0,
        convertidos: 0,
        perdidos: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
