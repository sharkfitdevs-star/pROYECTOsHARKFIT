const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const Colaborador = require('../models/rrhh/Colaborador');

// ============================================================================
// LISTAR COLABORADORES
// ============================================================================

router.get('/', requireAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      sede, 
      departamento, 
      estado = 'activo',
      tipo_contrato,
      busqueda,
      ordenar = 'apellido_paterno'
    } = req.query;

    const query = { activo: true };
    
    if (estado && estado !== 'todos') query.estado = estado;
    if (sede) query.sede = sede;
    if (departamento) query.departamento = departamento;
    if (tipo_contrato) query.tipo_contrato = tipo_contrato;
    if (busqueda) {
      query.$or = [
        { nombres: { $regex: busqueda, $options: 'i' } },
        { apellido_paterno: { $regex: busqueda, $options: 'i' } },
        { apellido_materno: { $regex: busqueda, $options: 'i' } },
        { rut: { $regex: busqueda, $options: 'i' } },
        { codigo_empleado: { $regex: busqueda, $options: 'i' } },
        { cargo: { $regex: busqueda, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortField = ordenar.startsWith('-') ? ordenar.slice(1) : ordenar;
    const sortOrder = ordenar.startsWith('-') ? -1 : 1;

    const [colaboradores, total] = await Promise.all([
      Colaborador.find(query)
        .populate('sede', 'nombre')
        .populate('supervisor', 'nombres apellido_paterno')
        .select('-documentos -historial_cargos -historial_sueldos -notas_internas')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit)),
      Colaborador.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: colaboradores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error al listar colaboradores', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener colaboradores' });
  }
});

// ============================================================================
// RESUMEN / ESTADÍSTICAS
// ============================================================================

router.get('/resumen', requireAuth, async (req, res) => {
  try {
    const { sede } = req.query;
    const match = { activo: true };
    if (sede) match.sede = new mongoose.Types.ObjectId(sede);

    const [totales, porDepartamento, porContrato, porEstado] = await Promise.all([
      Colaborador.aggregate([
        { $match: match },
        { $group: {
            _id: null,
            total: { $sum: 1 },
            sueldo_promedio: { $avg: '$sueldo_base' },
            sueldo_total: { $sum: '$sueldo_base' },
            antiguedad_promedio: { $avg: { $divide: [{ $subtract: [new Date(), '$fecha_ingreso'] }, 1000 * 60 * 60 * 24 * 30] } }
          }
        }
      ]),
      Colaborador.aggregate([
        { $match: match },
        { $group: { _id: '$departamento', cantidad: { $sum: 1 } } },
        { $sort: { cantidad: -1 } }
      ]),
      Colaborador.aggregate([
        { $match: match },
        { $group: { _id: '$tipo_contrato', cantidad: { $sum: 1 } } }
      ]),
      Colaborador.aggregate([
        { $match: { activo: true } },
        { $group: { _id: '$estado', cantidad: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totales: totales[0] || { total: 0, sueldo_promedio: 0, sueldo_total: 0, antiguedad_promedio: 0 },
        por_departamento: porDepartamento,
        por_contrato: porContrato,
        por_estado: porEstado
      }
    });
  } catch (error) {
    logger.error('Error al obtener resumen', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
});

// ============================================================================
// OBTENER COLABORADOR POR ID
// ============================================================================

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const colaborador = await Colaborador.findById(req.params.id)
      .populate('sede', 'nombre direccion')
      .populate('supervisor', 'nombres apellido_paterno cargo foto')
      .populate('usuario', 'username email role');

    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al obtener colaborador', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener colaborador' });
  }
});

// ============================================================================
// CREAR COLABORADOR
// ============================================================================

router.post('/', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const colaborador = new Colaborador({
      ...req.body,
      creado_por: req.user.id
    });

    await colaborador.save();
    
    logger.info('Colaborador creado', { 
      colaboradorId: colaborador._id, 
      rut: colaborador.rut,
      nombre: colaborador.nombre_completo 
    });
    
    res.status(201).json({ success: true, data: colaborador });
  } catch (error) {
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        error: `El ${campo === 'rut' ? 'RUT' : 'código de empleado'} ya existe` 
      });
    }
    logger.error('Error al crear colaborador', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al crear colaborador' });
  }
});

// ============================================================================
// ACTUALIZAR COLABORADOR
// ============================================================================

router.put('/:id', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const colaborador = await Colaborador.findByIdAndUpdate(
      req.params.id,
      { ...req.body, actualizado_por: req.user.id },
      { new: true, runValidators: true }
    );

    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    logger.info('Colaborador actualizado', { colaboradorId: colaborador._id });
    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al actualizar colaborador', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al actualizar colaborador' });
  }
});

// ============================================================================
// CAMBIAR SUELDO
// ============================================================================

router.post('/:id/cambiar-sueldo', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { nuevo_sueldo, motivo } = req.body;
    
    if (!nuevo_sueldo || nuevo_sueldo < 0) {
      return res.status(400).json({ success: false, error: 'Sueldo inválido' });
    }

    const colaborador = await Colaborador.findById(req.params.id);
    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    await colaborador.registrarCambioSueldo(nuevo_sueldo, motivo, req.user.id);

    logger.info('Sueldo actualizado', { 
      colaboradorId: colaborador._id, 
      sueldoAnterior: colaborador.historial_sueldos.slice(-1)[0]?.sueldo_anterior,
      sueldoNuevo: nuevo_sueldo 
    });

    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al cambiar sueldo', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al cambiar sueldo' });
  }
});

// ============================================================================
// CAMBIAR CARGO
// ============================================================================

router.post('/:id/cambiar-cargo', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { nuevo_cargo, nuevo_departamento, motivo } = req.body;
    
    if (!nuevo_cargo) {
      return res.status(400).json({ success: false, error: 'Cargo requerido' });
    }

    const colaborador = await Colaborador.findById(req.params.id);
    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    await colaborador.registrarCambioCargo(nuevo_cargo, nuevo_departamento, motivo);

    logger.info('Cargo actualizado', { colaboradorId: colaborador._id, nuevoCargo: nuevo_cargo });
    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al cambiar cargo', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al cambiar cargo' });
  }
});

// ============================================================================
// GESTIÓN DE VACACIONES
// ============================================================================

router.post('/:id/vacaciones/tomar', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const { dias } = req.body;
    
    if (!dias || dias < 1) {
      return res.status(400).json({ success: false, error: 'Días inválidos' });
    }

    const colaborador = await Colaborador.findById(req.params.id);
    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    await colaborador.tomarVacaciones(dias);

    logger.info('Vacaciones registradas', { colaboradorId: colaborador._id, dias });
    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al registrar vacaciones', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/vacaciones/finalizar', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const colaborador = await Colaborador.findById(req.params.id);
    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    await colaborador.finalizarVacaciones();

    logger.info('Vacaciones finalizadas', { colaboradorId: colaborador._id });
    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al finalizar vacaciones', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al finalizar vacaciones' });
  }
});

// ============================================================================
// FINIQUITAR COLABORADOR
// ============================================================================

router.post('/:id/finiquitar', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { motivo, fecha } = req.body;

    const colaborador = await Colaborador.findById(req.params.id);
    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    await colaborador.finiquitar(motivo, fecha ? new Date(fecha) : null);

    logger.info('Colaborador finiquitado', { colaboradorId: colaborador._id, motivo });
    res.json({ success: true, message: 'Colaborador finiquitado correctamente' });
  } catch (error) {
    logger.error('Error al finiquitar', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al finiquitar colaborador' });
  }
});

// ============================================================================
// REACTIVAR COLABORADOR
// ============================================================================

router.post('/:id/reactivar', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const colaborador = await Colaborador.findByIdAndUpdate(
      req.params.id,
      { 
        estado: 'activo', 
        activo: true,
        fecha_termino: null,
        fecha_finiquito: null,
        motivo_termino: null,
        actualizado_por: req.user.id
      },
      { new: true }
    );

    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    logger.info('Colaborador reactivado', { colaboradorId: colaborador._id });
    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al reactivar', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al reactivar colaborador' });
  }
});

// ============================================================================
// AGREGAR DOCUMENTO
// ============================================================================

router.post('/:id/documentos', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const { tipo, nombre, url, fecha_vencimiento } = req.body;

    const colaborador = await Colaborador.findById(req.params.id);
    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    colaborador.documentos.push({
      tipo,
      nombre,
      url,
      fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null
    });

    await colaborador.save();

    logger.info('Documento agregado', { colaboradorId: colaborador._id, tipo });
    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al agregar documento', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al agregar documento' });
  }
});

// ============================================================================
// AGREGAR CARGA FAMILIAR
// ============================================================================

router.post('/:id/cargas', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const colaborador = await Colaborador.findById(req.params.id);
    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    colaborador.cargas_familiares.push(req.body);
    await colaborador.save();

    logger.info('Carga familiar agregada', { colaboradorId: colaborador._id });
    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al agregar carga', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al agregar carga familiar' });
  }
});

// ============================================================================
// ELIMINAR CARGA FAMILIAR
// ============================================================================

router.delete('/:id/cargas/:cargaId', requireAuth, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
  try {
    const colaborador = await Colaborador.findById(req.params.id);
    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador no encontrado' });
    }

    colaborador.cargas_familiares.id(req.params.cargaId).remove();
    await colaborador.save();

    logger.info('Carga familiar eliminada', { colaboradorId: colaborador._id });
    res.json({ success: true, data: colaborador });
  } catch (error) {
    logger.error('Error al eliminar carga', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al eliminar carga familiar' });
  }
});

// ============================================================================
// CATÁLOGOS
// ============================================================================

router.get('/catalogos/departamentos', requireAuth, (req, res) => {
  const departamentos = [
    { value: 'administracion', label: 'Administración' },
    { value: 'ventas', label: 'Ventas' },
    { value: 'operaciones', label: 'Operaciones' },
    { value: 'rrhh', label: 'Recursos Humanos' },
    { value: 'finanzas', label: 'Finanzas' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'ti', label: 'Tecnología' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'recepcion', label: 'Recepción' },
    { value: 'instructores', label: 'Instructores' },
    { value: 'otro', label: 'Otro' }
  ];
  res.json({ success: true, data: departamentos });
});

router.get('/catalogos/tipos-contrato', requireAuth, (req, res) => {
  const tipos = [
    { value: 'indefinido', label: 'Contrato Indefinido' },
    { value: 'plazo_fijo', label: 'Plazo Fijo' },
    { value: 'honorarios', label: 'Honorarios' },
    { value: 'practicas', label: 'Prácticas' },
    { value: 'part_time', label: 'Part Time' }
  ];
  res.json({ success: true, data: tipos });
});

router.get('/catalogos/afps', requireAuth, (req, res) => {
  const afps = [
    { value: 'capital', label: 'AFP Capital' },
    { value: 'cuprum', label: 'AFP Cuprum' },
    { value: 'habitat', label: 'AFP Habitat' },
    { value: 'modelo', label: 'AFP Modelo' },
    { value: 'planvital', label: 'AFP Planvital' },
    { value: 'provida', label: 'AFP Provida' },
    { value: 'uno', label: 'AFP Uno' },
    { value: 'sin_afp', label: 'Sin AFP' }
  ];
  res.json({ success: true, data: afps });
});

router.get('/catalogos/bancos', requireAuth, (req, res) => {
  const bancos = [
    { value: 'banco_chile', label: 'Banco de Chile' },
    { value: 'banco_estado', label: 'Banco Estado' },
    { value: 'santander', label: 'Santander' },
    { value: 'bci', label: 'BCI' },
    { value: 'scotiabank', label: 'Scotiabank' },
    { value: 'itau', label: 'Itaú' },
    { value: 'security', label: 'Banco Security' },
    { value: 'bice', label: 'BICE' },
    { value: 'falabella', label: 'Banco Falabella' },
    { value: 'ripley', label: 'Banco Ripley' },
    { value: 'consorcio', label: 'Banco Consorcio' },
    { value: 'internacional', label: 'Banco Internacional' }
  ];
  res.json({ success: true, data: bancos });
});


// DELETE /api/colaboradores/importados - Eliminar todos los colaboradores importados
router.delete('/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const Colaborador = require('../models/rrhh/Colaborador');
    const result = await Colaborador.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

