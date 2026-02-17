#!/usr/bin/env node
// Wrapper que ejecuta el exporter Python (si disponible) y luego el importer Node
const { spawnSync } = require('child_process');
const path = require('path');
const { importJsonToMongo } = require('./import-json-to-mongo');

async function run() {
  const dbPath = path.resolve(process.argv[2] || '../../backend/db.sqlite3');
  const outDir = process.argv[3] || 'migration-output';
  const dryRun = process.argv.includes('--dry-run');

  console.log(`[migrate] dbPath=${dbPath} outDir=${outDir} dryRun=${dryRun}`);

  // Ejecutar exporter Python
  const py = spawnSync('python', [path.join(__dirname, 'export-sqlite-to-json.py'), '--db-path', dbPath, '--out-dir', outDir, dryRun ? '--dry-run' : ''], { stdio: 'inherit' });
  if (py.error) {
    console.warn('[migrate] No se pudo ejecutar Python exporter (asegúrate que Python esté instalado).');
    console.warn('[migrate] Si no quieres usar el exporter, coloca manualmente JSON en', outDir);
  }

  if (dryRun) {
    console.log('[migrate] dry-run completado. No se importará nada en Mongo.');
    process.exit(0);
  }

  try {
    const report = await importJsonToMongo({ inputDir: outDir, dryRun: false });
    console.log('[migrate] Import completed:', report);
    process.exit(0);
  } catch (err) {
    console.error('[migrate] Import failed:', err);
    process.exit(2);
  }
}

if (require.main === module) run();
