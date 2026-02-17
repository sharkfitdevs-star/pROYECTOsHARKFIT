/**
 * EXTRACTOR UNIVERSAL: MongoDB + APIs REST
 * 
 * Uso:
 *   npm run extract -- --config mongodb-main
 *   npm run extract -- --config api-shopify
 *   npm run extract-all (todos los archivos de config)
 */

const path = require('path');
const fs = require('fs');
const UniversalExtractor = require('./connectors/UniversalExtractor');
const { logger } = require('./utils/logger');
const { createSyncLog, updateSyncLog } = require('./db/repositories');
const { v4: uuidv4 } = require('uuid');

/**
 * Extrae datos y sincroniza a BD
 */
async function extractAndSync(configName = 'mongodb-main') {
  const syncId = uuidv4();
  
  try {
    // Cargar configuración
    const configPath = path.join(__dirname, '../configs', `${configName}.json`);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuración no encontrada: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Reemplazar variables de entorno
    const config = JSON.parse(
      configContent.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] || '')
    );

    logger.info(`🚀 Iniciando extracción`, {
      syncId,
      config: config.id,
      type: config.type,
      engine: config.engine
    });

    // Crear extractor
    const extractor = new UniversalExtractor(config);

    // Crear log de sincronización
    await createSyncLog({
      syncId,
      fuente: config.id,
      estatus: 'Iniciado',
      iniciado: new Date()
    });

    // Extraer cada endpoint
    const results = {};
    const startTime = Date.now();

    for (const endpoint of config.endpoints) {
      const endpointName = endpoint.path || endpoint.table;
      
      try {
        const result = await extractor.extract(endpointName);
        
        results[endpointName] = {
          success: result.success,
          strategy: result.source,
          records: result.data ? (Array.isArray(result.data) ? result.data.length : 1) : 0,
          duration: result.duration
        };

        if (result.success) {
          // ✅ Sincronizar a BD si es necesario
          logger.info(`✅ Extracción exitosa`, {
            syncId,
            endpoint: endpointName,
            records: results[endpointName].records
          });

          // TODO: Aquí iría el upsert a BD
          // await syncToDB(endpointName, result.data, config);
        } else {
          // ❌ Falló
          logger.error(`❌ Extracción falló`, {
            syncId,
            endpoint: endpointName,
            error: result.error
          });
        }

      } catch (error) {
        logger.error(`Error extrayendo ${endpointName}:`, error);
        results[endpointName] = {
          success: false,
          error: error.message
        };
      }
    }

    // Finalizar log
    const duration = Date.now() - startTime;
    
    await updateSyncLog(syncId, {
      estatus: 'Completado',
      cambios: JSON.stringify(results),
      finalizado: new Date(),
      duracionMs: duration
    });

    // Mostrar resumen
    console.log(`\n${'═'.repeat(75)}`);
    console.log(`✅ SINCRONIZACIÓN COMPLETADA`);
    console.log(`${'═'.repeat(75)}\n`);

    for (const [endpoint, result] of Object.entries(results)) {
      if (result.success) {
        console.log(`✅ ${endpoint}`);
        console.log(`   Registros: ${result.records}`);
        console.log(`   Strategy: ${result.strategy}`);
        console.log(`   Duración: ${result.duration}ms\n`);
      } else {
        console.log(`❌ ${endpoint}`);
        console.log(`   Error: ${result.error}\n`);
      }
    }

    console.log(`Tiempo total: ${duration}ms`);
    console.log(`${'═'.repeat(75)}\n`);

    return { syncId, success: true, results, duration };

  } catch (error) {
    logger.error(`❌ Error fatal en extracción`, error);
    
    await updateSyncLog(syncId, {
      estatus: 'Fallido',
      errores: JSON.stringify([{ error: error.message }]),
      finalizado: new Date()
    });

    throw error;
  }
}

/**
 * Extrae de TODAS las configuraciones disponibles
 */
async function extractAll() {
  const configDir = path.join(__dirname, '../configs');
  const files = fs.readdirSync(configDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('.'));

  console.log(`\n📂 Encontradas ${files.length} configuraciones\n`);

  const allResults = {};

  for (const file of files) {
    const configName = file.replace('.json', '');
    
    try {
      console.log(`\n🔄 Extrayendo: ${configName}\n`);
      const result = await extractAndSync(configName);
      allResults[configName] = result;
    } catch (error) {
      logger.error(`Fallo extrayendo ${configName}:`, error);
      allResults[configName] = { success: false, error: error.message };
    }
  }

  return allResults;
}

/**
 * Extrae solo configuraciones de APIs externas (api-*)
 */
async function extractAllApis() {
  const configDir = path.join(__dirname, '../configs');
  const files = fs.readdirSync(configDir)
    .filter(f => f.startsWith('api-') && f.endsWith('.json'));

  console.log(`\n📂 Encontradas ${files.length} configuraciones de APIs externas\n`);

  const allResults = {};

  for (const file of files) {
    const configName = file.replace('.json', '');

    try {
      console.log(`\n🔄 Extrayendo: ${configName}\n`);
      const result = await extractAndSync(configName);
      allResults[configName] = result;
    } catch (error) {
      logger.error(`Fallo extrayendo ${configName}:`, error);
      allResults[configName] = { success: false, error: error.message };
    }
  }

  return allResults;
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────

async function main() {
  const command = process.argv[2];
  const configName = process.argv[4] || 'mongodb-main';

  try {
    if (command === '--config' || !command) {
      const result = await extractAndSync(configName);
      process.exit(result.success ? 0 : 1);
    } else if (command === '--all') {
      const results = await extractAll();
      const allSuccess = Object.values(results).every(r => r.success);
      process.exit(allSuccess ? 0 : 1);
    } else {
      console.error(`Comando desconocido: ${command}`);
      console.log(`Uso: npm run extract -- --config mongodb-main`);
      console.log(`     npm run extract -- --all`);
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar si se corre directamente
if (require.main === module) {
  main();
}

module.exports = {
  extractAndSync,
  extractAll,
  extractAllApis
};
