const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const ReglaAlerta = require('../models/automatizaciones/ReglaAlerta');
const { getAlertaRulesEngine } = require('../config/automatizaciones.integration');

const ROLES_LECTURA = ['owner', 'admin', 'manager'];
const ROLES_ADMIN = ['owner', 'admin'];

router.use(requireAuth);

router.get('/catalogos', requireRole(ROLES_LECTURA), async (req, res) => {
  const engine = getAlertaRulesEngine();
  return res.json({ ok: true, data: engine.getCatalogos() });
});

router.get('/estadisticas/general', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const engine = getAlertaRulesEngine();
    const data = await engine.estadisticasGenerales();
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/plantillas/lista', requireRole(ROLES_LECTURA), async (req, res) => {
  const engine = getAlertaRulesEngine();
  return res.json({ ok: true, data: engine.getPlantillas() });
});

router.post('/desde-plantilla', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const { nombrePlantilla } = req.body || {};
    if (!nombrePlantilla) return res.status(400).json({ ok: false, error: 'nombrePlantilla es requerido' });

    const engine = getAlertaRulesEngine();
    const plantilla = engine.getPlantillas().find((p) => p.nombre === nombrePlantilla);
    if (!plantilla) return res.status(404).json({ ok: false, error: 'Plantilla no encontrada' });

    const created = await ReglaAlerta.create({
      ...plantilla,
      ...req.body,
      plantilla: nombrePlantilla,
      creadoPor: req.user?.id || null,
      actualizadoPor: req.user?.id || null,
    });

    return res.status(201).json({ ok: true, data: created });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/evaluar-todas', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const engine = getAlertaRulesEngine();
    const data = await engine.evaluarTodas({ payload: req.body?.payload || {} });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const { activa, frecuencia, tipoAlerta, q } = req.query;
    const engine = getAlertaRulesEngine();
    const data = await engine.listarReglas({
      activa: activa === undefined ? undefined : activa === 'true',
      frecuencia,
      tipoAlerta,
      q,
    });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const created = await ReglaAlerta.create({
      ...req.body,
      creadoPor: req.user?.id || null,
      actualizadoPor: req.user?.id || null,
    });
    return res.status(201).json({ ok: true, data: created });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/:id/activar', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const updated = await ReglaAlerta.findByIdAndUpdate(
      req.params.id,
      { activa: true, actualizadoPor: req.user?.id || null },
      { new: true }
    );
    if (!updated) return res.status(404).json({ ok: false, error: 'Regla no encontrada' });
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/:id/desactivar', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const updated = await ReglaAlerta.findByIdAndUpdate(
      req.params.id,
      { activa: false, actualizadoPor: req.user?.id || null },
      { new: true }
    );
    if (!updated) return res.status(404).json({ ok: false, error: 'Regla no encontrada' });
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/:id/evaluar', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const engine = getAlertaRulesEngine();
    const data = await engine.evaluarRegla(req.params.id, { payload: req.body?.payload || {} });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.get('/:id', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const item = await ReglaAlerta.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, error: 'Regla no encontrada' });
    return res.json({ ok: true, data: item });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.put('/:id', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const updated = await ReglaAlerta.findByIdAndUpdate(
      req.params.id,
      { ...req.body, actualizadoPor: req.user?.id || null },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, error: 'Regla no encontrada' });
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.delete('/:id', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const deleted = await ReglaAlerta.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Regla no encontrada' });
    return res.json({ ok: true, data: { id: req.params.id } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
