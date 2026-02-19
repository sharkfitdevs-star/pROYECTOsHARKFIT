#!/usr/bin/env node
/*
 Importador JSON -> MongoDB (usable como módulo y CLI)
 - Lee archivos JSON generados por `export-sqlite-to-json.py`
 - Upserta en colecciones Mongoose usando los modelos existentes
 - Soporta --dry-run y preservación de IDs
*/
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../src/db/mongodb');
const mongoose = require('mongoose');
const Cliente = require('../src/models/Cliente');
const Venta = require('../src/models/Venta');
const Lead = require('../src/models/Lead');
const AccessLog = require('../src/models/AccessLog');
const SyncLog = require('../src/models/SyncLog');

async function upsertClientes(rows, { dryRun = false } = {}) {
  let created = 0;
  for (const r of rows) {
    const doc = {
      uniqueId: r.id || undefined,
      idMember: r.evo_member_id ? String(r.evo_member_id) : undefined,
      name: r.name || r.nombre || undefined,
      source: 'evo',
      externalId: r.id || undefined,
      registrationDate: r.created_at ? new Date(r.created_at) : undefined
    };

    if (dryRun) {
      console.log('[DRY] Cliente ->', doc.idMember || doc.uniqueId, doc.name);
      continue;
    }

    await Cliente.updateOne({ idMember: doc.idMember }, { $set: doc }, { upsert: true });
    created++;
  }
  return created;
}

async function upsertLeads(rows, { dryRun = false } = {}) {
  let created = 0;
  for (const r of rows) {
    const doc = {
      leadId: r.id || undefined,
      eventoId: r.evo_prospect_id ? String(r.evo_prospect_id) : undefined,
      nombre: r.name || r.nombre || undefined,
      email: r.email || undefined,
      createdAt: r.registration_date ? new Date(r.registration_date) : undefined
    };
    if (dryRun) {
      console.log('[DRY] Lead ->', doc.leadId || doc.eventoId, doc.nombre);
      continue;
    }
    await Lead.updateOne({ leadId: doc.leadId }, { $set: doc }, { upsert: true });
    created++;
  }
  return created;
}

async function upsertVentas(rows, { dryRun = false } = {}) {
  let created = 0;
  for (const r of rows) {
    const doc = {
      idSale: r.evo_sale_id ? String(r.evo_sale_id) : (r.id ? String(r.id) : undefined),
      idMember: r.member_id || undefined,
      amount: r.monto || r.amount || 0,
      saleDate: r.sale_date ? new Date(r.sale_date) : (r.fecha ? new Date(r.fecha) : undefined),
      paymentStatus: r.status || r.estatus || 'pendiente',
      externalId: r.id || undefined,
      source: 'evo'
    };
    if (dryRun) {
      console.log('[DRY] Venta ->', doc.idSale, doc.amount);
      continue;
    }
    await Venta.updateOne({ idSale: doc.idSale }, { $set: doc }, { upsert: true });
    created++;
  }
  return created;
}

async function upsertAccessLogs(rows, { dryRun = false } = {}) {
  let created = 0;
  for (const r of rows) {
    const doc = {
      tenantId: r.tenant_id || undefined,
      evoEntryId: r.evo_entry_id ? String(r.evo_entry_id) : undefined,
      memberId: r.member_id || undefined,
      accessTime: r.access_time ? new Date(r.access_time) : (r.inicio ? new Date(r.inicio) : undefined),
      location: r.location || r.location_name || undefined
    };
    if (dryRun) {
      console.log('[DRY] AccessLog ->', doc.evoEntryId, doc.memberId);
      continue;
    }
    await AccessLog.updateOne({ tenantId: doc.tenantId, evoEntryId: doc.evoEntryId }, { $set: doc }, { upsert: true });
    created++;
  }
  return created;
}

function _normalizeLegacySyncStatus(s) {
  if (!s) return 'iniciado';
  const v = String(s).trim().toLowerCase();
  if (['completed', 'completado', 'done', 'finished', 'ok', 'success'].includes(v)) return 'completado';
  if (['failed', 'failure', 'error', 'errored'].includes(v)) return 'error';
  if (['partial', 'parcial'].includes(v)) return 'parcial';
  if (v === 'in_progress' || v === 'in-progress' || v.includes('progress') || v === 'processing') return 'en_proceso';
  if (v === 'started' || v === 'init' || v === 'iniciado') return 'iniciado';
  return 'iniciado';
}

async function importSyncQueue(rows, { dryRun = false } = {}) {
  let created = 0;
  for (const r of rows) {
    const doc = {
      syncType: (r.job_type || r.jobType || 'full').toLowerCase().includes('full') ? 'full' : (r.job_type || r.jobType || 'manual'),
      status: _normalizeLegacySyncStatus(r.status || 'iniciado'),
      startedAt: r.created_at ? new Date(r.created_at) : undefined,
      completedAt: r.processed_at ? new Date(r.processed_at) : undefined,
      notes: r.error_message || undefined,
      metadata: { legacyId: r.id }
    };
    if (dryRun) {
      console.log('[DRY] SyncLog ->', doc.syncType, doc.status, doc.startedAt);
      continue;
    }
    await SyncLog.create(doc);
    created++;
  }
  return created;
}

async function importJsonToMongo({ inputDir = 'migration-output', dryRun = false } = {}) {
  const wasConnected = mongoose.connection && mongoose.connection.readyState === 1;
  if (!wasConnected) await connectDB();

  const base = path.resolve(inputDir);
  const report = {};

  const tryRead = (name) => {
    const p = path.join(base, `${name}.json`);
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  };

  const prospects = tryRead('prospects');
  const members = tryRead('members');
  const sales = tryRead('sales');
  const access_logs = tryRead('access_logs');
  const sync_queue = tryRead('sync_queue');

  report.prospects = await upsertLeads(prospects, { dryRun });
  report.members = await upsertClientes(members, { dryRun });
  report.sales = await upsertVentas(sales, { dryRun });
  report.access_logs = await upsertAccessLogs(access_logs, { dryRun });
  report.sync_queue = await importSyncQueue(sync_queue, { dryRun });

  if (!dryRun && !wasConnected) await disconnectDB();
  return report;
}

// CLI
if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    const args = { inputDir: 'migration-output', dryRun: false };
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === '--input-dir' && argv[i+1]) { args.inputDir = argv[++i]; }
      if (a === '--dry-run') { args.dryRun = true; }
    }

    console.log(`Importando desde: ${args.inputDir} (dryRun=${args.dryRun})`);
    try {
      const res = await importJsonToMongo(args);
      console.log('\nImport report:', res);
      process.exit(0);
    } catch (err) {
      console.error('Import failed:', err);
      process.exit(2);
    }
  })();
}

module.exports = { importJsonToMongo };
