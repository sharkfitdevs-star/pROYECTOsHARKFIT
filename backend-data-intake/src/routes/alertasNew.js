const express = require('express');
const router = express.Router();
const { Alerta } = require('../models');

/**
 * GET /api/alertas
 * Listar alertas
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, priority, idBranch } = req.query;
    
    const query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (idBranch) query.idBranch = idBranch;
    
    const alertas = await Alerta.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Alerta.countDocuments(query);
    
    res.json({
      success: true,
      data: alertas,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error listing alertas:', error);
    res.status(500).json({
      error: true,
      message: 'Error al listar alertas'
    });
  }
});

/**
 * GET /api/alertas/:id
 * Obtener alerta por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const alerta = await Alerta.findById(req.params.id);
    
    if (!alerta) {
      return res.status(404).json({
        error: true,
        message: 'Alerta no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: alerta
    });
  } catch (error) {
    console.error('Error getting alerta:', error);
    res.status(500).json({
      error: true,
      message: 'Error al obtener alerta'
    });
  }
});

/**
 * POST /api/alertas
 * Crear nueva alerta
 */
router.post('/', async (req, res) => {
  try {
    const nuevaAlerta = new Alerta(req.body);
    await nuevaAlerta.save();
    
    res.status(201).json({
      success: true,
      data: nuevaAlerta
    });
  } catch (error) {
    console.error('Error creating alerta:', error);
    res.status(500).json({
      error: true,
      message: 'Error al crear alerta'
    });
  }
});

/**
 * PUT /api/alertas/:id
 * Actualizar alerta
 */
router.put('/:id', async (req, res) => {
  try {
    const alerta = await Alerta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!alerta) {
      return res.status(404).json({
        error: true,
        message: 'Alerta no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: alerta
    });
  } catch (error) {
    console.error('Error updating alerta:', error);
    res.status(500).json({
      error: true,
      message: 'Error al actualizar alerta'
    });
  }
});

/**
 * POST /api/alertas/:id/resolver
 * Resolver alerta
 */
router.post('/:id/resolver', async (req, res) => {
  try {
    const { userId, userName, notes } = req.body;
    
    const alerta = await Alerta.findById(req.params.id);
    
    if (!alerta) {
      return res.status(404).json({
        error: true,
        message: 'Alerta no encontrada'
      });
    }
    
    alerta.resolve(userId, userName, notes);
    await alerta.save();
    
    res.json({
      success: true,
      data: alerta
    });
  } catch (error) {
    console.error('Error resolving alerta:', error);
    res.status(500).json({
      error: true,
      message: 'Error al resolver alerta'
    });
  }
});

module.exports = router;
