const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/no-leidas', async (req, res) => {
  try {
    res.json({ success: true, data: [], total: 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/contador', async (req, res) => {
  try {
    res.json({ success: true, data: { total: 0, no_leidas: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/leer', async (req, res) => {
  try {
    res.json({ success: true, message: 'Alerta marcada como leída' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/leer-todas', async (req, res) => {
  try {
    res.json({ success: true, message: 'Todas las alertas marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
