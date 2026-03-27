const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const Documento = require('../models/rrhh/Documento');

// ============================================================================
// LISTAR DOCUMENTOS
// ============================================================================

router.get('/', requireAuth, async (req, res) => {
  try {
    const { 
      colaborador, 
      tipo, 
      categoria,
      estado, 
      page = 1, 
      limit = 20 
    } = req.query;

    const query = { activo: true };
    if (colaborador) query.colaborador = colaborador;
    if (tipo) query.tipo = tipo;
    if (categoria) query.categoria = categoria;
    if (estado) query.estado = estado;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documentos, total] = await Promise.all([
      Documento.find(query)
        .populate('colaborador', 'nombres apellido_paterno cargo departamento codigo_empleado')
        .populate('verificado_por', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Documento.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: documentos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error al listar documentos', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener documentos' });
  }
});

// ============================================================================
// RESUMEN DE DOCUMENTOS
// ============================================================================

router.get('/resumen', requireAuth, async (req, res) => {
  try {
    const { sede } = req.query;
    const match = { activo: true };
    if (sede) match.sede = new mongoose.Types.ObjectId(sede);

    const [porEstado, porTipo, porCategoria, totales] = await Promise.all([
      Documento.aggregate([
        { $match: match },
        { $group: { _id: '$estado', cantidad: { $sum: 1 } } }
      ]),
      Documento.aggregate([
        { $match: match },
        { $group: { _id: '$tipo', cantidad: { $sum: 1 } } },
        { $sort: { cantidad: -1 } },
        { $limit: 10 }
      ]),
      Documento.aggregate([
        { $match: match },
        { $group: { _id: '$categoria', cantidad: { $sum: 1 } } }
      ]),
      Documento.aggregate([
        { $match: match },
        { $group: {
            _id: null,
            total: { $sum: 1 },
            vigentes: { $sum: { $cond: [{ $eq: ['$estado', 'vigente'] }, 1, 0] } },
            por_vencer: { $sum: { $cond: [{ $eq: ['$estado', 'por_vencer'] }, 1, 0] } },
            vencidos: { $sum: { $cond: [{ $eq: ['$estado', 'vencido'] }, 1, 0] } },
            verificados: { $sum: { $cond: ['$verificado', 1, 0] } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totales: totales[0] || { total: 0, vigentes: 0, por_vencer: 0, vencidos: 0, verificados: 0 },
        por_estado: porEstado,
        por_tipo: porTipo,
        por_categoria: porCategoria
      }
    });
  } catch (error) {
    logger.error('Error al obtener resumen', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
});

// ============================================================================
// DOCUMENTOS POR VENCER
// ============================================================================

router.get('/por-vencer', requireAuth, async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const documentos = await Documento.getPorVencer(parseInt(dias));
    res.json({ success: true, data: documentos });
  } catch (error) {
    logger.error('Error al obtener documentos por vencer', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener documentos' });
  }
});

// ============================================================================
// DOCUMENTOS VENCIDOS
// ============================================================================

router.get('/vencidos', requireAuth, async (req, res) => {
  try {
    const documentos = await Documento.getVencidos();
    res.json({ success: true, data: documentos });
  } catch (error) {
    logger.error('Error al obtener documentos vencidos', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener documentos' });
  }
});

// ============================================================================
// DOCUMENTOS DE UN COLABORADOR
// ============================================================================

router.get('/colaborador/:colaboradorId', requireAuth, async (req, res) => {
  try {
    const documentos = await Documento.getByColaborador(req.params.colaboradorId);
    res.json({ success: true, data: documentos });
  } catch (error) {
    logger.error('Error al obtener documentos del colaborador', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener documentos' });
  }
});

// ============================================================================
// OBTENER DOCUMENTO POR ID
// ============================================================================

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const documento = await Documento.findById(req.params.id)
      .populate('colaborador', 'nombres apellido_paterno apellido_materno cargo departamento rut')
      .populate('verificado_por', 'firstName lastName')
      .populate('firmado_por', 'nombres apellido_paterno');

    if (!documento) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }

    res.json({ success: true, data: documento });
  } catch (error) {
    logger.error('Error al obtener documento', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener documento' });
  }
});

// ============================================================================
// CREAR DOCUMENTO
// ============================================================================

router.post('/', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const documento = new Documento({
      ...req.body,
      creado_por: req.user.id
    });

    await documento.save();
    
    logger.info('Documento creado', { documentoId: documento._id, tipo: documento.tipo });
    
    const documentoPopulado = await Documento.findById(documento._id)
      .populate('colaborador', 'nombres apellido_paterno cargo');

    res.status(201).json({ success: true, data: documentoPopulado });
  } catch (error) {
    logger.error('Error al crear documento', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear documento' });
  }
});

// ============================================================================
// ACTUALIZAR DOCUMENTO
// ============================================================================

router.put('/:id', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const documento = await Documento.findByIdAndUpdate(
      req.params.id,
      { ...req.body, actualizado_por: req.user.id },
      { new: true, runValidators: true }
    ).populate('colaborador', 'nombres apellido_paterno cargo');

    if (!documento) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }

    logger.info('Documento actualizado', { documentoId: documento._id });
    res.json({ success: true, data: documento });
  } catch (error) {
    logger.error('Error al actualizar documento', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar documento' });
  }
});

// ============================================================================
// VERIFICAR DOCUMENTO
// ============================================================================

router.post('/:id/verificar', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const documento = await Documento.findByIdAndUpdate(
      req.params.id,
      {
        verificado: true,
        verificado_por: req.user.id,
        fecha_verificacion: new Date()
      },
      { new: true }
    );

    if (!documento) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }

    logger.info('Documento verificado', { documentoId: documento._id });
    res.json({ success: true, data: documento });
  } catch (error) {
    logger.error('Error al verificar documento', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al verificar documento' });
  }
});

// ============================================================================
// ARCHIVAR DOCUMENTO
// ============================================================================

router.post('/:id/archivar', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const documento = await Documento.findByIdAndUpdate(
      req.params.id,
      { estado: 'archivado', actualizado_por: req.user.id },
      { new: true }
    );

    if (!documento) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }

    logger.info('Documento archivado', { documentoId: documento._id });
    res.json({ success: true, data: documento });
  } catch (error) {
    logger.error('Error al archivar documento', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al archivar documento' });
  }
});

// ============================================================================
// ELIMINAR DOCUMENTO (soft delete)
// ============================================================================

router.delete('/:id', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const documento = await Documento.findByIdAndUpdate(
      req.params.id,
      { activo: false, actualizado_por: req.user.id },
      { new: true }
    );

    if (!documento) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }

    logger.info('Documento eliminado', { documentoId: documento._id });
    res.json({ success: true, message: 'Documento eliminado' });
  } catch (error) {
    logger.error('Error al eliminar documento', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al eliminar documento' });
  }
});

// ============================================================================
// CATÁLOGOS
// ============================================================================

router.get('/catalogos/tipos', requireAuth, (req, res) => {
  const tipos = [
    { value: 'contrato', label: 'Contrato de Trabajo', categoria: 'legal' },
    { value: 'anexo_contrato', label: 'Anexo de Contrato', categoria: 'legal' },
    { value: 'finiquito', label: 'Finiquito', categoria: 'legal' },
    { value: 'cedula_identidad', label: 'Cédula de Identidad', categoria: 'identificacion' },
    { value: 'certificado_antecedentes', label: 'Certificado de Antecedentes', categoria: 'identificacion' },
    { value: 'certificado_afp', label: 'Certificado AFP', categoria: 'laboral' },
    { value: 'certificado_salud', label: 'Certificado de Salud', categoria: 'salud' },
    { value: 'licencia_conducir', label: 'Licencia de Conducir', categoria: 'identificacion' },
    { value: 'titulo_profesional', label: 'Título Profesional', categoria: 'formacion' },
    { value: 'certificacion', label: 'Certificación', categoria: 'formacion' },
    { value: 'licencia_medica', label: 'Licencia Médica', categoria: 'salud' },
    { value: 'permiso', label: 'Permiso', categoria: 'laboral' },
    { value: 'vacaciones', label: 'Solicitud Vacaciones', categoria: 'laboral' },
    { value: 'amonestacion', label: 'Amonestación', categoria: 'laboral' },
    { value: 'felicitacion', label: 'Felicitación', categoria: 'laboral' },
    { value: 'memorandum', label: 'Memorándum', categoria: 'laboral' },
    { value: 'liquidacion', label: 'Liquidación de Sueldo', categoria: 'laboral' },
    { value: 'certificado_trabajo', label: 'Certificado de Trabajo', categoria: 'laboral' },
    { value: 'curriculum', label: 'Currículum Vitae', categoria: 'otro' },
    { value: 'carta_recomendacion', label: 'Carta de Recomendación', categoria: 'otro' },
    { value: 'otro', label: 'Otro', categoria: 'otro' }
  ];
  res.json({ success: true, data: tipos });
});

router.get('/catalogos/categorias', requireAuth, (req, res) => {
  const categorias = [
    { value: 'legal', label: 'Legal' },
    { value: 'identificacion', label: 'Identificación' },
    { value: 'salud', label: 'Salud' },
    { value: 'laboral', label: 'Laboral' },
    { value: 'formacion', label: 'Formación' },
    { value: 'otro', label: 'Otro' }
  ];
  res.json({ success: true, data: categorias });
});


// DELETE /api/documentos/importados
router.delete('/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const Documento = require('../models/rrhh/Documento');
    const result = await Documento.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

