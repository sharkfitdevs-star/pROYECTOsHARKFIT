const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const Candidato = require('../models/rrhh/Candidato');

// ============================================================================
// LISTAR CANDIDATOS
// ============================================================================

router.get('/', requireAuth, async (req, res) => {
  try {
    const { estado, cargo, fuente, page = 1, limit = 20 } = req.query;

    const query = { activo: true };
    if (estado) query.estado = estado;
    if (cargo) query.cargo_postulado = { $regex: cargo, $options: 'i' };
    if (fuente) query.fuente = fuente;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [candidatos, total] = await Promise.all([
      Candidato.find(query)
        .populate('referido_por', 'nombres apellido_paterno')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Candidato.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: candidatos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error al listar candidatos', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener candidatos' });
  }
});

// ============================================================================
// RESUMEN / PIPELINE
// ============================================================================

router.get('/resumen', requireAuth, async (req, res) => {
  try {
    const [porEstado, porFuente, totales] = await Promise.all([
      Candidato.getResumen(),
      Candidato.getPorFuente(),
      Candidato.aggregate([
        { $match: { activo: true } },
        { $group: {
            _id: null,
            total: { $sum: 1 },
            nuevos: { $sum: { $cond: [{ $eq: ['$estado', 'nuevo'] }, 1, 0] } },
            en_proceso: { $sum: { $cond: [{ $in: ['$estado', ['revision_cv', 'entrevista_telefonica', 'entrevista_presencial', 'prueba_tecnica', 'entrevista_final', 'oferta']] }, 1, 0] } },
            contratados: { $sum: { $cond: [{ $eq: ['$estado', 'contratado'] }, 1, 0] } },
            rechazados: { $sum: { $cond: [{ $in: ['$estado', ['rechazado', 'descartado']] }, 1, 0] } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totales: totales[0] || { total: 0, nuevos: 0, en_proceso: 0, contratados: 0, rechazados: 0 },
        por_estado: porEstado,
        por_fuente: porFuente
      }
    });
  } catch (error) {
    logger.error('Error al obtener resumen', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
});

// ============================================================================
// PIPELINE (Kanban)
// ============================================================================

router.get('/pipeline', requireAuth, async (req, res) => {
  try {
    const etapas = ['nuevo', 'revision_cv', 'entrevista_telefonica', 'entrevista_presencial', 'prueba_tecnica', 'entrevista_final', 'oferta'];
    
    const candidatos = await Candidato.find({
      activo: true,
      estado: { $in: etapas }
    }).sort({ createdAt: -1 });

    const pipeline = {};
    etapas.forEach(etapa => {
      pipeline[etapa] = candidatos.filter(c => c.estado === etapa);
    });

    res.json({ success: true, data: pipeline });
  } catch (error) {
    logger.error('Error al obtener pipeline', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener pipeline' });
  }
});

// ============================================================================
// OBTENER CANDIDATO POR ID
// ============================================================================

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const candidato = await Candidato.findById(req.params.id)
      .populate('referido_por', 'nombres apellido_paterno cargo')
      .populate('evaluaciones.evaluador', 'nombres apellido_paterno')
      .populate('entrevistas.entrevistadores', 'nombres apellido_paterno');

    if (!candidato) {
      return res.status(404).json({ success: false, error: 'Candidato no encontrado' });
    }

    res.json({ success: true, data: candidato });
  } catch (error) {
    logger.error('Error al obtener candidato', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener candidato' });
  }
});

// ============================================================================
// CREAR CANDIDATO
// ============================================================================

router.post('/', requireAuth, async (req, res) => {
  try {
    const candidato = new Candidato({
      ...req.body,
      creado_por: req.user.id
    });

    await candidato.save();
    logger.info('Candidato creado', { candidatoId: candidato._id });
    res.status(201).json({ success: true, data: candidato });
  } catch (error) {
    logger.error('Error al crear candidato', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear candidato' });
  }
});

// ============================================================================
// ACTUALIZAR CANDIDATO
// ============================================================================

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const candidato = await Candidato.findByIdAndUpdate(
      req.params.id,
      { ...req.body, actualizado_por: req.user.id },
      { new: true, runValidators: true }
    );

    if (!candidato) {
      return res.status(404).json({ success: false, error: 'Candidato no encontrado' });
    }

    logger.info('Candidato actualizado', { candidatoId: candidato._id });
    res.json({ success: true, data: candidato });
  } catch (error) {
    logger.error('Error al actualizar candidato', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar candidato' });
  }
});

// ============================================================================
// CAMBIAR ESTADO (Mover en pipeline)
// ============================================================================

router.post('/:id/cambiar-estado', requireAuth, async (req, res) => {
  try {
    const { estado, motivo } = req.body;
    
    const updateData = { estado, actualizado_por: req.user.id };
    if (estado === 'descartado' || estado === 'rechazado') {
      updateData.motivo_descarte = motivo;
      updateData.fecha_descarte = new Date();
    }

    const candidato = await Candidato.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!candidato) {
      return res.status(404).json({ success: false, error: 'Candidato no encontrado' });
    }

    logger.info('Estado de candidato actualizado', { candidatoId: candidato._id, estado });
    res.json({ success: true, data: candidato });
  } catch (error) {
    logger.error('Error al cambiar estado', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al cambiar estado' });
  }
});

// ============================================================================
// AGREGAR EVALUACIÓN
// ============================================================================

router.post('/:id/evaluacion', requireAuth, async (req, res) => {
  try {
    const candidato = await Candidato.findById(req.params.id);
    if (!candidato) {
      return res.status(404).json({ success: false, error: 'Candidato no encontrado' });
    }

    candidato.evaluaciones.push({
      ...req.body,
      evaluador: req.body.evaluador || req.user.id,
      fecha: new Date()
    });

    await candidato.save();
    logger.info('Evaluación agregada', { candidatoId: candidato._id });
    res.json({ success: true, data: candidato });
  } catch (error) {
    logger.error('Error al agregar evaluación', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al agregar evaluación' });
  }
});

// ============================================================================
// PROGRAMAR ENTREVISTA
// ============================================================================

router.post('/:id/entrevista', requireAuth, async (req, res) => {
  try {
    const candidato = await Candidato.findById(req.params.id);
    if (!candidato) {
      return res.status(404).json({ success: false, error: 'Candidato no encontrado' });
    }

    candidato.entrevistas.push({
      ...req.body,
      estado: 'programada'
    });

    await candidato.save();
    logger.info('Entrevista programada', { candidatoId: candidato._id });
    res.json({ success: true, data: candidato });
  } catch (error) {
    logger.error('Error al programar entrevista', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al programar entrevista' });
  }
});

// ============================================================================
// CREAR OFERTA
// ============================================================================

router.post('/:id/oferta', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const candidato = await Candidato.findByIdAndUpdate(
      req.params.id,
      {
        estado: 'oferta',
        oferta: {
          ...req.body,
          fecha_oferta: new Date(),
          estado_oferta: 'pendiente'
        },
        actualizado_por: req.user.id
      },
      { new: true }
    );

    if (!candidato) {
      return res.status(404).json({ success: false, error: 'Candidato no encontrado' });
    }

    logger.info('Oferta creada', { candidatoId: candidato._id });
    res.json({ success: true, data: candidato });
  } catch (error) {
    logger.error('Error al crear oferta', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear oferta' });
  }
});

// ============================================================================
// CONTRATAR CANDIDATO
// ============================================================================

router.post('/:id/contratar', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const candidato = await Candidato.findByIdAndUpdate(
      req.params.id,
      {
        estado: 'contratado',
        'oferta.estado_oferta': 'aceptada',
        actualizado_por: req.user.id
      },
      { new: true }
    );

    if (!candidato) {
      return res.status(404).json({ success: false, error: 'Candidato no encontrado' });
    }

    logger.info('Candidato contratado', { candidatoId: candidato._id });
    res.json({ success: true, data: candidato });
  } catch (error) {
    logger.error('Error al contratar', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al contratar candidato' });
  }
});

// ============================================================================
// ELIMINAR CANDIDATO
// ============================================================================

router.delete('/:id', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const candidato = await Candidato.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!candidato) {
      return res.status(404).json({ success: false, error: 'Candidato no encontrado' });
    }

    logger.info('Candidato eliminado', { candidatoId: candidato._id });
    res.json({ success: true, message: 'Candidato eliminado' });
  } catch (error) {
    logger.error('Error al eliminar', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al eliminar candidato' });
  }
});

// ============================================================================
// CATÁLOGOS
// ============================================================================

router.get('/catalogos/fuentes', requireAuth, (req, res) => {
  const fuentes = [
    { value: 'portal_empleo', label: 'Portal de Empleo' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'referido', label: 'Referido' },
    { value: 'web', label: 'Página Web' },
    { value: 'agencia', label: 'Agencia de Empleo' },
    { value: 'feria_laboral', label: 'Feria Laboral' },
    { value: 'espontaneo', label: 'Espontáneo' },
    { value: 'otro', label: 'Otro' }
  ];
  res.json({ success: true, data: fuentes });
});

router.get('/catalogos/estados', requireAuth, (req, res) => {
  const estados = [
    { value: 'nuevo', label: 'Nuevo', color: '#6366f1' },
    { value: 'revision_cv', label: 'Revisión CV', color: '#8b5cf6' },
    { value: 'entrevista_telefonica', label: 'Entrevista Telefónica', color: '#3b82f6' },
    { value: 'entrevista_presencial', label: 'Entrevista Presencial', color: '#06b6d4' },
    { value: 'prueba_tecnica', label: 'Prueba Técnica', color: '#f59e0b' },
    { value: 'entrevista_final', label: 'Entrevista Final', color: '#10b981' },
    { value: 'oferta', label: 'Oferta', color: '#22c55e' },
    { value: 'contratado', label: 'Contratado', color: '#16a34a' },
    { value: 'rechazado', label: 'Rechazado', color: '#ef4444' },
    { value: 'descartado', label: 'Descartado', color: '#6b7280' },
    { value: 'lista_espera', label: 'Lista de Espera', color: '#9ca3af' }
  ];
  res.json({ success: true, data: estados });
});


// DELETE /api/reclutamiento/importados
router.delete('/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const Candidato = require('../models/rrhh/Candidato');
    const result = await Candidato.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

