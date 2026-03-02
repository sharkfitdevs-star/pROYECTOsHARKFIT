const express = require("express");
const router = express.Router();
const Cliente = require("../models/Cliente");
const Setting = require("../models/Setting");
const { logger } = require("../utils/logger");
const { requireAuth } = require('../middleware/auth');

// GET /api/clientes
// devuelve lista completa sin paginación usando contrato uniforme
// la ruta está protegida, sólo usuarios autenticados pueden consultarla
router.get("/", requireAuth, async (req, res) => {
  try {
    // DB availability check
    if (!require('mongoose').connection || require('mongoose').connection.readyState !== 1) {
      logger.error('[API ERROR]', {
        path: req.path,
        method: req.method,
        message: 'MongoDB not connected',
        state: require('mongoose').connection.readyState
      });
      return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
    }

    // determine connection flag from settings
    let importsConnected = true;
    try {
      const doc = await Setting.findOne({ key: 'imports_connected' }).lean();
      importsConnected = doc ? !!doc.value : true;
    } catch (e) {
      // if settings read fails we default true but log
      logger?.warn('failed to read imports_connected flag, assuming true', { err: e });
    }

    // build query parameters (pagination + search)
    const { limit, skip, q } = req.query;
    const numLimit = Math.min(Math.max(parseInt(limit) || 200, 1), 1000);
    const numSkip = Math.max(parseInt(skip) || 0, 0);
    const filter = {};
    if (q && typeof q === 'string' && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    let lista = [];
    if (importsConnected) {
      lista = await Cliente.find(filter)
        .select('-__v')
        .sort({ createdAt: -1, _id: -1 })
        .skip(numSkip)
        .limit(numLimit)
        .lean();
    } else {
      // when disconnected return empty list (historical behaviour)
      lista = [];
    }

    const sanitized = lista.map(c => {
      const { __v, ...rest } = c;
      return rest;
    });

    const data = sanitized;
    const total = data.length;

    // attach paging metadata
    const meta = { limit: numLimit, skip: numSkip, count: total };

    // contract: ok, data, total, importsConnected
    const resp = { ok: true, data, total, importsConnected, meta };
    // compatibility alias for one version
    resp.clientes = data;

    res.json(resp);
  } catch (error) {
    logger.error('[API ERROR]', {
      path: req.path,
      method: req.method,
      message: error.message,
      stack: error.stack
    });
    if (!require('mongoose').connection || require('mongoose').connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE', message: 'MongoDB not connected' });
    }
    res.status(500).json({ ok: false, error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
});

module.exports = router;
