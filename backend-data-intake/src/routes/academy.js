const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const Curso = require('../models/formacion/Curso');

const ROLES_ADMIN = ['owner', 'admin', 'manager'];

// GET /api/academy - Listar cursos
router.get('/cursos', requireAuth, async (req, res) => {
  try {
    const { categoria, estado, nivel, page = 1, limit = 20 } = req.query;
    const query = { activo: true };
    
    if (categoria) query.categoria = categoria;
    if (estado) query.estado = estado;
    if (nivel) query.nivel = nivel;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [cursos, total] = await Promise.all([
      Curso.find(query)
        .populate('instructor_interno', 'nombres apellido_paterno')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Curso.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: cursos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error al listar cursos', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener cursos' });
  }
});

// GET /api/academy/resumen - Estadísticas
router.get('/resumen', requireAuth, async (req, res) => {
  try {
    const [total, activos, porCategoria] = await Promise.all([
      Curso.countDocuments({ activo: true }),
      Curso.countDocuments({ activo: true, estado: 'activo' }),
      Curso.aggregate([
        { $match: { activo: true } },
        { $group: { _id: '$categoria', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total,
        activos,
        porCategoria: porCategoria.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Error al obtener resumen', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
});

// GET /api/academy/:id - Obtener curso por ID
router.get('/cursos/:id', requireAuth, async (req, res) => {
  try {
    const curso = await Curso.findById(req.params.id)
      .populate('instructor_interno', 'nombres apellido_paterno email');
    
    if (!curso) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }
    
    res.json({ success: true, data: curso });
  } catch (error) {
    logger.error('Error al obtener curso', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener curso' });
  }
});

// POST /api/academy - Crear curso
router.post('/cursos', requireAuth, requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const curso = new Curso({
      ...req.body,
      creado_por: req.user.id
    });
    await curso.save();
    res.status(201).json({ success: true, data: curso });
  } catch (error) {
    logger.error('Error al crear curso', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear curso' });
  }
});

// PUT /api/academy/:id - Actualizar curso
router.put('/cursos/:id', requireAuth, requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const curso = await Curso.findByIdAndUpdate(
      req.params.id,
      { ...req.body, actualizado_por: req.user.id },
      { new: true }
    );
    
    if (!curso) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }
    
    res.json({ success: true, data: curso });
  } catch (error) {
    logger.error('Error al actualizar curso', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar curso' });
  }
});

// DELETE /api/academy/:id - Eliminar curso (soft delete)
router.delete('/cursos/:id', requireAuth, requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const curso = await Curso.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!curso) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }
    
    res.json({ success: true, message: 'Curso eliminado' });
  } catch (error) {
    logger.error('Error al eliminar curso', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al eliminar curso' });
  }
});

// DELETE /api/academy/importados - Eliminar cursos importados
router.delete('/importados', requireAuth, requireRole(ROLES_ADMIN), async (req, res) => {
  try {
    const result = await Curso.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    logger.error('Error al eliminar cursos importados', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

