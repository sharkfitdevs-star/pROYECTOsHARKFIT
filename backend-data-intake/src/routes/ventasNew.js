const express = require('express');
const router = express.Router();
const { Venta } = require('../models');

/**
 * GET /api/ventas
 * Listar ventas
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, saleType, paymentStatus, idBranch, idMember } = req.query;
    
    const query = {};
    
    if (saleType) query.saleType = saleType;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (idBranch) query.idBranch = idBranch;
    if (idMember) query.idMember = idMember;
    
    const ventas = await Venta.find(query)
      .sort({ saleDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Venta.countDocuments(query);
    
    res.json({
      success: true,
      data: ventas,
      total: count,
      page: parseInt(page),
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


module.exports = router;
