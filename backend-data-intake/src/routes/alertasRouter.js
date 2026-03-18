/**
 * RUTAS DE ALERTAS — v2
 *
 * GET    /api/alertas                    – listar con filtros y paginación
 * GET    /api/alertas/pendientes         – solo alertas activas (pendiente + en_proceso)
 * GET    /api/alertas/stats              – contadores para los 5 counters del dashboard
 * GET    /api/alertas/:id               – obtener una alerta
 * POST   /api/alertas                    – crear alerta manual
 * PUT    /api/alertas/:id               – actualizar campos libres
 * PUT    /api/alertas/:id/estado        – transición de estado con validación de flujo
 * POST   /api/alertas/:id/asignar       – asignar responsable (→ en_proceso)
 * POST   /api/alertas/:id/resolver      – marcar como resuelta
 * POST   /api/alertas/:id/descartar     – marcar como descartada
 * POST   /api/alertas/calcular-kpis     – disparar motor KPI manual
 * GET    /api/alertas/kpi/ultimo-reporte – resultado del último cálculo KPI
 */

const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Alerta, Venta, Cliente } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { calcularYGenerarAlertas } = require('../services/kpiAlertasService');

// ─────────────────────────────────────────────────────────────────────────────
// FLUJO DE ESTADOS VÁLIDOS
// pendiente → en_proceso → resuelta
//           → descartada
// en_proceso → resuelta
//            → descartada
//            → pendiente  (reabrir)
// ─────────────────────────────────────────────────────────────────────────────
const TRANSICIONES_VALIDAS = {
  pendiente:  ['en_proceso', 'descartada'],
  en_proceso: ['resuelta', 'descartada', 'pendiente'],
  resuelta:   [],
  descartada: [],
};

const ACTIVE_ALERT_STATUSES = ['pendiente', 'en_proceso'];

async function shouldDeleteObsoleteKpi(alerta) {
  const ventaQuery = {};
  const clienteQuery = {};

  if (alerta?.idBranch) {
    ventaQuery.idBranch = alerta.idBranch;
    clienteQuery.idBranch = alerta.idBranch;
  }

  if (alerta?.idMember) {
    ventaQuery.idMember = alerta.idMember;
    clienteQuery.idMember = alerta.idMember;
  }

  const [ventaExiste, clienteExiste] = await Promise.all([
    Venta.exists(ventaQuery),
    Cliente.exists(clienteQuery),
  ]);

  return !ventaExiste || !clienteExiste;
}

// ── GET /api/alertas ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      page     = 1,
      limit: rawLimit = 50,
      status,
      type,
      priority,
      idBranch,
      assignedTo,
      search,
      desde,
      hasta,
    } = req.query;

    let limitNum = Math.min(parseInt(rawLimit, 10) || 50, 5000); // subido a 5000
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const skip    = (pageNum - 1) * limitNum;

    const filtro = {};
    if (status)     filtro.status     = status;
    if (type)       filtro.type       = type;
    if (priority)   filtro.priority   = priority;
    if (idBranch)   filtro.idBranch   = idBranch;
    if (assignedTo) filtro.assignedTo = assignedTo;
    if (desde || hasta) {
      filtro.createdAt = {};
      if (desde) filtro.createdAt.$gte = new Date(desde);
      if (hasta) filtro.createdAt.$lte = new Date(hasta);
    }
    if (search) {
      filtro.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { memberName:  { $regex: search, $options: 'i' } },
      ];
    }

    const [total, data] = await Promise.all([
      Alerta.countDocuments(filtro),
      Alerta.find(filtro)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

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

// ── GET /api/alertas/pendientes ───────────────────────────────────────────────
// IMPORTANTE: debe ir ANTES de /:id
router.get('/pendientes', async (req, res) => {
  try {
    const { idBranch, assignedTo, limit: rawLimit = 100 } = req.query;
    const limitNum = Math.min(parseInt(rawLimit, 10) || 100, 500);

    const filtro = { status: { $in: ['pendiente', 'en_proceso'] } };
    if (idBranch)   filtro.idBranch   = idBranch;
    if (assignedTo) filtro.assignedTo = assignedTo;

    const data = await Alerta.find(filtro)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limitNum);

    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── GET /api/alertas/stats ────────────────────────────────────────────────────
// Devuelve los 5 contadores que usa el dashboard
router.get('/stats', async (req, res) => {
  try {
    const { idBranch } = req.query;
    const base = idBranch ? { idBranch } : {};
    const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);

    const [activas, vencidas, urgentes, en_proceso, completadas] = await Promise.all([
      Alerta.countDocuments({ ...base, status: { $in: ['pendiente', 'en_proceso'] } }),
      Alerta.countDocuments({ ...base, dueDate: { $lt: hoy }, status: { $nin: ['resuelta', 'descartada'] } }),
      Alerta.countDocuments({ ...base, priority: 'critica', status: { $in: ['pendiente', 'en_proceso'] } }),
      Alerta.countDocuments({ ...base, status: 'en_proceso' }),
      Alerta.countDocuments({ ...base, status: 'resuelta' }),
    ]);

    res.json({ success: true, data: { activas, vencidas, urgentes, en_proceso, completadas } });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── GET /api/alertas/kpi/ultimo-reporte ──────────────────────────────────────
router.get('/kpi/ultimo-reporte', async (req, res) => {
  try {
    const ultima = await Alerta
      .find({ source: 'kpi_engine' })
      .sort({ createdAt: -1 })
      .limit(1);
    res.json({ success: true, data: ultima[0] || null });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/alertas/calcular-kpis ──────────────────────────────────────────
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

// ── DELETE /api/alertas/obsoletas ───────────────────────────────────────────
// Limpia alertas KPI huérfanas cuando ya no existen ventas/clientes base.
router.delete('/obsoletas', requireAuth, async (req, res) => {
  try {
    const onlyActive = String(req.query.onlyActive || 'true').toLowerCase() !== 'false';
    const filtros = {
      type: 'kpi_rendimiento',
      ...(onlyActive ? { status: { $in: ACTIVE_ALERT_STATUSES } } : {}),
    };

    const candidatas = await Alerta.find(filtros).select('_id idAlert idBranch idMember status type');
    if (!candidatas.length) {
      return res.json({
        success: true,
        message: 'No hay alertas KPI para evaluar.',
        data: { revisadas: 0, eliminadas: 0 },
      });
    }

    const idsAEliminar = [];
    for (const alerta of candidatas) {
      if (await shouldDeleteObsoleteKpi(alerta)) {
        idsAEliminar.push(alerta._id);
      }
    }

    let eliminadas = 0;
    if (idsAEliminar.length > 0) {
      const result = await Alerta.deleteMany({ _id: { $in: idsAEliminar } });
      eliminadas = result.deletedCount || 0;
    }

    return res.json({
      success: true,
      message: `Limpieza completada. ${eliminadas} alerta(s) obsoleta(s) eliminada(s).`,
      data: { revisadas: candidatas.length, eliminadas },
    });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── DELETE /api/alertas/all ─────────────────────────────────────────────────
// Endpoint de limpieza manual total (uso operativo controlado).
router.delete('/all', requireAuth, async (req, res) => {
  try {
    const result = await Alerta.deleteMany({});
    return res.json({
      success: true,
      message: `Se eliminaron ${result.deletedCount || 0} alerta(s).`,
      data: { eliminadas: result.deletedCount || 0 },
    });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── GET /api/alertas/:id ──────────────────────────────────────────────────────
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

// ── POST /api/alertas ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
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
    // Proteger campos críticos de flujo — usar los endpoints específicos
    const { status, ...resto } = req.body;
    const alerta = await Alerta.findOneAndUpdate(
      { $or: [{ idAlert: req.params.id }, { _id: req.params.id }] },
      { ...resto, updatedAt: new Date() },
      { new: true }
    );
    if (!alerta) return res.status(404).json({ error: true, message: 'Alerta no encontrada' });
    res.json({ success: true, data: alerta });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── PUT /api/alertas/:id/estado ───────────────────────────────────────────────
router.put('/:id/estado', async (req, res) => {
  try {
    const { status: nuevoEstado } = req.body;
    if (!nuevoEstado) {
      return res.status(400).json({ error: true, message: 'Campo status requerido' });
    }

    const alerta = await Alerta.findOne({
      $or: [{ idAlert: req.params.id }, { _id: req.params.id }],
    });
    if (!alerta) return res.status(404).json({ error: true, message: 'Alerta no encontrada' });

    const permitidos = TRANSICIONES_VALIDAS[alerta.status] || [];
    if (!permitidos.includes(nuevoEstado)) {
      return res.status(422).json({
        error: true,
        message: `Transición inválida: ${alerta.status} → ${nuevoEstado}`,
        transicionesPermitidas: permitidos,
      });
    }

    alerta.status    = nuevoEstado;
    alerta.updatedAt = new Date();
    await alerta.save();

    res.json({ success: true, data: alerta });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/alertas/:id/asignar ─────────────────────────────────────────────
router.post('/:id/asignar', async (req, res) => {
  try {
    const { userId, userName } = req.body;
    if (!userId) return res.status(400).json({ error: true, message: 'userId requerido' });

    const alerta = await Alerta.findOne({
      $or: [{ idAlert: req.params.id }, { _id: req.params.id }],
    });
    if (!alerta) return res.status(404).json({ error: true, message: 'Alerta no encontrada' });

    alerta.assignTo(userId, userName);
    await alerta.save();

    res.json({ success: true, data: alerta });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/alertas/:id/resolver ───────────────────────────────────────────
router.post('/:id/resolver', async (req, res) => {
  try {
    const { resolvedBy, resolvedByName, resolutionNotes } = req.body;

    const alerta = await Alerta.findOne({
      $or: [{ idAlert: req.params.id }, { _id: req.params.id }],
    });
    if (!alerta) return res.status(404).json({ error: true, message: 'Alerta no encontrada' });

    if (!TRANSICIONES_VALIDAS[alerta.status]?.includes('resuelta') && alerta.status !== 'en_proceso') {
      return res.status(422).json({
        error: true,
        message: `No se puede resolver una alerta en estado "${alerta.status}"`,
      });
    }

    alerta.resolve(resolvedBy, resolvedByName, resolutionNotes);
    await alerta.save();

    res.json({ success: true, data: alerta });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/alertas/:id/descartar ──────────────────────────────────────────
router.post('/:id/descartar', async (req, res) => {
  try {
    const { motivo } = req.body;

    const alerta = await Alerta.findOne({
      $or: [{ idAlert: req.params.id }, { _id: req.params.id }],
    });
    if (!alerta) return res.status(404).json({ error: true, message: 'Alerta no encontrada' });

    if (!['pendiente', 'en_proceso'].includes(alerta.status)) {
      return res.status(422).json({
        error: true,
        message: `No se puede descartar una alerta en estado "${alerta.status}"`,
      });
    }

    alerta.status    = 'descartada';
    alerta.notes     = motivo || alerta.notes;
    alerta.updatedAt = new Date();
    await alerta.save();

    res.json({ success: true, data: alerta });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;
