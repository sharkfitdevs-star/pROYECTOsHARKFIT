const express = require('express');
const fs = require('fs');
const path = require('path');
const UniversalExtractor = require('../connectors/UniversalExtractor');
const { logger } = require('../utils/logger');
const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');
const AccessLog = require('../models/AccessLog');

const router = express.Router();

function buildStatsFromArrays({ sales = [], prospects = [], entries = [] }) {
  const total_sales = sales.length;
  const total_prospects = prospects.length;
  const total_entries = entries.length;

  const total_revenue = sales.reduce((s, v) => s + (parseFloat(v.value || v.amount || v.totalAmount || 0) || 0), 0);
  const avg_sale_amount = total_sales > 0 ? Math.round(total_revenue / total_sales) : 0;

  return {
    total_sales,
    total_prospects,
    total_entries,
    total_revenue,
    avg_sale_amount,
    recent_sales: (sales || []).slice(0, 10).map(s => ({
      evo_sale_id: s.id || s.evo_sale_id || s.code || null,
      amount: parseFloat(s.value || s.amount || s.totalAmount || 0) || 0,
      sale_date: s.sale_date || s.saleDate || s.date || null,
      status: s.status || s.paymentStatus || null
    })),
    recent_prospects: (prospects || []).slice(0, 10).map(p => ({
      id: p.id || p.evo_prospect_id || null,
      name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      email: p.email || null,
      registration_date: p.registration_date || p.created_at || null
    })),
    recent_entries: (entries || []).slice(0, 10).map(e => ({
      id: e.id || e.evo_entry_id || null,
      access_time: e.access_time || e.accessTime || e.created_at || null,
      location: e.location || e.branch || null,
      member_id: e.member_id || e.idMember || e.member || null
    })),
    last_sync: new Date().toISOString()
  };
}

/**
 * GET /api/evo/dashboard/stats
 * - Si existe config `api-evo.json` -> usa UniversalExtractor para obtener arrays
 * - Si no, intenta leer desde MongoDB (Cliente/Venta/AccessLog)
 * - query param `mode=extractor` fuerza usar extractor config
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    logger.info('GET /api/evo/dashboard/stats called', { query: req.query });
    const useExtractor = req.query.mode === 'extractor';
    const forceDb = req.query.mode === 'db';
    const cfgPath = path.join(__dirname, '../../configs/api-evo.json');

    // 1) Preferir extractor config si existe o si se requirió (puedes forzar DB con ?mode=db)
    if (!forceDb && (useExtractor || fs.existsSync(cfgPath))) {
      try {
        const raw = fs.readFileSync(cfgPath, 'utf8');
        const cfg = JSON.parse(raw.replace(/\$\{([^}]+)\}/g, (_, k) => process.env[k] || ''));
        const extractor = new UniversalExtractor(cfg);

        // Extraer los 3 endpoints principales (paths tal como están en config)
        const salesEp = cfg.endpoints.find(e => e.dataType === 'ventas')?.path;
        const prospectsEp = cfg.endpoints.find(e => e.dataType === 'prospectos')?.path;
        const entriesEp = cfg.endpoints.find(e => e.dataType === 'accesos')?.path;

        const [salesR, prospectsR, entriesR] = await Promise.all([
          salesEp ? extractor.extract(salesEp) : { success: false, data: [] },
          prospectsEp ? extractor.extract(prospectsEp) : { success: false, data: [] },
          entriesEp ? extractor.extract(entriesEp) : { success: false, data: [] }
        ]);

        const sales = (salesR.success && Array.isArray(salesR.data)) ? salesR.data : (salesR.data?.items || []);
        const prospects = (prospectsR.success && Array.isArray(prospectsR.data)) ? prospectsR.data : (prospectsR.data?.items || []);
        const entries = (entriesR.success && Array.isArray(entriesR.data)) ? entriesR.data : (entriesR.data?.items || []);

        const stats = buildStatsFromArrays({ sales, prospects, entries });
        // Mantener compatibilidad con el frontend: devolver el objeto `stats` en la raíz
        return res.json({ ...stats, source: 'extractor', _raw: { salesR, prospectsR, entriesR } });
      } catch (extractErr) {
        // si extractor falla, caerá al fallback DB
        logger.warn('extractor api-evo falló, usando fallback DB', { error: extractErr.message });
      }
    }

    // 2) Fallback: leer desde MongoDB (si está disponible)
    try {
      logger.info('using fallback MongoDB for /api/evo/dashboard/stats');
      const [recentSales, recentProspects, recentEntries, total_sales, total_prospects, total_entries, revenueAgg] = await Promise.all([
        Venta.find().sort({ saleDate: -1 }).limit(10).lean(),
        Cliente.find().sort({ registrationDate: -1 }).limit(10).lean(),
        AccessLog.find().sort({ accessTime: -1 }).limit(10).lean(),
        Venta.countDocuments(),
        Cliente.countDocuments(),
        AccessLog.countDocuments(),
        Venta.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, avg: { $avg: '$amount' } } }])
      ]);

      const total_revenue = (revenueAgg && revenueAgg[0]) ? revenueAgg[0].total : 0;
      const avg_sale_amount = (revenueAgg && revenueAgg[0]) ? Math.round(revenueAgg[0].avg || 0) : 0;

      const stats = {
        total_sales,
        total_prospects,
        total_entries,
        total_revenue,
        avg_sale_amount,
        recent_sales: recentSales.map(s => ({ evo_sale_id: s.idSale || s.externalId, amount: s.amount, sale_date: s.saleDate, status: s.paymentStatus })),
        recent_prospects: recentProspects.map(p => ({ id: p.uniqueId || p.externalId, name: p.name, email: p.email, registration_date: p.registrationDate })),
        recent_entries: recentEntries.map(e => ({ id: e._id, access_time: e.accessTime, location: e.location, member_id: e.memberId })),
        last_sync: new Date().toISOString()
      };

      // Mantener compatibilidad: stats en la raíz + metadatos `source`
      return res.json({ ...stats, source: 'mongodb' });
    } catch (dbErr) {
      logger.warn('Fallback Mongo falló', { error: dbErr.message });
    }

    // 3) Último recurso: datos demo
    const demoStats = buildStatsFromArrays({
      sales: [],
      prospects: [],
      entries: []
    });

    // Devolver demo stats en la raíz para compatibilidad con el frontend
    return res.json({ ...demoStats, source: 'demo', message: 'No se encontró extractor ni datos en DB; usando demo.' });
  } catch (error) {
    logger.error('Error en /api/evo/dashboard/stats', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
