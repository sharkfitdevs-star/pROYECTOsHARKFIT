
/**
 * Script de reparación de datos legacy
 * - Asigna un importId fijo a clientes que no tengan ninguno
 * - Registra/actualiza un log en sync_logs para posterior consulta
 *
 * Usage:
 *   MONGODB_URI="mongodb://..." node scripts/migrations/assignLegacyImportId.js
 */

const mongoose = require('mongoose');
const Cliente = require('../../src/models/Cliente');
const {
  createSyncLog,
  findSyncLogById,
  updateSyncLog
} = require('../../src/db/repositories');

const LEGACY_IMPORT_ID = 'legacy_20260224';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI no definido');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Conectado a Mongo');

  const filter = {
    $or: [
      { importId: { $exists: false } },
      { importId: null },
      { importId: '' }
    ]
  };

  const countBefore = await Cliente.countDocuments(filter);
  const nameIssue = await Cliente.countDocuments({
    $or: [
      { name: null },
      { name: '' },
      { name: 'Sin nombre' }
    ]
  });

  console.log(`Clientes sin importId: ${countBefore}`);
  console.log(`Clientes con nombre vacío/Sin nombre: ${nameIssue}`);

  const res = await Cliente.updateMany(filter, { $set: { importId: LEGACY_IMPORT_ID } });
  console.log(`Documentos modificados: ${res.modifiedCount}`);

  const now = new Date();
  let hist = await findSyncLogById(LEGACY_IMPORT_ID);
  if (hist) {
    await updateSyncLog(LEGACY_IMPORT_ID, {
      insertedCount: res.modifiedCount,
      totalRows: res.modifiedCount
    });
    console.log('Registro de importación legacy actualizado');
  } else {
    await createSyncLog({
      syncId: LEGACY_IMPORT_ID,
      entidad: 'clientes',
      estatus: 'Exitoso',
      insertedCount: res.modifiedCount,
      totalRows: res.modifiedCount,
      fileMeta: { originalName: 'LEGACY_DATA', size: 0, mimetype: '', ext: '' },
      mappingUsed: 'legacy',
      detectedHeaders: [],
      iniciado: now,
      finalizado: now,
      createdAt: now
    });
    console.log('Registro de importación legacy creado');
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
