const express = require('express');
const ExportRun = require('../models/ExportRun');
const ExportRunner = require('../services/ExportRunner');
const { logger } = require('../utils/logger');

const router = express.Router();

// NOTE: there is another legacy endpoint under /api/evo/dashboard/stats
// this new route returns the pre-computed snapshot stored with the active
// export run, making it possible to power the React dashboard UI and also
// re-calculate sales when the user applies a date filter.

/**
 * GET /api/dashboard/summary
 * Optional query params: from, to (ISO dates)
 * Returns dashboard snapshot belonging to the run that has datasetActivated
 * set (the "active" dataset). If no active run exists, returns 404.
 *
 * If from/to are provided the endpoint will dynamically recompute parts of
 * the snapshot (sales-related aggregates) using the date range. Other
 * sections remain unchanged from the stored snapshot.
 *
 * Examples:
 *   curl http://localhost:3000/api/dashboard/summary
 *   curl http://localhost:3000/api/dashboard/summary?from=2025-01-01&to=2025-02-01
 */
router.get('/summary', async (req, res) => {
  try {
    let { from, to } = req.query;

    const run = await ExportRun.findOne({ datasetActivated: true }).sort({ updatedAt: -1 });
    if (!run) {
      return res.status(404).json({ error: 'No active dataset available' });
    }

    let snapshot = run.dashboardSnapshot || {};

    // validar fechas
    const validFrom = from ? new Date(from) : null;
    const validTo = to ? new Date(to) : null;
    if (from && (isNaN(validFrom) || validFrom.toString() === 'Invalid Date')) {
      logger.warn('invalid from query param', { from });
    }
    if (to && (isNaN(validTo) || validTo.toString() === 'Invalid Date')) {
      logger.warn('invalid to query param', { to });
    }

    if ((validFrom || validTo) && !(isNaN(validFrom) || isNaN(validTo))) {
      try {
        const recalculated = await ExportRunner.buildDashboardSnapshot({ from: validFrom, to: validTo });
        snapshot = Object.assign({}, snapshot, {
          kpis: Object.assign({}, snapshot.kpis || {}, {
            total_sales: recalculated.kpis.total_sales,
            sales_count: recalculated.kpis.sales_count,
            total_payables: recalculated.kpis.total_payables
          }),
          trends: Object.assign({}, snapshot.trends || {}, {
            salesByDay: recalculated.trends.salesByDay
          }),
          tables: Object.assign({}, snapshot.tables || {}, {
            lastSales: recalculated.tables.lastSales
          })
        });
      } catch (err) {
        logger.warn('Error recalculando snapshot con rango', { error: err, from, to });
      }
    }

    return res.json(snapshot);
  } catch (error) {
    logger.error('Error en /api/dashboard/summary', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
