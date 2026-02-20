const { v4: uuidv4 } = require('uuid');
const UniversalExtractor = require('../connectors/UniversalExtractor');
const { getMemberships, getPayables } = require('./abcEvo');
const ExportRun = require('../models/ExportRun');
const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');
const Membership = require('../models/Membership');
const Payable = require('../models/Payable');
const axios = require('axios');
const Excel = require('exceljs');
const { logger } = require('../utils/logger');

/**
 * Servicio central para manejar "runs" de exportación/importación de datos.
 * - startRun dispara la extracción y retorna información previa (runId, métricas, preview)
 * - confirmMetrics normaliza y persiste los datos seleccionados.
 */
class ExportRunner {
  /**
   * Inicia una corrida de export.
   * @param {string} sourceType
   * @param {object} config
   * @returns {object} { runId, availableMetrics, preview, counts, logsSummary }
   */
  static async startRun(sourceType, config) {
    const runId = uuidv4();
    const sanitized = sanitizeConfig(config);
    const runDoc = await ExportRun.create({ runId, sourceType, config: sanitized, status: 'running' });

    let rows = [];
    try {
      switch (sourceType) {
        case 'universal':
          rows = await this._runUniversal(sanitized, runDoc);
          break;
        case 'evo':
          rows = await this._runEvo(sanitized, runDoc);
          break;
        case 'excel':
          rows = await this._runExcel(sanitized, runDoc);
          break;
        default:
          throw new Error(`sourceType desconocido: ${sourceType}`);
      }

      const preview = (Array.isArray(rows) ? rows.slice(0, 30) : []);
      const availableMetrics = detectMetrics(rows);
      const counts = { total: Array.isArray(rows) ? rows.length : 0 };

      await ExportRun.findOneAndUpdate({ runId }, {
        status: 'done', rawPreview: preview, availableMetrics, counts
      });

      return { runId, availableMetrics, preview, counts, logsSummary: [] };
    } catch (err) {
      await ExportRun.findOneAndUpdate({ runId }, { status: 'failed' });
      throw err;
    }
  }

  static async confirmMetrics(runId, selectedMetrics = []) {
    const run = await ExportRun.findOne({ runId });
    if (!run) throw new Error('Run no encontrado');
    const rows = run.rawPreview || [];
    const countsByMetric = {};

    for (const metric of selectedMetrics) {
      countsByMetric[metric] = await this.normalizeAndPersist(metric, rows, run.sourceType);
    }

    run.metricsConfirmed = selectedMetrics;
    run.datasetActivated = true;
    await run.save();

    return { ok: true, runId, countsByMetric, datasetActivated: true };
  }

  // helpers para cada tipo
  static async _runUniversal(config, runDoc) {
    // config debe ser la configuración completa de UniversalExtractor
    const extractor = new UniversalExtractor(config);
    // extraer todos los endpoints y concatenar para preview
    const allRows = [];
    if (Array.isArray(config.endpoints)) {
      for (const ep of config.endpoints) {
        const name = ep.path || ep.table;
        try {
          const res = await extractor.extract(name);
          // res.data contiene arreglo o valor único
          if (Array.isArray(res.data)) {
            allRows.push(...res.data);
          } else if (res.data != null) {
            allRows.push(res.data);
          }
          // optionally store logs
          if (res.logs && res.logs.length) {
            runDoc.logs.push(...res.logs.map(l => ({ level: 'info', message: 'extract log', meta: l })));
          }
        } catch (e) {
          runDoc.logs.push({ level: 'warn', message: `extractor fallo ${name}: ${e.message}` });
        }
      }
    }
    return allRows;
  }

  static async _runEvo(config, runDoc) {
    const rows = [];
    // config puede contener { abc: { type, endpointId, params }, w12: { url, params } }
    if (config.abc && config.abc.endpointId) {
      if (!['memberships','payables'].includes(config.abc.type)) {
        throw new Error('abc.type debe ser memberships o payables');
      }
      // validación de dominio permitidos se hace en servicio abcEvo
      if (config.abc.type === 'memberships') {
        const data = await getMemberships(config.abc.endpointId, config.abc.params || {});
        if (Array.isArray(data)) rows.push(...data);
      } else {
        const data = await getPayables(config.abc.endpointId, config.abc.params || {});
        if (Array.isArray(data)) rows.push(...data);
      }
    }
    // soporte básico W12
    if (config.w12 && config.w12.url) {
      const url = config.w12.url;
      if (!url.startsWith('https://evo-integracao-api.w12app.com.br')) {
        throw new Error('Dominio no permitido para W12');
      }
      try {
        const resp = await axios.get(url, { params: config.w12.params || {}, timeout: 10000 });
        if (Array.isArray(resp.data)) rows.push(...resp.data);
      } catch (err) {
        runDoc.logs.push({ level: 'error', message: `W12 fetch error: ${err.message}`, meta: { url, statusCode: err.response?.status, bodyPreview: err.response?.data } });
      }
    }
    return rows;
  }

  static async _runExcel(config, runDoc) {
    // config.filePath debe apuntar a un archivo válido en disco
    if (!config.filePath) throw new Error('No se proporcionó filePath para excel');
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(config.filePath);
    const worksheet = workbook.worksheets[0];
    const rows = [];
    let headers = [];
    worksheet.eachRow((row, rowNumber) => {
      const values = row.values; // note: values[0] is null
      if (rowNumber === 1) {
        headers = values.slice(1).map(v => String(v).trim());
      } else {
        const obj = {};
        values.slice(1).forEach((val, idx) => {
          obj[headers[idx] || `col${idx}`] = val;
        });
        rows.push(obj);
      }
    });
    return rows;
  }

  static async normalizeAndPersist(metric, rows, source) {
    let count = 0;
    switch (metric) {
      case 'clients':
        for (const row of rows) {
          const obj = {
            externalId: row.externalId || row.id || row.member_id || row.idMember || '',
            name: row.name || row.fullName || row.clientName || '',
            email: row.email || row.emailAddress || '',
            phone: row.phone || row.cellPhone || row.telefono || '',
            status: row.status || (row.active ? 'active' : 'cancelled') || 'unknown',
            source,
            updatedAt: new Date()
          };
          if (obj.externalId) {
            await Cliente.updateOne({ source, externalId: obj.externalId }, { $set: obj }, { upsert: true });
            count++;
          }
        }
        break;
      case 'sales':
        for (const row of rows) {
          const obj = {
            externalId: row.externalId || row.id || row.saleId || '',
            clientExternalId: row.clientExternalId || row.member_id || row.idMember || '',
            amount: parseFloat(row.amount || row.total || row.value || 0) || 0,
            date: row.date ? new Date(row.date) : (row.saleDate ? new Date(row.saleDate) : null),
            source,
            updatedAt: new Date()
          };
          if (obj.externalId) {
            await Venta.updateOne({ source, externalId: obj.externalId }, { $set: obj }, { upsert: true });
            count++;
          }
        }
        break;
      case 'memberships':
        for (const row of rows) {
          const obj = {
            externalId: row.externalId || row.id || row.membership_id || '',
            clientExternalId: row.clientExternalId || row.member_id || row.idMember || '',
            status: row.status || (row.active ? 'active' : 'cancelled') || '',
            startDate: row.startDate ? new Date(row.startDate) : null,
            endDate: row.endDate ? new Date(row.endDate) : null,
            source,
            updatedAt: new Date()
          };
          if (obj.externalId) {
            await Membership.updateOne({ source, externalId: obj.externalId }, { $set: obj }, { upsert: true });
            count++;
          }
        }
        break;
      case 'payables':
        for (const row of rows) {
          const obj = {
            externalId: row.externalId || row.id || row.payable_id || '',
            clientExternalId: row.clientExternalId || row.member_id || row.idMember || '',
            amountDue: parseFloat(row.amountDue || row.due || row.value || 0) || 0,
            dueDate: row.dueDate ? new Date(row.dueDate) : null,
            status: row.status || '',
            source,
            updatedAt: new Date()
          };
          if (obj.externalId) {
            await Payable.updateOne({ source, externalId: obj.externalId }, { $set: obj }, { upsert: true });
            count++;
          }
        }
        break;
      default:
        break;
    }
    return count;
  }
}

// Helpers
function sanitizeConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return {};
  const copy = JSON.parse(JSON.stringify(cfg));
  // remove any field that looks like a token or password
  function scrub(o) {
    for (const k of Object.keys(o)) {
      if (/token|secret|password|pwd|apiKey/i.test(k)) {
        delete o[k];
      } else if (typeof o[k] === 'object') {
        scrub(o[k]);
      }
    }
  }
  scrub(copy);
  return copy;
}

function detectMetrics(rows) {
  const metrics = new Set();
  (rows || []).slice(0, 100).forEach(row => {
    const keys = Object.keys(row).map(k => k.toLowerCase());
    if (keys.some(k => /member|name|email/.test(k))) metrics.add('clients');
    if (keys.some(k => /amount|total|payment/.test(k))) metrics.add('sales');
    if (keys.some(k => /membership|plan|renew/.test(k))) metrics.add('memberships');
    if (keys.some(k => /payable|debt|due/.test(k))) metrics.add('payables');
    if (keys.some(k => /lead|prospect/.test(k))) metrics.add('prospects');
    if (keys.some(k => /entry|access/.test(k))) metrics.add('entries');
    if (keys.some(k => /alert/.test(k))) metrics.add('alerts');
  });
  return Array.from(metrics);
}

module.exports = ExportRunner;
