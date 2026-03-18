const express = require('express');
const router = express.Router();
const { Venta } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// Todos considerados "pago" cuando tienen paymentStatus establecido
// (distinguible de las ventas normales que tienen saleType de membresía/plan)
const PAGO_STATUSES = ['Pendiente', 'Pagado', 'Vencido', 'Cerrada'];

// Todas las rutas requieren autenticación
router.use(requireAuth);

/**
 * GET /api/pagos
 * Listar pagos/payables con filtros opcionales
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      idMember,
      dateFrom,
      dateTo,
      page    = 1,
      limit   = 50,
      sortBy  = 'saleDate',
      sortDir = 'desc',
    } = req.query;

    const query = {};

    // Filtrar solo registros con paymentStatus (payables)
    if (status) {
      query.paymentStatus = status;
    } else {
      query.paymentStatus = { $in: PAGO_STATUSES };
    }

    if (idMember) query.idMember = idMember;

    if (dateFrom || dateTo) {
      query.saleDate = {};
      if (dateFrom) query.saleDate.$gte = new Date(dateFrom);
      if (dateTo)   query.saleDate.$lte = new Date(dateTo);
    }

    const sort     = { [sortBy]: sortDir === 'asc' ? 1 : -1 };
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const [data, total] = await Promise.all([
      Venta.find(query).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
      Venta.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error('Error listing pagos:', { error });
    res.status(500).json({ error: true, message: 'Error al listar pagos' });
  }
});

/**
 * GET /api/pagos/stats/resumen
 * Total por estado de pago
 */
router.get('/stats/resumen', async (req, res) => {
  try {
    const agg = await Venta.aggregate([
      { $match: { paymentStatus: { $in: PAGO_STATUSES } } },
      {
        $group: {
          _id:   '$paymentStatus',
          count: { $sum: 1 },
          total: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build structured summary
    const summary = { Pendiente: { count: 0, total: 0 }, Pagado: { count: 0, total: 0 }, Vencido: { count: 0, total: 0 } };
    for (const row of agg) {
      const key = row._id === 'Cerrada' ? 'Pagado' : (row._id || 'Otro');
      if (!summary[key]) summary[key] = { count: 0, total: 0 };
      summary[key].count += row.count;
      summary[key].total += row.total;
    }

    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Error getting pagos stats:', { error });
    res.status(500).json({ error: true, message: 'Error al obtener estadísticas de pagos' });
  }
});

/**
 * GET /api/pagos/vencidos
 * Pagos con dueDate anterior a hoy y estado !== 'Pagado'/'Cerrada'
 */
router.get('/vencidos', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const query = {
      dueDate: { $lt: new Date() },
      paymentStatus: { $nin: ['Pagado', 'Cerrada'] },
    };

    const [data, total] = await Promise.all([
      Venta.find(query).sort({ dueDate: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Venta.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error('Error getting pagos vencidos:', { error });
    res.status(500).json({ error: true, message: 'Error al obtener pagos vencidos' });
  }
});

/**
 * GET /api/pagos/:id
 * Detalle de un pago
 */
router.get('/:id', async (req, res) => {
  try {
    const pago = await Venta.findById(req.params.id);
    if (!pago) {
      return res.status(404).json({ error: true, message: 'Pago no encontrado' });
    }
    res.json({ success: true, data: pago });
  } catch (error) {
    logger.error('Error getting pago:', { error });
    res.status(500).json({ error: true, message: 'Error al obtener pago' });
  }
});

module.exports = router;
