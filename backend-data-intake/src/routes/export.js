const express = require('express');
const multer = require('multer');
const router = express.Router();
const ExportRunner = require('../services/ExportRunner');
const ExportRun = require('../models/ExportRun');

// Multer para manejar upload de archivos excel/csv
const upload = multer({ dest: 'uploads/' });

/**
 * POST /api/export/run
 * body: { sourceType, config }
 * si sourceType === 'excel' esperar form-data con file y config JSON string
 * response: { runId, availableMetrics, preview, counts, logsSummary }
 * examples:
 *   curl -X POST http://localhost:3000/api/export/run -H 'Content-Type: application/json' \
 *        -d '{"sourceType":"universal","config":{...}}'
 *
 *   curl -F 'sourceType=excel' -F 'config={"foo":"bar"}' -F 'file=@/path/to/file.xlsx' \
 *        http://localhost:3000/api/export/run
 */
router.post('/run', upload.single('file'), async (req, res) => {
  try {
    let { sourceType, config } = req.body;
    if (typeof config === 'string') {
      config = JSON.parse(config);
    }
    if (req.file) {
      config = config || {};
      config.filePath = req.file.path;
    }

    const result = await ExportRunner.startRun(sourceType, config);
    return res.json(result);
  } catch (error) {
    console.error('Error /api/export/run', error);
    return res.status(500).json({ error: { message: error.message } });
  }
});

/**
 * POST /api/export/run/:runId/metrics
 * body: { selectedMetrics: [] }
 * response: { ok, runId, countsByMetric, datasetActivated }
 */
router.post('/run/:runId/metrics', async (req, res) => {
  try {
    const { selectedMetrics } = req.body;
    const result = await ExportRunner.confirmMetrics(req.params.runId, selectedMetrics);
    res.json(result);
  } catch (error) {
    console.error('Error confirmMetrics', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

/**
 * GET /api/export/runs
 */
router.get('/runs', async (req, res) => {
  const runs = await ExportRun.find().sort({ createdAt: -1 }).limit(100);
  res.json(runs);
});

/**
 * GET /api/export/runs/:runId
 */
router.get('/runs/:runId', async (req, res) => {
  const run = await ExportRun.findOne({ runId: req.params.runId });
  if (!run) return res.status(404).json({ error: 'not found' });
  res.json(run);
});

module.exports = router;
