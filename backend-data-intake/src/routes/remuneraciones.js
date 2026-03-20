const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Remuneracion = require('../models/rrhh/Remuneracion');
const Adelanto = require('../models/rrhh/Adelanto');
const Colaborador = require('../models/rrhh/Colaborador');
const { logger } = require('../utils/logger');

// ============================================================================
// LIQUIDACIONES
// ============================================================================

// GET /api/remuneraciones - Listar liquidaciones con filtros
router.get('/', requireAuth, async (req, res) => {
  try {
    const { mes, anio, estado, colaborador, sede, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (mes) query['periodo.mes'] = parseInt(mes);
    if (anio) query['periodo.anio'] = parseInt(anio);
    if (estado) query.estado = estado;
    if (colaborador) query.colaborador = colaborador;
    if (sede) query.sede = sede;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [liquidaciones, total] = await Promise.all([
      Remuneracion.find(query)
        .populate('colaborador', 'nombre apellido rut cargo departamento')
        .sort({ 'periodo.anio': -1, 'periodo.mes': -1, 'datos_colaborador.nombre_completo': 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Remuneracion.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: liquidaciones,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error al listar liquidaciones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/remuneraciones/resumen/:anio/:mes - Resumen del período
router.get('/resumen/:anio/:mes', requireAuth, async (req, res) => {
  try {
    const { anio, mes } = req.params;
    const { sede } = req.query;
    
    const resumen = await Remuneracion.getResumenPeriodo(
      parseInt(mes), 
      parseInt(anio), 
      sede
    );
    
    // Contar colaboradores activos
    const queryColaboradores = { estado: 'activo' };
    if (sede) queryColaboradores.sede_actual = sede;
    const totalColaboradores = await Colaborador.countDocuments(queryColaboradores);
    
    // Contar liquidaciones generadas
    const queryLiquidaciones = { 'periodo.mes': parseInt(mes), 'periodo.anio': parseInt(anio) };
    if (sede) queryLiquidaciones.sede = sede;
    const liquidacionesGeneradas = await Remuneracion.countDocuments(queryLiquidaciones);
    
    res.json({
      success: true,
      data: {
        periodo: { mes: parseInt(mes), anio: parseInt(anio) },
        resumen_por_estado: resumen,
        total_colaboradores: totalColaboradores,
        liquidaciones_generadas: liquidacionesGeneradas,
        pendientes_generar: totalColaboradores - liquidacionesGeneradas
      }
    });
  } catch (error) {
    logger.error('Error al obtener resumen:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/remuneraciones/generar-periodo - Generar liquidaciones masivas
router.post('/generar-periodo', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { mes, anio, sede, colaboradores_ids } = req.body;
    
    // Obtener colaboradores activos
    const queryColaboradores = { estado: 'activo' };
    if (sede) queryColaboradores.sede_actual = sede;
    if (colaboradores_ids?.length) queryColaboradores._id = { $in: colaboradores_ids };
    
    const colaboradores = await Colaborador.find(queryColaboradores).lean();
    
    const resultados = {
      generadas: 0,
      existentes: 0,
      errores: []
    };
    
    for (const col of colaboradores) {
      try {
        // Verificar si ya existe
        const existe = await Remuneracion.findOne({
          colaborador: col._id,
          'periodo.mes': mes,
          'periodo.anio': anio
        });
        
        if (existe) {
          resultados.existentes++;
          continue;
        }
        
        // Crear liquidación base
        const liquidacion = new Remuneracion({
          colaborador: col._id,
          periodo: { mes, anio },
          tipo_liquidacion: 'mensual',
          datos_colaborador: {
            nombre_completo: `${col.nombre} ${col.apellido}`,
            rut: col.rut,
            cargo: col.cargo,
            departamento: col.departamento,
            fecha_ingreso: col.fecha_ingreso,
            tipo_contrato: col.tipo_contrato,
            sede: col.sede_actual?.toString()
          },
          sueldo_base: col.sueldo_base || 0,
          dias_trabajados: 30,
          prevision: {
            afp: col.afp,
            tasa_afp: col.tasa_afp || 10.69,
            salud: col.prevision_salud,
            tasa_salud: col.tasa_salud || 7
          },
          estado: 'borrador',
          sede: col.sede_actual,
          creado_por: req.user.id
        });
        
        // Agregar haberes básicos
        liquidacion.agregarHaber('SB', 'Sueldo Base', 'haber_imponible', col.sueldo_base || 0);
        
        if (col.bono_colacion) {
          liquidacion.agregarHaber('COL', 'Colación', 'haber_no_imponible', col.bono_colacion);
        }
        if (col.bono_movilizacion) {
          liquidacion.agregarHaber('MOV', 'Movilización', 'haber_no_imponible', col.bono_movilizacion);
        }
        
        // Calcular descuentos legales
        const baseImponible = col.sueldo_base || 0;
        const afp = Math.round(baseImponible * (col.tasa_afp || 10.69) / 100);
        const salud = Math.round(baseImponible * (col.tasa_salud || 7) / 100);
        const cesantia = Math.round(baseImponible * 0.6 / 100);
        
        liquidacion.agregarDescuento('AFP', 'AFP', 'descuento_legal', afp);
        liquidacion.agregarDescuento('SAL', 'Salud', 'descuento_legal', salud);
        liquidacion.agregarDescuento('CES', 'Seguro Cesantía', 'descuento_legal', cesantia);
        
        liquidacion.prevision.monto_afp = afp;
        liquidacion.prevision.monto_salud = salud;
        liquidacion.prevision.seguro_cesantia = cesantia;
        
        // Buscar adelantos pendientes
        const adelantos = await Adelanto.getPendientes(col._id);
        for (const adelanto of adelantos) {
          if (adelanto.estado === 'descontando' && adelanto.saldo_pendiente > 0) {
            const montoDescuento = Math.min(adelanto.monto_cuota, adelanto.saldo_pendiente);
            liquidacion.agregarDescuento(
              'ADL', 
              `Descuento ${adelanto.tipo}`, 
              'descuento_voluntario', 
              montoDescuento,
              `Cuota ${adelanto.cuotas_pagadas + 1}/${adelanto.cuotas}`
            );
          }
        }
        
        liquidacion.calcularTotales();
        liquidacion.fecha_calculo = new Date();
        liquidacion.estado = 'calculada';
        
        await liquidacion.save();
        resultados.generadas++;
        
      } catch (err) {
        resultados.errores.push({ colaborador: col._id, error: err.message });
      }
    }
    
    res.json({
      success: true,
      data: resultados,
      message: `Se generaron ${resultados.generadas} liquidaciones`
    });
    
  } catch (error) {
    logger.error('Error al generar liquidaciones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/remuneraciones/:id - Obtener liquidación por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const liquidacion = await Remuneracion.findById(req.params.id)
      .populate('colaborador', 'nombre apellido rut cargo departamento foto')
      .populate('aprobado_por', 'name email')
      .populate('creado_por', 'name email');
    
    if (!liquidacion) {
      return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
    }
    
    res.json({ success: true, data: liquidacion });
  } catch (error) {
    logger.error('Error al obtener liquidación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/remuneraciones/:id - Actualizar liquidación
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const liquidacion = await Remuneracion.findById(req.params.id);
    
    if (!liquidacion) {
      return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
    }
    
    if (!['borrador', 'calculada'].includes(liquidacion.estado)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Solo se pueden editar liquidaciones en estado borrador o calculada' 
      });
    }
    
    const camposPermitidos = [
      'dias_trabajados', 'dias_licencia', 'dias_vacaciones', 'dias_permiso',
      'dias_ausencia', 'horas_extra', 'haberes', 'descuentos', 'observaciones'
    ];
    
    camposPermitidos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        liquidacion[campo] = req.body[campo];
      }
    });
    
    liquidacion.calcularTotales();
    liquidacion.fecha_calculo = new Date();
    liquidacion.estado = 'calculada';
    
    await liquidacion.save();
    
    res.json({ success: true, data: liquidacion });
  } catch (error) {
    logger.error('Error al actualizar liquidación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/remuneraciones/:id/aprobar - Aprobar liquidación
router.post('/:id/aprobar', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const liquidacion = await Remuneracion.findById(req.params.id);
    
    if (!liquidacion) {
      return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
    }
    
    if (liquidacion.estado !== 'calculada') {
      return res.status(400).json({ 
        success: false, 
        error: 'Solo se pueden aprobar liquidaciones calculadas' 
      });
    }
    
    liquidacion.estado = 'aprobada';
    liquidacion.fecha_aprobacion = new Date();
    liquidacion.aprobado_por = req.user.id;
    
    await liquidacion.save();
    
    res.json({ success: true, data: liquidacion, message: 'Liquidación aprobada' });
  } catch (error) {
    logger.error('Error al aprobar liquidación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/remuneraciones/:id/pagar - Marcar como pagada
router.post('/:id/pagar', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { forma_pago, fecha_pago } = req.body;
    const liquidacion = await Remuneracion.findById(req.params.id);
    
    if (!liquidacion) {
      return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
    }
    
    if (liquidacion.estado !== 'aprobada') {
      return res.status(400).json({ 
        success: false, 
        error: 'Solo se pueden pagar liquidaciones aprobadas' 
      });
    }
    
    liquidacion.estado = 'pagada';
    liquidacion.fecha_pago = fecha_pago || new Date();
    if (forma_pago) liquidacion.forma_pago = forma_pago;
    
    // Actualizar adelantos si hay descuentos aplicados
    const descuentosAdelanto = liquidacion.descuentos.filter(d => d.codigo === 'ADL');
    for (const desc of descuentosAdelanto) {
      // Lógica para actualizar adelantos
    }
    
    await liquidacion.save();
    
    res.json({ success: true, data: liquidacion, message: 'Liquidación marcada como pagada' });
  } catch (error) {
    logger.error('Error al marcar como pagada:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/remuneraciones/:id - Anular liquidación
router.delete('/:id', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const liquidacion = await Remuneracion.findById(req.params.id);
    
    if (!liquidacion) {
      return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
    }
    
    if (liquidacion.estado === 'pagada') {
      return res.status(400).json({ 
        success: false, 
        error: 'No se pueden anular liquidaciones pagadas' 
      });
    }
    
    liquidacion.estado = 'anulada';
    await liquidacion.save();
    
    res.json({ success: true, message: 'Liquidación anulada' });
  } catch (error) {
    logger.error('Error al anular liquidación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ADELANTOS
// ============================================================================

// GET /api/remuneraciones/adelantos - Listar adelantos
router.get('/adelantos/lista', requireAuth, async (req, res) => {
  try {
    const { estado, colaborador, tipo, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (estado) query.estado = estado;
    if (colaborador) query.colaborador = colaborador;
    if (tipo) query.tipo = tipo;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [adelantos, total] = await Promise.all([
      Adelanto.find(query)
        .populate('colaborador', 'nombre apellido rut cargo')
        .populate('aprobado_por', 'name')
        .sort({ fecha_solicitud: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Adelanto.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: adelantos,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error al listar adelantos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/remuneraciones/adelantos - Crear adelanto
router.post('/adelantos', requireAuth, async (req, res) => {
  try {
    const { colaborador, tipo, monto_solicitado, cuotas, motivo } = req.body;
    
    const adelanto = new Adelanto({
      colaborador,
      tipo,
      monto_solicitado,
      cuotas: cuotas || 1,
      monto_cuota: cuotas ? Math.ceil(monto_solicitado / cuotas) : monto_solicitado,
      saldo_pendiente: monto_solicitado,
      motivo,
      creado_por: req.user.id
    });
    
    await adelanto.save();
    
    res.status(201).json({ success: true, data: adelanto });
  } catch (error) {
    logger.error('Error al crear adelanto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/remuneraciones/adelantos/:id/aprobar - Aprobar adelanto
router.post('/adelantos/:id/aprobar', requireAuth, requireRole(['admin', 'owner', 'manager']), async (req, res) => {
  try {
    const { monto_aprobado } = req.body;
    const adelanto = await Adelanto.findById(req.params.id);
    
    if (!adelanto) {
      return res.status(404).json({ success: false, error: 'Adelanto no encontrado' });
    }
    
    adelanto.estado = 'aprobado';
    adelanto.monto_aprobado = monto_aprobado || adelanto.monto_solicitado;
    adelanto.monto_cuota = Math.ceil(adelanto.monto_aprobado / adelanto.cuotas);
    adelanto.saldo_pendiente = adelanto.monto_aprobado;
    adelanto.fecha_aprobacion = new Date();
    adelanto.aprobado_por = req.user.id;
    
    await adelanto.save();
    
    res.json({ success: true, data: adelanto, message: 'Adelanto aprobado' });
  } catch (error) {
    logger.error('Error al aprobar adelanto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/remuneraciones/adelantos/:id/rechazar - Rechazar adelanto
router.post('/adelantos/:id/rechazar', requireAuth, requireRole(['admin', 'owner', 'manager']), async (req, res) => {
  try {
    const { motivo_rechazo } = req.body;
    const adelanto = await Adelanto.findById(req.params.id);
    
    if (!adelanto) {
      return res.status(404).json({ success: false, error: 'Adelanto no encontrado' });
    }
    
    adelanto.estado = 'rechazado';
    adelanto.motivo_rechazo = motivo_rechazo;
    adelanto.rechazado_por = req.user.id;
    
    await adelanto.save();
    
    res.json({ success: true, data: adelanto, message: 'Adelanto rechazado' });
  } catch (error) {
    logger.error('Error al rechazar adelanto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CATÁLOGOS
// ============================================================================

// GET /api/remuneraciones/catalogos/haberes - Catálogo de haberes
router.get('/catalogos/haberes', requireAuth, async (req, res) => {
  const haberes = [
    { codigo: 'SB', nombre: 'Sueldo Base', tipo: 'haber_imponible' },
    { codigo: 'GRT', nombre: 'Gratificación', tipo: 'haber_imponible' },
    { codigo: 'HE50', nombre: 'Horas Extra 50%', tipo: 'haber_imponible' },
    { codigo: 'HE100', nombre: 'Horas Extra 100%', tipo: 'haber_imponible' },
    { codigo: 'COM', nombre: 'Comisiones', tipo: 'haber_imponible' },
    { codigo: 'BON', nombre: 'Bono', tipo: 'haber_imponible' },
    { codigo: 'BONA', nombre: 'Bono Asistencia', tipo: 'haber_imponible' },
    { codigo: 'BONP', nombre: 'Bono Productividad', tipo: 'haber_imponible' },
    { codigo: 'COL', nombre: 'Colación', tipo: 'haber_no_imponible' },
    { codigo: 'MOV', nombre: 'Movilización', tipo: 'haber_no_imponible' },
    { codigo: 'VIA', nombre: 'Viático', tipo: 'haber_no_imponible' },
    { codigo: 'ASF', nombre: 'Asignación Familiar', tipo: 'haber_no_imponible' }
  ];
  
  res.json({ success: true, data: haberes });
});

// GET /api/remuneraciones/catalogos/descuentos - Catálogo de descuentos
router.get('/catalogos/descuentos', requireAuth, async (req, res) => {
  const descuentos = [
    { codigo: 'AFP', nombre: 'AFP', tipo: 'descuento_legal' },
    { codigo: 'SAL', nombre: 'Salud', tipo: 'descuento_legal' },
    { codigo: 'CES', nombre: 'Seguro Cesantía', tipo: 'descuento_legal' },
    { codigo: 'IMP', nombre: 'Impuesto Único', tipo: 'descuento_legal' },
    { codigo: 'ADL', nombre: 'Adelanto', tipo: 'descuento_voluntario' },
    { codigo: 'PRE', nombre: 'Préstamo', tipo: 'descuento_voluntario' },
    { codigo: 'CAJ', nombre: 'Caja Compensación', tipo: 'descuento_voluntario' },
    { codigo: 'SIN', nombre: 'Cuota Sindical', tipo: 'descuento_voluntario' },
    { codigo: 'PEN', nombre: 'Pensión Alimenticia', tipo: 'descuento_judicial' }
  ];
  
  res.json({ success: true, data: descuentos });
});


// DELETE /api/remuneraciones/importados
router.delete('/importados', requireAuth, requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const Remuneracion = require('../models/rrhh/Remuneracion');
    const result = await Remuneracion.deleteMany({ source: { $in: ['excel', 'import', 'api'] } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

