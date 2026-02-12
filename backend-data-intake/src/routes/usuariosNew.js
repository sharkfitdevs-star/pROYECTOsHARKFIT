const express = require('express');
const router = express.Router();
const { Usuario } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * GET /api/usuarios
 * Listar usuarios
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, active, search } = req.query;
    
    const query = {};
    
    if (role) query.role = role;
    if (active !== undefined) query.active = active === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: {$regex: search, $options: 'i' } }
      ];
    }
    
    const usuarios = await Usuario.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Usuario.countDocuments(query);
    
    res.json({
      success: true,
      data: usuarios,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error listing usuarios:', error);
    res.status(500).json({
      error: true,
      message: 'Error al listar usuarios'
    });
  }
});

/**
 * GET /api/usuarios/:id
 * Obtener usuario por ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        error: true,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    console.error('Error getting usuario:', error);
    res.status(500).json({
      error: true,
      message: 'Error al obtener usuario'
    });
  }
});

/**
 * POST /api/usuarios
 * Crear nuevo usuario
 */
router.post('/', requireAuth, requireRole(['owner', 'admin', 'manager']), async (req, res) => {
  try {
    const nuevoUsuario = new Usuario(req.body);
    await nuevoUsuario.save();
    
    res.status(201).json({
      success: true,
      data: nuevoUsuario
    });
  } catch (error) {
    console.error('Error creating usuario:', error);
    res.status(500).json({
      error: true,
      message: 'Error al crear usuario'
    });
  }
});

/**
 * PUT /api/usuarios/:id
 * Actualizar usuario
 */
router.put('/:id', requireAuth, requireRole(['owner', 'admin', 'manager']), async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!usuario) {
      return res.status(404).json({
        error: true,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    console.error('Error updating usuario:', error);
    res.status(500).json({
      error: true,
      message: 'Error al actualizar usuario'
    });
  }
});

/**
 * DELETE /api/usuarios/:id
 * Eliminar usuario
 */
router.delete('/:id', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        error: true,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Usuario eliminado'
    });
  } catch (error) {
    console.error('Error deleting usuario:', error);
    res.status(500).json({
      error: true,
      message: 'Error al eliminar usuario'
    });
  }
});

module.exports = router;
