const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    res.status(201).json({ success: true, data: req.body });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: req.body });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    res.json({ success: true, message: 'Pago eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats/resumen', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: { total: 0, pendientes: 0, completados: 0, monto_total: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
