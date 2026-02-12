const express = require('express');
const router = express.Router();
const { Cliente } = require('../models');

/**
 * GET /api/clientes
 * Listar clientes
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, active, search, idBranch } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (active !== undefined) query.active = active === 'true';
    if (idBranch) query.idBranch = idBranch;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } },
        { cellPhone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const clientes = await Cliente.find(query)
      .sort({ registrationDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Cliente.countDocuments(query);
    
    res.json({
      success: true,
      data: clientes,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error listing clientes:', error);
    res.status(500).json({
      error: true,
      message: 'Error al listar clientes'
    });
  }
});

/**
 * GET /api/clientes/:id
 * Obtener cliente por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        error: true,
        message: 'Cliente no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    console.error('Error getting cliente:', error);
    res.status(500).json({
      error: true,
      message: 'Error al obtener cliente'
    });
  }
});

/**
 * POST /api/clientes
 * Crear nuevo cliente
 */
router.post('/', async (req, res) => {
  try {
    const nuevoCliente = new Cliente(req.body);
    await nuevoCliente.save();
    
    res.status(201).json({
      success: true,
      data: nuevoCliente
    });
  } catch (error) {
    console.error('Error creating cliente:', error);
    res.status(500).json({
      error: true,
      message: 'Error al crear cliente'
    });
  }
});

/**
 * PUT /api/clientes/:id
 * Actualizar cliente
 */
router.put('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!cliente) {
      return res.status(404).json({
        error: true,
        message: 'Cliente no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    console.error('Error updating cliente:', error);
    res.status(500).json({
      error: true,
      message: 'Error al actualizar cliente'
    });
  }
});

/**
 * DELETE /api/clientes/:id
 * Eliminar cliente
 */
router.delete('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        error: true,
        message: 'Cliente no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Cliente eliminado'
    });
  } catch (error) {
    console.error('Error deleting cliente:', error);
    res.status(500).json({
      error: true,
      message: 'Error al eliminar cliente'
    });
  }
});

/**
 * GET /api/clientes/stats/resumen
 * Obtener estadísticas de clientes
 */
router.get('/stats/resumen', async (req, res) => {
  try {
    const total = await Cliente.countDocuments();
    const activos = await Cliente.countDocuments({ active: true });
    const inactivos = await Cliente.countDocuments({ active: false });
    
    res.json({
      success: true,
      data: {
        total,
        activos,
        inactivos,
        conMembresia: activos
      }
    });
  } catch (error) {
    console.error('Error getting client stats:', error);
    res.status(500).json({
      error: true,
      message: 'Error al obtener estadísticas'
    });
  }
});

module.exports = router;
