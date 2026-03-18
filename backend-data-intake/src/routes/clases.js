const express = require('express');
const router = express.Router();
const Agendamiento = require('../models/Agendamiento');
const { requireAuth } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// Todas las rutas requieren autenticación
router.use(requireAuth);

/**
 * GET /api/clases
 * Listar agendamientos de tipo 'clase' con filtros opcionales
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      instructorName,
      branchName,
      dateFrom,
      dateTo,
      page    = 1,
      limit   = 50,
      sortBy  = 'startDate',
      sortDir = 'desc',
    } = req.query;

    const query = { appointmentType: 'clase' };

    if (status)        query.status        = status;
    if (instructorName) query.instructorName = { $regex: instructorName, $options: 'i' };
    if (branchName)    query.branchName    = { $regex: branchName, $options: 'i' };

    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) query.startDate.$gte = new Date(dateFrom);
      if (dateTo)   query.startDate.$lte = new Date(dateTo);
    }

    const sort     = { [sortBy]: sortDir === 'asc' ? 1 : -1 };
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const [data, total] = await Promise.all([
      Agendamiento.find(query).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
      Agendamiento.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error('Error listing clases:', { error });
    res.status(500).json({ error: true, message: 'Error al listar clases' });
  }
});

/**
 * GET /api/clases/hoy
 * Clases programadas para el día de hoy
 */
router.get('/hoy', async (req, res) => {
  try {
    const hoy  = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
    const fin    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);

    const query = {
      appointmentType: 'clase',
      startDate: { $gte: inicio, $lte: fin },
    };

    const { page = 1, limit = 100 } = req.query;
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const [data, total] = await Promise.all([
      Agendamiento.find(query).sort({ startDate: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Agendamiento.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error('Error getting clases de hoy:', { error });
    res.status(500).json({ error: true, message: 'Error al obtener clases de hoy' });
  }
});

/**
 * GET /api/clases/stats/resumen
 * Total de clases, asistencia promedio, cancelaciones
 */
router.get('/stats/resumen', async (req, res) => {
  try {
    const [porStatus, asistenciaAgg, totalClases] = await Promise.all([
      Agendamiento.aggregate([
        { $match: { appointmentType: 'clase' } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Agendamiento.aggregate([
        { $match: { appointmentType: 'clase', status: { $in: ['completado', 'en_curso'] } } },
        {
          $group: {
            _id: null,
            asistenciaPromedio: { $avg: '$currentAttendees' },
            capacidadPromedio:  { $avg: '$maxCapacity' },
          },
        },
      ]),
      Agendamiento.countDocuments({ appointmentType: 'clase' }),
    ]);

    const cancelaciones = porStatus.find(s => s._id === 'cancelado')?.count || 0;

    res.json({
      success: true,
      data: {
        totalClases,
        porStatus,
        cancelaciones,
        tasaCancelacion: totalClases > 0 ? Math.round((cancelaciones / totalClases) * 10000) / 100 : 0,
        asistenciaPromedio: Math.round((asistenciaAgg[0]?.asistenciaPromedio || 0) * 100) / 100,
        capacidadPromedio:  Math.round((asistenciaAgg[0]?.capacidadPromedio  || 0) * 100) / 100,
      },
    });
  } catch (error) {
    logger.error('Error getting clases stats:', { error });
    res.status(500).json({ error: true, message: 'Error al obtener estadísticas de clases' });
  }
});

/**
 * GET /api/clases/:id
 * Detalle de una clase
 */
router.get('/:id', async (req, res) => {
  try {
    const clase = await Agendamiento.findById(req.params.id);
    if (!clase) {
      return res.status(404).json({ error: true, message: 'Clase no encontrada' });
    }
    res.json({ success: true, data: clase });
  } catch (error) {
    logger.error('Error getting clase:', { error });
    res.status(500).json({ error: true, message: 'Error al obtener clase' });
  }
});

module.exports = router;
