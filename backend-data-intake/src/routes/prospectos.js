const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { requireAuth } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// Todas las rutas requieren autenticación
router.use(requireAuth);

/**
 * GET /api/prospectos
 * Listar prospectos con filtros opcionales y paginación
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      estatus,
      fuente,
      page    = 1,
      limit   = 50,
      sortBy  = 'createdAt',
      sortDir = 'desc',
    } = req.query;

    const query = {};

    if (estatus) query.estatus = estatus;
    if (fuente)  query.fuente  = fuente;

    if (search) {
      query.$or = [
        { nombre:   { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
        { telefono: { $regex: search, $options: 'i' } },
        { empresa:  { $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const [data, total] = await Promise.all([
      Lead.find(query).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
      Lead.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error('Error listing prospectos:', { error });
    res.status(500).json({ error: true, message: 'Error al listar prospectos' });
  }
});

/**
 * GET /api/prospectos/stats/resumen
 * Conteo por estatus y leadScore promedio
 */
router.get('/stats/resumen', async (req, res) => {
  try {
    const [porEstatus, scoreAgg] = await Promise.all([
      Lead.aggregate([
        { $group: { _id: '$estatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $group: { _id: null, leadScorePromedio: { $avg: '$leadScore' }, probabilidadPromedio: { $avg: '$probabilidad' } } },
      ]),
    ]);

    const total = porEstatus.reduce((acc, e) => acc + e.count, 0);

    res.json({
      success: true,
      data: {
        total,
        porEstatus,
        leadScorePromedio:    Math.round((scoreAgg[0]?.leadScorePromedio    || 0) * 100) / 100,
        probabilidadPromedio: Math.round((scoreAgg[0]?.probabilidadPromedio || 0) * 100) / 100,
      },
    });
  } catch (error) {
    logger.error('Error getting prospectos stats:', { error });
    res.status(500).json({ error: true, message: 'Error al obtener estadísticas de prospectos' });
  }
});

/**
 * GET /api/prospectos/:id
 * Detalle de un prospecto
 */
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: true, message: 'Prospecto no encontrado' });
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Error getting prospecto:', { error });
    res.status(500).json({ error: true, message: 'Error al obtener prospecto' });
  }
});

/**
 * POST /api/prospectos
 * Crear nuevo prospecto
 */
router.post('/', async (req, res) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    logger.error('Error creating prospecto:', { error });
    res.status(500).json({ error: true, message: 'Error al crear prospecto' });
  }
});

/**
 * PUT /api/prospectos/:id
 * Actualizar un prospecto
 */
router.put('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!lead) {
      return res.status(404).json({ error: true, message: 'Prospecto no encontrado' });
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Error updating prospecto:', { error });
    res.status(500).json({ error: true, message: 'Error al actualizar prospecto' });
  }
});

/**
 * DELETE /api/prospectos/:id
 * Eliminar un prospecto
 */
router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: true, message: 'Prospecto no encontrado' });
    }
    res.json({ success: true, message: 'Prospecto eliminado' });
  } catch (error) {
    logger.error('Error deleting prospecto:', { error });
    res.status(500).json({ error: true, message: 'Error al eliminar prospecto' });
  }
});

module.exports = router;
