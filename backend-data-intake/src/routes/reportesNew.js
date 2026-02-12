const express = require('express');
const router = express.Router();
const { Reporte } = require('../models');

/**
 * GET /api/reportes
 * Listar reportes
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, reportType, status, idBranch } = req.query;
    
    const query = {};
    
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;
    if (idBranch) query.idBranch = idBranch;
    
    const reportes = await Reporte.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Reporte.countDocuments(query);
    
    res.json({
      success: true,
      data: reportes,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error listing reportes:', error);
    res.status(500).json({
      error: true,
      message: 'Error al listar reportes'
    });
  }
});

/**
 * GET /api/reportes/:id
 * Obtener reporte por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const reporte = await Reporte.findById(req.params.id);
    
    if (!reporte) {
      return res.status(404).json({
        error: true,
        message: 'Reporte no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: reporte
    });
  } catch (error) {
    console.error('Error getting reporte:', error);
    res.status(500).json({
      error: true,
      message: 'Error al obtener reporte'
    });
  }
});

/**
 * POST /api/reportes
 * Crear/generar nuevo reporte
 */
router.post('/', async (req, res) => {
  try {
    const nuevoReporte = new Reporte({
      ...req.body,
      status: 'generando'
    });
    await nuevoReporte.save();
    
    // TODO: Generar reporte en background
    // Por ahora solo lo creamos
    
    res.status(201).json({
      success: true,
      data: nuevoReporte
    });
  } catch (error) {
    console.error('Error creating reporte:', error);
    res.status(500).json({
      error: true,
      message: 'Error al crear reporte'
    });
  }
});

/**
 * DELETE /api/reportes/:id
 * Eliminar reporte
 */
router.delete('/:id', async (req, res) => {
  try {
    const reporte = await Reporte.findByIdAndDelete(req.params.id);
    
    if (!reporte) {
      return res.status(404).json({
        error: true,
        message: 'Reporte no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Reporte eliminado'
    });
  } catch (error) {
    console.error('Error deleting reporte:', error);
    res.status(500).json({
      error: true,
      message: 'Error al eliminar reporte'
    });
  }
});

module.exports = router;
