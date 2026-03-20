const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/hoy', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: [], total: 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    res.status(201).json({ success: true, data: { ...req.body, fecha: new Date() } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/qr', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, message: 'Check-in por QR exitoso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: { hoy: 0, semana: 0, mes: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
