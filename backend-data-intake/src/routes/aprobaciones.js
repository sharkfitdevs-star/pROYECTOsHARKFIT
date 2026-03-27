const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const Aprobacion = mongoose.model('Aprobacion');
    const { estado, tipo, modulo_origen, page = 1, limit = 20 } = req.query;
    const query = {};
    if (estado) query.estado = estado;
    if (tipo) query.tipo = tipo;
    if (modulo_origen) query.modulo_origen = modulo_origen;
    const total = await Aprobacion.countDocuments(query);
    const data = await Aprobacion.find(query)
      .sort({ prioridad: -1, fecha_solicitud: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/pendientes/count', requireAuth, async (req, res) => {
  try {
    const Aprobacion = mongoose.model('Aprobacion');
    const count = await Aprobacion.countDocuments({ estado: 'pendiente' });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const Aprobacion = mongoose.model('Aprobacion');
    const aprobacion = new Aprobacion(req.body);
    await aprobacion.save();
    res.status(201).json({ success: true, data: aprobacion });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const Aprobacion = mongoose.model('Aprobacion');
    const { estado, comentario_resolucion } = req.body;
    const update = { estado, comentario_resolucion, resuelto_por: req.user?.username || 'sistema', fecha_resolucion: new Date() };
    const aprobacion = await Aprobacion.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!aprobacion) return res.status(404).json({ success: false, error: 'No encontrada' });
    res.json({ success: true, data: aprobacion });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
