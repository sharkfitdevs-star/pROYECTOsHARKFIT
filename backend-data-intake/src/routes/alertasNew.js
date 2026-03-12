/**
 * RUTAS DE ALERTAS
 * GET    /api/alertas              – listar con filtros y paginación
 * GET    /api/alertas/:id          – obtener una alerta
 * POST   /api/alertas              – crear alerta manual
 * PUT    /api/alertas/:id          – actualizar alerta
 * POST   /api/alertas/:id/resolver – marcar como resuelta
 * POST   /api/alertas/calcular-kpis – disparar motor de KPIs automático ← NUEVO
 */

const express = require('express');
const router  = express.Router();
const { Alerta } = require('../models');
const { calcularYGenerarAlertas } = require('../services/kpiAlertasService');

// ── GET /api/alertas ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit: rawLimit = 50,
      status, type, priority, idBranch,
      search,
    } = req.query;

    let limitNum = parseInt(rawLimit, 10);
    if (!Number.isFinite(limitNum) || limitNum <= 0) limitNum = 50;
    if (limitNum > 1000) limitNum = 1000;

    const filtro = {};
    if (status)   filtro.status   = status;
    if (type)     filtro.type     = type;
    if (priority) filtro.priority = priority;
    if (idBranch) filtro.idBranch = idBranch;
    if (search) {
      filtro.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { memberName:  { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const skip    = (pageNum - 1) * limitNum;
    const total   = await Alerta.countDocuments(filtro);
    const data    = await Alerta.find(filtro)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/alertas/calcular-kpis ─────────────────────────────────────────
// IMPORTANTE: debe ir ANTES de /:id para que Express no lo confunda con un id
router.post('/calcular-kpis', async (req, res) => {
  try {
    const { desde, hasta } = req.body;
    const opts = {};
    if (desde) opts.desde = new Date(desde);
    if (hasta) opts.hasta = new Date(hasta);

    const resumen = await calcularYGenerarAlertas(opts);

    res.json({
      success: true,
      message: `KPIs calculados. ${resumen.alertasCreadas.length} alerta(s) creada(s).`,
      resumen,
    });
  } catch (err) {
    console.error('[KPI] Error calculando alertas:', err);
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── GET /api/alertas/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const alerta = await Alerta.findOne({ idAlert: req.params.id })
      || await Alerta.findById(req.params.id);
    if (!alerta) return res.status(404).json({ error: true, message: 'Alerta no encontrada' });
    res.json({ success: true, data: alerta });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/alertas ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const alerta = new Alerta({
      idAlert: req.body.idAlert || uuidv4(),
      ...req.body,
      automatic: false,
      source: 'manual',
    });
    await alerta.save();
    res.status(201).json({ success: true, data: alerta });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
});

// ── PUT /api/alertas/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const alerta = await Alerta.findOneAndUpdate(
      { $or: [{ idAlert: req.params.id }, { _id: req.params.id }] },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!alerta) return res.status(404).json({ error: true, message: 'Alerta no encontrada' });
    res.json({ success: true, data: alerta });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/alertas/:id/resolver ──────────────────────────────────────────
router.post('/:id/resolver', async (req, res) => {
  try {
    const { resolvedBy, resolvedByName, resolutionNotes } = req.body;
    const alerta = await Alerta.findOne({
      $or: [{ idAlert: req.params.id }, { _id: req.params.id }]
    });
    if (!alerta) return res.status(404).json({ error: true, message: 'Alerta no encontrada' });

    alerta.resolve(resolvedBy, resolvedByName, resolutionNotes);
    await alerta.save();
    res.json({ success: true, data: alerta });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;
