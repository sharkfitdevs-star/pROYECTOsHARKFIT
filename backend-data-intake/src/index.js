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
const { createSyncLog, updateSyncLog, syncToRepo } = require('./db/repositories');
const { v4: uuidv4 }     = require('uuid');

async function extractAndSync(configName = 'mongodb-main') {
  const syncId = uuidv4();

  // ── Cargar y resolver config ────────────────────────────
  const configPath = path.join(__dirname, '../configs', `${configName}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config no encontrada: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(
    raw.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] || '')
  );

  logger.info(`🚀 Iniciando extracción`, { syncId, config: config.id, type: config.type });

  await connectDB();
  const extractor = new UniversalExtractor(config);

  await createSyncLog({ syncId, fuente: config.id, estatus: 'Iniciado', iniciado: new Date() });

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

  await updateSyncLog(syncId, {
    estatus:    errors.length === 0 ? 'Completado' : 'Parcial',
    cambios:    JSON.stringify(results),
    finalizado: new Date(),
    duracionMs: duration
  });

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

module.exports = { extractAndSync, extractAll, extractAllApis };

