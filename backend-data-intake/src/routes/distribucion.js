const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const Distribucion = require('../models/operaciones/Distribucion');

// ============================================================================
// LISTAR DISTRIBUCIONES
// ============================================================================

router.get('/', requireAuth, async (req, res) => {
  try {
    const { sede, estado, tipo, fecha_desde, fecha_hasta, page = 1, limit = 20 } = req.query;

    const query = { activo: true };
    if (sede) query.sede = sede;
    if (estado) query.estado = estado;
    if (tipo) query.tipo = tipo;
    if (fecha_desde || fecha_hasta) {
      query.fecha_inicio = {};
      if (fecha_desde) query.fecha_inicio.$gte = new Date(fecha_desde);
      if (fecha_hasta) query.fecha_inicio.$lte = new Date(fecha_hasta);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [distribuciones, total] = await Promise.all([
      Distribucion.find(query)
        .populate('sede', 'nombre')
        .populate('asignaciones.colaborador', 'nombres apellido_paterno cargo foto')
        .sort({ fecha_inicio: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Distribucion.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: distribuciones,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error al listar distribuciones', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener distribuciones' });
  }
});

// ============================================================================
// RESUMEN
// ============================================================================

router.get('/resumen', requireAuth, async (req, res) => {
  try {
    const { sede } = req.query;
    const match = { activo: true };
    if (sede) match.sede = new mongoose.Types.ObjectId(sede);

    const [porEstado, porTipo, totales] = await Promise.all([
      Distribucion.aggregate([
        { $match: match },
        { $group: { _id: '$estado', cantidad: { $sum: 1 } } }
      ]),
      Distribucion.aggregate([
        { $match: match },
        { $group: { _id: '$tipo', cantidad: { $sum: 1 } } }
      ]),
      Distribucion.aggregate([
        { $match: match },
        { $group: {
            _id: null,
            total: { $sum: 1 },
            publicados: { $sum: { $cond: [{ $eq: ['$estado', 'publicado'] }, 1, 0] } },
            en_curso: { $sum: { $cond: [{ $eq: ['$estado', 'en_curso'] }, 1, 0] } },
            total_asignaciones: { $sum: { $size: '$asignaciones' } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totales: totales[0] || { total: 0, publicados: 0, en_curso: 0, total_asignaciones: 0 },
        por_estado: porEstado,
        por_tipo: porTipo
      }
    });
  } catch (error) {
    logger.error('Error al obtener resumen', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
});

// ============================================================================
// CALENDARIO (Vista semanal/mensual)
// ============================================================================

router.get('/calendario', requireAuth, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, sede } = req.query;
    
    const query = {
      activo: true,
      estado: { $in: ['publicado', 'en_curso'] },
      fecha_inicio: { $lte: new Date(fecha_fin) },
      $or: [
        { fecha_fin: { $gte: new Date(fecha_inicio) } },
        { fecha_fin: null }
      ]
    };
    if (sede) query.sede = sede;

    const distribuciones = await Distribucion.find(query)
      .populate('asignaciones.colaborador', 'nombres apellido_paterno cargo foto')
      .sort({ fecha_inicio: 1 });

    res.json({ success: true, data: distribuciones });
  } catch (error) {
    logger.error('Error al obtener calendario', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener calendario' });
  }
});

// ============================================================================
// OBTENER POR ID
// ============================================================================

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const distribucion = await Distribucion.findById(req.params.id)
      .populate('sede', 'nombre')
      .populate('asignaciones.colaborador', 'nombres apellido_paterno cargo departamento foto telefono')
      .populate('creado_por', 'firstName lastName')
      .populate('publicado_por', 'firstName lastName');

    if (!distribucion) {
      return res.status(404).json({ success: false, error: 'Distribución no encontrada' });
    }

    res.json({ success: true, data: distribucion });
  } catch (error) {
    logger.error('Error al obtener distribución', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener distribución' });
  }
});

// ============================================================================
// CREAR
// ============================================================================

router.post('/', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const distribucion = new Distribucion({
      ...req.body,
      creado_por: req.user.id
    });

    await distribucion.save();
    logger.info('Distribución creada', { distribucionId: distribucion._id });
    
    const distribucionPopulada = await Distribucion.findById(distribucion._id)
      .populate('asignaciones.colaborador', 'nombres apellido_paterno');

    res.status(201).json({ success: true, data: distribucionPopulada });
  } catch (error) {
    logger.error('Error al crear distribución', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear distribución' });
  }
});

// ============================================================================
// ACTUALIZAR
// ============================================================================

router.put('/:id', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const distribucion = await Distribucion.findByIdAndUpdate(
      req.params.id,
      { ...req.body, actualizado_por: req.user.id },
      { new: true, runValidators: true }
    ).populate('asignaciones.colaborador', 'nombres apellido_paterno');

    if (!distribucion) {
      return res.status(404).json({ success: false, error: 'Distribución no encontrada' });
    }

    logger.info('Distribución actualizada', { distribucionId: distribucion._id });
    res.json({ success: true, data: distribucion });
  } catch (error) {
    logger.error('Error al actualizar distribución', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar distribución' });
  }
});

// ============================================================================
// PUBLICAR
// ============================================================================

router.post('/:id/publicar', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const distribucion = await Distribucion.findByIdAndUpdate(
      req.params.id,
      {
        estado: 'publicado',
        publicado_por: req.user.id,
        fecha_publicacion: new Date()
      },
      { new: true }
    );

    if (!distribucion) {
      return res.status(404).json({ success: false, error: 'Distribución no encontrada' });
    }

    logger.info('Distribución publicada', { distribucionId: distribucion._id });
    res.json({ success: true, data: distribucion });
  } catch (error) {
    logger.error('Error al publicar distribución', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al publicar distribución' });
  }
});

// ============================================================================
// AGREGAR ASIGNACIÓN
// ============================================================================

router.post('/:id/asignacion', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const distribucion = await Distribucion.findById(req.params.id);
    if (!distribucion) {
      return res.status(404).json({ success: false, error: 'Distribución no encontrada' });
    }

    distribucion.asignaciones.push(req.body);
    await distribucion.save();

    const distribucionPopulada = await Distribucion.findById(distribucion._id)
      .populate('asignaciones.colaborador', 'nombres apellido_paterno');

    logger.info('Asignación agregada', { distribucionId: distribucion._id });
    res.json({ success: true, data: distribucionPopulada });
  } catch (error) {
    logger.error('Error al agregar asignación', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al agregar asignación' });
  }
});

// ============================================================================
// ELIMINAR ASIGNACIÓN
// ============================================================================

router.delete('/:id/asignacion/:asignacionId', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const distribucion = await Distribucion.findById(req.params.id);
    if (!distribucion) {
      return res.status(404).json({ success: false, error: 'Distribución no encontrada' });
    }

    distribucion.asignaciones.id(req.params.asignacionId).remove();
    await distribucion.save();

    logger.info('Asignación eliminada', { distribucionId: distribucion._id });
    res.json({ success: true, data: distribucion });
  } catch (error) {
    logger.error('Error al eliminar asignación', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al eliminar asignación' });
  }
});

// ============================================================================
// CONFIRMAR ASIGNACIÓN (por colaborador)
// ============================================================================

router.post('/:id/asignacion/:asignacionId/confirmar', requireAuth, async (req, res) => {
  try {
    const distribucion = await Distribucion.findById(req.params.id);
    if (!distribucion) {
      return res.status(404).json({ success: false, error: 'Distribución no encontrada' });
    }

    const asignacion = distribucion.asignaciones.id(req.params.asignacionId);
    if (!asignacion) {
      return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
    }

    asignacion.confirmado = true;
    asignacion.fecha_confirmacion = new Date();
    await distribucion.save();

    logger.info('Asignación confirmada', { distribucionId: distribucion._id, asignacionId: req.params.asignacionId });
    res.json({ success: true, data: distribucion });
  } catch (error) {
    logger.error('Error al confirmar asignación', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al confirmar asignación' });
  }
});

// ============================================================================
// ELIMINAR DISTRIBUCIÓN
// ============================================================================

router.delete('/:id', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const distribucion = await Distribucion.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!distribucion) {
      return res.status(404).json({ success: false, error: 'Distribución no encontrada' });
    }

    logger.info('Distribución eliminada', { distribucionId: distribucion._id });
    res.json({ success: true, message: 'Distribución eliminada' });
  } catch (error) {
    logger.error('Error al eliminar', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al eliminar distribución' });
  }
});


// DELETE /api/distribucion/importados
router.delete('/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const Distribucion = require('../models/operaciones/Distribucion');
    const result = await Distribucion.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

