const express = require('express');
const router = express.Router();

const Alerta = require('../models/Alerta');
const { requireAuth, requireRole } = require('../middleware/auth');

const ROLES_LECTURA = ['owner', 'admin', 'manager'];
const ROLES_ADMIN = ['owner', 'admin'];

router.use(requireAuth);

router.get('/', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const { status, type, priority, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const docs = await Alerta.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Math.min(Number(limit), 200))
      .lean();

    const total = await Alerta.countDocuments(query);
    return res.json({
      ok: true,
      data: docs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit || 1)),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/no-leidas', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const docs = await Alerta.find({ status: { $in: ['pendiente', 'en_proceso'] } })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      ok: true,
      data: Array.isArray(docs) ? docs : [],
      total: Array.isArray(docs) ? docs.length : 0,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/:id', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const item = await Alerta.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, error: 'Alerta no encontrada' });
    return res.json({ ok: true, data: item });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const created = await Alerta.create(req.body || {});
    return res.status(201).json({ ok: true, data: created });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.patch('/:id/status', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const { status } = req.body || {};
    const updated = await Alerta.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ ok: false, error: 'Alerta no encontrada' });
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.delete('/:id', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const deleted = await Alerta.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Alerta no encontrada' });
    return res.json({ ok: true, data: { id: req.params.id } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});


// DELETE /api/alertas/importados - Eliminar alertas importadas
router.delete('/importados', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const result = await Alerta.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

