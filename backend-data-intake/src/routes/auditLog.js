const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { requireAdminOrOwner } = require('./auth');

// Obtener logs de auditoría (solo admin/owner)
router.get('/', requireAdminOrOwner, async (req, res) => {
  try {
    const { userId, action, limit = 50, skip = 0 } = req.query;
    const query = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 200));
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al obtener logs' });
  }
});

// Eliminar logs antiguos (retención 30 días, solo admin/owner)
router.delete('/purge', requireAdminOrOwner, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al purgar logs' });
  }
});

module.exports = router;
