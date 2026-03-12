const express = require('express');
const router = express.Router();
const { Venta } = require('../models');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/ventas
 * Listar ventas
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      estado,
      branchName,
      planName,
      page = 1,
      limit = 50,
      saleType,
      paymentStatus,
      idBranch,
      idMember
    } = req.query;

    const query = {};

    // text search across some fields
    if (search) {
      query.$or = [
        { memberName: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { planName: { $regex: search, $options: 'i' } }
      ];
    }

    if (estado) query.paymentStatus = estado;
    if (branchName) query.branchName = branchName;
    if (planName) query.planName = planName;

    // preserve existing filters for backwards compatibility
    if (saleType) query.saleType = saleType;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (idBranch) query.idBranch = idBranch;
    if (idMember) query.idMember = idMember;

    const ventas = await Venta.find(query)
      .sort({ saleDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const count = await Venta.countDocuments(query);

    res.json({
      success: true,
      data: ventas,
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    const { logger } = require('../utils/logger');
    logger.error('Error listing ventas:', { error });
    res.status(500).json({
      error: true,
      message: 'Error al listar ventas'
    });
  }
});

/**
 * GET /api/ventas/export
 * Exportar ventas (migración a cola)
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    const { queueExportTask } = require('../workers/api-worker');

    const job = await queueExportTask('ventas', format, filters);
    return res.status(200).json({ success: true, queued: true, jobId: job?.id || null });
  } catch (error) {
    logger.error('Error export ventas:', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ventas/:id
 * Obtener venta por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);
    
    if (!venta) {
      return res.status(404).json({
        error: true,
        message: 'Venta no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: venta
    });
  } catch (error) {
    logger.error('Error getting venta:', { error });
    res.status(500).json({
      error: true,
      message: 'Error al obtener venta'
    });
  }
});

/**
 * POST /api/ventas
 * Crear nueva venta
 */
router.post('/', async (req, res) => {
  try {
    const nuevaVenta = new Venta(req.body);
    await nuevaVenta.save();
    
    res.status(201).json({
      success: true,
      data: nuevaVenta
    });
  } catch (error) {
    logger.error('Error creating venta:', { error });
    res.status(500).json({
      error: true,
      message: 'Error al crear venta'
    });
  }
});

/**
 * PUT /api/ventas/:id
 * Actualizar venta
 */
router.put('/:id', async (req, res) => {
  try {
    const venta = await Venta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!venta) {
      return res.status(404).json({
        error: true,
        message: 'Venta no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: venta
    });
  } catch (error) {
    logger.error('Error updating venta:', { error });
    res.status(500).json({
      error: true,
      message: 'Error al actualizar venta'
    });
  }
});

/**
 * DELETE /api/ventas/importados
 * Eliminar todas las ventas importadas
 */
router.delete('/importados', requireAuth, async (req, res) => {
  try {
    const result = await Venta.deleteMany({ source: 'import_excel' });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error al eliminar ventas importadas' });
  }
});

/**
 * GET /api/ventas/stats/resumen
 * Estadísticas de ventas
 */
router.get('/stats/resumen', async (req, res) => {
  try {
    const total = await Venta.countDocuments();
    const totalMonto = await Venta.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const porEstado = await Venta.aggregate([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalVentas: total,
        montoTotal: totalMonto[0]?.total || 0,
        porEstado
      }
    });
  } catch (error) {
    logger.error('Error getting sales stats:', { error });
    res.status(500).json({
      error: true,
      message: 'Error al obtener estadísticas'
    });
  }
});

/**
 * DELETE /api/ventas/:id
 * Eliminar venta
 */
router.delete('/:id', async (req, res) => {
  try {
    const venta = await Venta.findByIdAndDelete(req.params.id);
    
    if (!venta) {
      return res.status(404).json({
        error: true,
        message: 'Venta no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Venta eliminada'
    });
  } catch (error) {
    logger.error('Error deleting venta:', { error });
    res.status(500).json({
      error: true,
      message: 'Error al eliminar venta'
    });
  }
});




module.exports = router;
