const express = require('express');
const router = express.Router();
const { Agendamiento } = require('../models');

/**
 * GET /api/agendamientos
 * Listar agendamientos
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, appointmentType, idBranch, startDate, endDate } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (appointmentType) query.appointmentType = appointmentType;
    if (idBranch) query.idBranch = idBranch;
    
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }
    
    const agendamientos = await Agendamiento.find(query)
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Agendamiento.countDocuments(query);
    
    res.json({
      success: true,
      data: agendamientos,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error listing agendamientos:', error);
    res.status(500).json({
      error: true,
      message: 'Error al listar agendamientos'
    });
  }
});

/**
 * GET /api/agendamientos/:id
 * Obtener agendamiento por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const agendamiento = await Agendamiento.findById(req.params.id);
    
    if (!agendamiento) {
      return res.status(404).json({
        error: true,
        message: 'Agendamiento no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: agendamiento
    });
  } catch (error) {
    console.error('Error getting agendamiento:', error);
    res.status(500).json({
      error: true,
      message: 'Error al obtener agendamiento'
    });
  }
});

/**
 * POST /api/agendamientos
 * Crear nuevo agendamiento
 */
router.post('/', async (req, res) => {
  try {
    const nuevoAgendamiento = new Agendamiento(req.body);
    await nuevoAgendamiento.save();
    
    res.status(201).json({
      success: true,
      data: nuevoAgendamiento
    });
  } catch (error) {
    console.error('Error creating agendamiento:', error);
    res.status(500).json({
      error: true,
      message: 'Error al crear agendamiento'
    });
  }
});

/**
 * PUT /api/agendamientos/:id
 * Actualizar agendamiento
 */
router.put('/:id', async (req, res) => {
  try {
    const agendamiento = await Agendamiento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!agendamiento) {
      return res.status(404).json({
        error: true,
        message: 'Agendamiento no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: agendamiento
    });
  } catch (error) {
    console.error('Error updating agendamiento:', error);
    res.status(500).json({
      error: true,
      message: 'Error al actualizar agendamiento'
    });
  }
});

/**
 * DELETE /api/agendamientos/:id
 * Eliminar agendamiento
 */
router.delete('/:id', async (req, res) => {
  try {
    const agendamiento = await Agendamiento.findByIdAndDelete(req.params.id);
    
    if (!agendamiento) {
      return res.status(404).json({
        error: true,
        message: 'Agendamiento no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Agendamiento eliminado'
    });
  } catch (error) {
    console.error('Error deleting agendamiento:', error);
    res.status(500).json({
      error: true,
      message: 'Error al eliminar agendamiento'
    });
  }
});

module.exports = router;
