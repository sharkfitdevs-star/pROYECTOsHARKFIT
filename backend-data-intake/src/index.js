/**
 * EXTRACTOR UNIVERSAL
 * Uso: npm run extract -- --config api-evo
 */

require('dotenv').config();
const { connectDB, disconnectDB } = require('./db/mongodb');
const path = require('path');
const fs   = require('fs');
const UniversalExtractor = require('./connectors/UniversalExtractor');
const { logger }         = require('./utils/logger');
const { createSyncLog, updateSyncLog, syncToRepo, getLastSuccessfulSyncBySource } = require('./db/repositories');
const { v4: uuidv4 }     = require('uuid');
const { RateLimiter }    = require('./services/RateLimiter');

function resolveConfigEnv(config) {
  if (!config || typeof config !== 'object') return config;
  return JSON.parse(
    JSON.stringify(config).replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] || '')
  );
}

async function _runExtraction(config) {
  const syncId = uuidv4();

  // Derive a clean API name for rate limiting (e.g. "api-evo" -> "EVO")
  const apiName = ((config.id || config.name || 'default')
    .replace(/^api-/i, '')
    .toUpperCase());
  const limiter = new RateLimiter(apiName);
  config.rateLimiter = limiter;
  config.apiName = config.apiName || apiName;

  logger.info(`🚀 Iniciando extracción`, { syncId, config: config.id, type: config.type });

  await connectDB();

  // ── Incremental sync: resolve lastSyncAt ─────────────────
  let lastSyncAt = null;
  try {
    const lastSync = await getLastSuccessfulSyncBySource(config.id);
    if (lastSync?.finalizado) {
      lastSyncAt = new Date(lastSync.finalizado);
      logger.info(`🔄 Sync incremental desde: ${lastSyncAt.toISOString()}`, { config: config.id });
    } else {
      logger.info(`🆕 Sync completo (primera vez)`, { config: config.id });
    }
  } catch (err) {
    logger.warn(`No se pudo obtener lastSyncAt, se hará sync completo`, { err: err.message });
  }

  // Inject date filter into each endpoint that supports it
  if (lastSyncAt) {
    const fromIso = lastSyncAt.toISOString();
    for (const ep of (config.endpoints || [])) {
      ep.params = Object.assign({}, ep.params, { from: fromIso });
    }
  }

  const extractor = new UniversalExtractor(config);

  await createSyncLog({ syncId, fuente: config.id, estatus: 'Iniciado', iniciado: new Date(), userId: config.userId || null });

  const results = {};
  const errors  = [];
  const startTime = Date.now();

  for (const endpoint of (config.endpoints || [])) {
    const epName = endpoint.path || endpoint.table || 'unknown';

    try {
      const result = await extractor.extract(epName);

      results[epName] = {
        success:  result.success,
        records:  result.records,
        dataType: result.dataType,
        duration: result.duration,
        error:    result.error || null,
        data:     Array.isArray(result.data) ? result.data : []
      };

      if (result.success && result.dataType && result.data.length > 0) {
        const syncResult = await syncToRepo(result.dataType, result.data);
        results[epName].upserted = syncResult.upserted;
      }

    } catch (err) {
      logger.error(`Error en endpoint ${epName}:`, err);
      results[epName] = { success: false, error: err.message };
      errors.push({ endpoint: epName, error: err.message });
    }
  }

  const duration = Date.now() - startTime;

  // 'Exitoso' is required so getLastSuccessfulSyncBySource can find this record next run
  await updateSyncLog(syncId, {
    estatus:    errors.length === 0 ? 'Exitoso' : 'Parcial',
    cambios:    JSON.stringify(results),
    finalizado: new Date(),
    duracionMs: duration
  });

  // ── Update ApiIntegration.lastSyncAt (best effort) ───────
  if (errors.length === 0) {
    try {
      const ApiIntegration = require('./models/ApiIntegration');
      await ApiIntegration.updateOne(
        { $or: [{ tenantId: config.id }, { name: config.id }] },
        { $set: { lastSyncAt: new Date() } }
      );
    } catch (_) { /* best effort — model may not exist in all environments */ }
  }

  // ── Rate limit stats ────────────────────────────────────
  try {
    logger.info('Rate limit stats', await limiter.getStats());

    if (apiName === 'EVO') {
      const monthly = await limiter.getMonthlyUsage();
      logger.info('📊 EVO API usage', monthly);
      if (monthly.percentUsed > 80) {
        logger.warn(`⚠️ EVO API: ${monthly.percentUsed}% del límite mensual consumido`);
      }
    }
  } catch (_) { /* MongoDB may not be available in all test environments */ }

  // ── Resumen ─────────────────────────────────────────────
  logger.info('─'.repeat(70));
  logger.info('✅ EXTRACCIÓN COMPLETADA');
  for (const [ep, r] of Object.entries(results)) {
    if (r.success) {
      logger.info(`  ✅ ${ep} → ${r.records} registros (${r.duration}ms)`);
    } else {
      logger.warn(`  ❌ ${ep} → ${r.error}`);
    }
  }
  logger.info(`  ⏱  Total: ${duration}ms`);
  logger.info('─'.repeat(70));

  await disconnectDB();
  return { syncId, success: true, apiId: config.id, results, errors, duration };
}

async function extractAndSync(configName = 'mongodb-main') {

  // ── Cargar y resolver config ────────────────────────────
  const configPath = path.join(__dirname, '../configs', `${configName}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config no encontrada: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  return _runExtraction(resolveConfigEnv(config));
}

async function extractAndSyncWithConfig(config) {
  return _runExtraction(resolveConfigEnv(config));
}

async function extractAll() {
  const configDir = path.join(__dirname, '../configs');
  const files = fs.readdirSync(configDir).filter(f => f.endsWith('.json') && !f.startsWith('.'));
  const allResults = {};
  for (const file of files) {
    const name = file.replace('.json', '');
    try {
      allResults[name] = await extractAndSync(name);
    } catch (err) {
      allResults[name] = { success: false, error: err.message };
    }
  }
  return allResults;
}

async function extractAllApis() {
  const configDir = path.join(__dirname, '../configs');
  const files = fs.readdirSync(configDir).filter(f => f.startsWith('api-') && f.endsWith('.json'));
  const allResults = {};
  for (const file of files) {
    const name = file.replace('.json', '');
    try {
      allResults[name] = await extractAndSync(name);
    } catch (err) {
      allResults[name] = { success: false, error: err.message };
    }
  }
  return allResults;
}

async function main() {
  const command    = process.argv[2];
  const configName = process.argv[3] || process.argv[4] || 'mongodb-main';
  try {
    if (command === '--config' || !command) {
      const result = await extractAndSync(configName);
      process.exit(result.success ? 0 : 1);
    } else if (command === '--all') {
      await extractAll();
      process.exit(0);
    } else {
      console.error(`Uso: npm run extract -- --config api-evo`);
      process.exit(1);
    }
  } catch (err) {
    logger.error('❌ Error fatal:', err);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { extractAndSync, extractAndSyncWithConfig, extractAll, extractAllApis };

