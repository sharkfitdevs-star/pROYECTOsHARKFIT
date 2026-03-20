const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const Evaluacion = require('../models/rrhh/Evaluacion');
const Colaborador = require('../models/rrhh/Colaborador');

// ============================================================================
// LISTAR EVALUACIONES
// ============================================================================

router.get('/', requireAuth, async (req, res) => {
  try {
    const { 
      colaborador, 
      evaluador, 
      estado, 
      tipo, 
      año,
      page = 1, 
      limit = 20 
    } = req.query;

    const query = {};
    if (colaborador) query.colaborador = colaborador;
    if (evaluador) query.evaluador = evaluador;
    if (estado) query.estado = estado;
    if (tipo) query.tipo = tipo;
    if (año) query['periodo.año'] = parseInt(año);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [evaluaciones, total] = await Promise.all([
      Evaluacion.find(query)
        .populate('colaborador', 'nombres apellido_paterno cargo departamento foto codigo_empleado')
        .populate('evaluador', 'nombres apellido_paterno cargo')
        .sort({ fecha_evaluacion: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Evaluacion.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: evaluaciones,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error al listar evaluaciones', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener evaluaciones' });
  }
});

// ============================================================================
// RESUMEN DE EVALUACIONES
// ============================================================================

router.get('/resumen', requireAuth, async (req, res) => {
  try {
    const { año = new Date().getFullYear(), sede } = req.query;
    const match = { 'periodo.año': parseInt(año) };
    if (sede) match.sede = new mongoose.Types.ObjectId(sede);

    const [porEstado, porClasificacion, porTipo, totales] = await Promise.all([
      Evaluacion.aggregate([
        { $match: match },
        { $group: { _id: '$estado', cantidad: { $sum: 1 } } }
      ]),
      Evaluacion.aggregate([
        { $match: { ...match, estado: 'completada' } },
        { $group: { _id: '$clasificacion', cantidad: { $sum: 1 } } }
      ]),
      Evaluacion.aggregate([
        { $match: match },
        { $group: { _id: '$tipo', cantidad: { $sum: 1 } } }
      ]),
      Evaluacion.aggregate([
        { $match: match },
        { $group: {
            _id: null,
            total: { $sum: 1 },
            completadas: { $sum: { $cond: [{ $eq: ['$estado', 'completada'] }, 1, 0] } },
            pendientes: { $sum: { $cond: [{ $in: ['$estado', ['borrador', 'en_progreso', 'pendiente_revision']] }, 1, 0] } },
            promedio_general: { $avg: '$puntuacion_general' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totales: totales[0] || { total: 0, completadas: 0, pendientes: 0, promedio_general: 0 },
        por_estado: porEstado,
        por_clasificacion: porClasificacion,
        por_tipo: porTipo
      }
    });
  } catch (error) {
    logger.error('Error al obtener resumen', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
});

// ============================================================================
// MIS EVALUACIONES PENDIENTES (como evaluador)
// ============================================================================

router.get('/mis-pendientes', requireAuth, async (req, res) => {
  try {
    // Buscar el colaborador asociado al usuario
    const colaborador = await Colaborador.findOne({ usuario: req.user.id });
    
    if (!colaborador) {
      return res.json({ success: true, data: [] });
    }

    const evaluaciones = await Evaluacion.find({
      evaluador: colaborador._id,
      estado: { $in: ['borrador', 'en_progreso'] }
    })
      .populate('colaborador', 'nombres apellido_paterno cargo departamento foto')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: evaluaciones });
  } catch (error) {
    logger.error('Error al obtener pendientes', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener evaluaciones pendientes' });
  }
});

// ============================================================================
// OBTENER EVALUACIÓN POR ID
// ============================================================================

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const evaluacion = await Evaluacion.findById(req.params.id)
      .populate('colaborador', 'nombres apellido_paterno apellido_materno cargo departamento foto codigo_empleado rut fecha_ingreso sueldo_base')
      .populate('evaluador', 'nombres apellido_paterno cargo')
      .populate('revisado_por', 'firstName lastName')
      .populate('sede', 'nombre');

    if (!evaluacion) {
      return res.status(404).json({ success: false, error: 'Evaluación no encontrada' });
    }

    res.json({ success: true, data: evaluacion });
  } catch (error) {
    logger.error('Error al obtener evaluación', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener evaluación' });
  }
});

// ============================================================================
// CREAR EVALUACIÓN
// ============================================================================

router.post('/', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const evaluacion = new Evaluacion({
      ...req.body,
      creado_por: req.user.id
    });

    await evaluacion.save();
    
    // Actualizar fecha de última evaluación en el colaborador
    await Colaborador.findByIdAndUpdate(evaluacion.colaborador, {
      ultima_evaluacion: evaluacion.fecha_evaluacion
    });

    logger.info('Evaluación creada', { evaluacionId: evaluacion._id });
    
    const evaluacionPopulada = await Evaluacion.findById(evaluacion._id)
      .populate('colaborador', 'nombres apellido_paterno cargo')
      .populate('evaluador', 'nombres apellido_paterno');

    res.status(201).json({ success: true, data: evaluacionPopulada });
  } catch (error) {
    logger.error('Error al crear evaluación', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear evaluación' });
  }
});

// ============================================================================
// ACTUALIZAR EVALUACIÓN
// ============================================================================

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const evaluacion = await Evaluacion.findById(req.params.id);
    
    if (!evaluacion) {
      return res.status(404).json({ success: false, error: 'Evaluación no encontrada' });
    }

    if (evaluacion.estado === 'completada') {
      return res.status(400).json({ success: false, error: 'No se puede modificar una evaluación completada' });
    }

    Object.assign(evaluacion, req.body);
    evaluacion.actualizado_por = req.user.id;
    await evaluacion.save();

    logger.info('Evaluación actualizada', { evaluacionId: evaluacion._id });
    res.json({ success: true, data: evaluacion });
  } catch (error) {
    logger.error('Error al actualizar evaluación', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar evaluación' });
  }
});

// ============================================================================
// COMPLETAR EVALUACIÓN
// ============================================================================

router.post('/:id/completar', requireAuth, async (req, res) => {
  try {
    const evaluacion = await Evaluacion.findById(req.params.id);
    
    if (!evaluacion) {
      return res.status(404).json({ success: false, error: 'Evaluación no encontrada' });
    }

    if (!evaluacion.puntuacion_general && !evaluacion.criterios?.length) {
      return res.status(400).json({ success: false, error: 'Debe asignar puntuaciones antes de completar' });
    }

    evaluacion.estado = 'completada';
    evaluacion.confirmado_evaluador = true;
    evaluacion.fecha_confirmacion_evaluador = new Date();
    await evaluacion.save();

    // Actualizar promedio en el colaborador
    const evaluaciones = await Evaluacion.find({ 
      colaborador: evaluacion.colaborador, 
      estado: 'completada' 
    });
    
    if (evaluaciones.length > 0) {
      const promedio = evaluaciones.reduce((acc, e) => acc + (e.puntuacion_general || 0), 0) / evaluaciones.length;
      await Colaborador.findByIdAndUpdate(evaluacion.colaborador, {
        promedio_evaluaciones: Math.round(promedio * 10) / 10,
        ultima_evaluacion: new Date()
      });
    }

    logger.info('Evaluación completada', { evaluacionId: evaluacion._id });
    res.json({ success: true, data: evaluacion });
  } catch (error) {
    logger.error('Error al completar evaluación', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al completar evaluación' });
  }
});

// ============================================================================
// CONFIRMAR POR COLABORADOR
// ============================================================================

router.post('/:id/confirmar-colaborador', requireAuth, async (req, res) => {
  try {
    const { comentario } = req.body;
    
    const evaluacion = await Evaluacion.findByIdAndUpdate(
      req.params.id,
      {
        confirmado_colaborador: true,
        fecha_confirmacion_colaborador: new Date(),
        comentario_colaborador: comentario
      },
      { new: true }
    );

    if (!evaluacion) {
      return res.status(404).json({ success: false, error: 'Evaluación no encontrada' });
    }

    logger.info('Evaluación confirmada por colaborador', { evaluacionId: evaluacion._id });
    res.json({ success: true, data: evaluacion });
  } catch (error) {
    logger.error('Error al confirmar', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al confirmar evaluación' });
  }
});

// ============================================================================
// REVISIÓN RRHH
// ============================================================================

router.post('/:id/revision-rrhh', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { comentario } = req.body;
    
    const evaluacion = await Evaluacion.findByIdAndUpdate(
      req.params.id,
      {
        revisado_rrhh: true,
        fecha_revision_rrhh: new Date(),
        revisado_por: req.user.id,
        comentario_rrhh: comentario
      },
      { new: true }
    );

    if (!evaluacion) {
      return res.status(404).json({ success: false, error: 'Evaluación no encontrada' });
    }

    logger.info('Evaluación revisada por RRHH', { evaluacionId: evaluacion._id });
    res.json({ success: true, data: evaluacion });
  } catch (error) {
    logger.error('Error en revisión RRHH', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al revisar evaluación' });
  }
});

// ============================================================================
// ELIMINAR EVALUACIÓN
// ============================================================================

router.delete('/:id', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const evaluacion = await Evaluacion.findById(req.params.id);
    
    if (!evaluacion) {
      return res.status(404).json({ success: false, error: 'Evaluación no encontrada' });
    }

    if (evaluacion.estado === 'completada') {
      return res.status(400).json({ success: false, error: 'No se puede eliminar una evaluación completada' });
    }

    await Evaluacion.findByIdAndDelete(req.params.id);

    logger.info('Evaluación eliminada', { evaluacionId: req.params.id });
    res.json({ success: true, message: 'Evaluación eliminada' });
  } catch (error) {
    logger.error('Error al eliminar evaluación', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al eliminar evaluación' });
  }
});

// ============================================================================
// HISTORIAL DE UN COLABORADOR
// ============================================================================

router.get('/colaborador/:colaboradorId/historial', requireAuth, async (req, res) => {
  try {
    const evaluaciones = await Evaluacion.find({ 
      colaborador: req.params.colaboradorId,
      estado: 'completada'
    })
      .populate('evaluador', 'nombres apellido_paterno')
      .sort({ fecha_evaluacion: -1 });

    res.json({ success: true, data: evaluaciones });
  } catch (error) {
    logger.error('Error al obtener historial', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener historial' });
  }
});

// ============================================================================
// CATÁLOGOS
// ============================================================================

router.get('/catalogos/tipos', requireAuth, (req, res) => {
  const tipos = [
    { value: 'desempeno', label: 'Evaluación de Desempeño' },
    { value: 'competencias', label: 'Evaluación de Competencias' },
    { value: 'objetivos', label: 'Evaluación por Objetivos' },
    { value: 'periodo_prueba', label: 'Evaluación Período de Prueba' },
    { value: '360', label: 'Evaluación 360°' },
    { value: 'autoevaluacion', label: 'Autoevaluación' }
  ];
  res.json({ success: true, data: tipos });
});

router.get('/catalogos/criterios-base', requireAuth, (req, res) => {
  const criterios = [
    { nombre: 'Calidad del trabajo', categoria: 'competencias', peso: 20 },
    { nombre: 'Productividad', categoria: 'competencias', peso: 20 },
    { nombre: 'Puntualidad y asistencia', categoria: 'valores', peso: 15 },
    { nombre: 'Trabajo en equipo', categoria: 'habilidades', peso: 15 },
    { nombre: 'Comunicación', categoria: 'habilidades', peso: 10 },
    { nombre: 'Iniciativa', categoria: 'competencias', peso: 10 },
    { nombre: 'Compromiso', categoria: 'valores', peso: 10 }
  ];
  res.json({ success: true, data: criterios });
});


// DELETE /api/evaluaciones/importados
router.delete('/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const Evaluacion = require('../models/rrhh/Evaluacion');
    const result = await Evaluacion.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

