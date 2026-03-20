const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const Automatizacion = require('../models/automatizaciones/Automatizacion');
const { getAutomatizacionService, dispararEvento } = require('../config/automatizaciones.integration');

const ROLES_LECTURA = ['owner', 'admin', 'manager'];
const ROLES_ADMIN = ['owner', 'admin'];

router.use(requireAuth);

router.get('/catalogos', requireRole(ROLES_LECTURA), async (req, res) => {
  const service = getAutomatizacionService();
  return res.json({ ok: true, data: service.getCatalogos() });
});

router.get('/estadisticas/general', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const service = getAutomatizacionService();
    const data = await service.estadisticasGenerales();
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/disparar-evento', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const { evento, payload = {}, contexto = {} } = req.body || {};
    if (!evento) return res.status(400).json({ ok: false, error: 'evento es requerido' });

    const result = await dispararEvento(evento, payload, {
      ...contexto,
      usuario: req.user?.id || null,
      origen: 'api_manual',
    });

    return res.json({ ok: true, data: result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const { activa, evento, q } = req.query;
    const service = getAutomatizacionService();
    const data = await service.listar({
      activa: activa === undefined ? undefined : activa === 'true',
      evento,
      q,
    });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const body = req.body || {};
    const created = await Automatizacion.create({
      ...body,
      creadoPor: req.user?.id || null,
      actualizadoPor: req.user?.id || null,
    });
    const service = getAutomatizacionService();
    await service.recargarSuscripciones();
    return res.status(201).json({ ok: true, data: created });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.get('/:id/logs', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const service = getAutomatizacionService();
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const data = await service.logs(req.params.id, limit);
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/:id/activar', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const updated = await Automatizacion.findByIdAndUpdate(
      req.params.id,
      { activa: true, archivada: false, actualizadoPor: req.user?.id || null },
      { new: true }
    );
    if (!updated) return res.status(404).json({ ok: false, error: 'Automatizacion no encontrada' });
    const service = getAutomatizacionService();
    await service.recargarSuscripciones();
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/:id/desactivar', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const updated = await Automatizacion.findByIdAndUpdate(
      req.params.id,
      { activa: false, actualizadoPor: req.user?.id || null },
      { new: true }
    );
    if (!updated) return res.status(404).json({ ok: false, error: 'Automatizacion no encontrada' });
    const service = getAutomatizacionService();
    await service.recargarSuscripciones();
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/:id/ejecutar', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const service = getAutomatizacionService();
    const result = await service.ejecutarManualmente(req.params.id, req.body?.payload || {}, {
      usuario: req.user?.id || null,
      origen: 'manual',
    });
    return res.json({ ok: true, data: result });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/:id/probar-condiciones', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const service = getAutomatizacionService();
    const result = await service.probarCondiciones(req.params.id, req.body?.payload || {}, req.body?.contexto || {});
    return res.json({ ok: true, data: result });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/:id/duplicar', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const original = await Automatizacion.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ ok: false, error: 'Automatizacion no encontrada' });

    const duplicated = await Automatizacion.create({
      ...original,
      _id: undefined,
      nombre: `${original.nombre} (copia)`,
      activa: false,
      archivada: false,
      creadoPor: req.user?.id || null,
      actualizadoPor: req.user?.id || null,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return res.status(201).json({ ok: true, data: duplicated });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.get('/:id', requireRole(ROLES_LECTURA), async (req, res) => {
  try {
    const item = await Automatizacion.findById(req.params.id).lean();
    if (!item || item.archivada) return res.status(404).json({ ok: false, error: 'Automatizacion no encontrada' });
    return res.json({ ok: true, data: item });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.put('/:id', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const updated = await Automatizacion.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        actualizadoPor: req.user?.id || null,
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, error: 'Automatizacion no encontrada' });
    const service = getAutomatizacionService();
    await service.recargarSuscripciones();
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.delete('/:id', requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const archived = await Automatizacion.findByIdAndUpdate(
      req.params.id,
      { archivada: true, activa: false, actualizadoPor: req.user?.id || null },
      { new: true }
    );
    if (!archived) return res.status(404).json({ ok: false, error: 'Automatizacion no encontrada' });
    const service = getAutomatizacionService();
    await service.recargarSuscripciones();
    return res.json({ ok: true, data: archived });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
