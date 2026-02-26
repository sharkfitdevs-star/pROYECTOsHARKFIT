const express = require("express");
const router = express.Router();
const Cliente = require("../models/Cliente");
const Setting = require("../models/Setting");
const { logger } = require("../utils/logger");

// GET /api/clientes
// devuelve lista completa sin paginación usando contrato uniforme
router.get("/", async (req, res) => {
  try {
    // determine connection flag from settings
    let importsConnected = true;
    try {
      const doc = await Setting.findOne({ key: 'imports_connected' }).lean();
      importsConnected = doc ? !!doc.value : true;
    } catch (e) {
      // if settings read fails we default true but log
      logger?.warn('failed to read imports_connected flag, assuming true', { err: e });
    }

    let lista = [];
    if (importsConnected) {
      lista = await Cliente.find().select('-__v').lean();
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

    // contract: ok, data, total, importsConnected
    const resp = { ok: true, data, total, importsConnected };
    // compatibility alias for one version
    resp.clientes = data;

    res.json(resp);
  } catch (error) {
    logger?.error("Error al obtener clientes:", { error });
    res.status(500).json({
      ok: false,
      error: "Error al obtener clientes."
    });
  }
});

module.exports = router;
