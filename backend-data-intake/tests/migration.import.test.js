const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { importJsonToMongo } = require('../scripts/import-json-to-mongo');
const Cliente = require('../src/models/Cliente');
const Venta = require('../src/models/Venta');
const Lead = require('../src/models/Lead');
const AccessLog = require('../src/models/AccessLog');

describe('import-json-to-mongo', () => {
  let mongoServer;
  const tmpDir = path.join(__dirname, 'migration-sample');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    // prepare sample JSON files
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    fs.writeFileSync(path.join(tmpDir, 'members.json'), JSON.stringify([
      { id: 'm-uuid-1', evo_member_id: 123, name: 'Juan Perez', created_at: '2024-01-01T00:00:00Z' }
    ]));

    fs.writeFileSync(path.join(tmpDir, 'prospects.json'), JSON.stringify([
      { id: 'p-uuid-1', evo_prospect_id: 999, name: 'Lead Uno', email: 'lead@x.com', registration_date: '2024-02-02T00:00:00Z' }
    ]));

    fs.writeFileSync(path.join(tmpDir, 'sales.json'), JSON.stringify([
      { id: 's-uuid-1', evo_sale_id: 555, member_id: 'm-uuid-1', monto: 120.5, sale_date: '2024-02-03T12:00:00Z', status: 'pagado' }
    ]));

    fs.writeFileSync(path.join(tmpDir, 'access_logs.json'), JSON.stringify([
      { id: 'a-uuid-1', evo_entry_id: 888, member_id: 'm-uuid-1', access_time: '2024-02-03T08:00:00Z', location: 'Main' }
    ]));

    fs.writeFileSync(path.join(tmpDir, 'sync_queue.json'), JSON.stringify([
      { id: 1, tenant_id: 't-1', job_type: 'FULL_SYNC', status: 'COMPLETED', created_at: '2024-02-03T09:00:00Z', processed_at: '2024-02-03T09:01:00Z' }
    ]));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('imports sample JSON into Mongo collections', async () => {
    const report = await importJsonToMongo({ inputDir: tmpDir, dryRun: false });
    expect(report.members).toBe(1);
    expect(report.prospects).toBe(1);
    expect(report.sales).toBe(1);
    expect(report.access_logs).toBe(1);
    expect(report.sync_queue).toBe(1);

    const cliente = await Cliente.findOne({ idMember: '123' }).lean();
    expect(cliente).toBeTruthy();
    expect(cliente.name).toMatch(/Juan/);

    const lead = await Lead.findOne({ leadId: 'p-uuid-1' }).lean();
    expect(lead).toBeTruthy();
    expect(lead.email).toBe('lead@x.com');

    const venta = await Venta.findOne({ idSale: '555' }).lean();
    expect(venta).toBeTruthy();
    expect(venta.amount).toBeCloseTo(120.5);

    const access = await AccessLog.findOne({ evoEntryId: '888' }).lean();
    expect(access).toBeTruthy();
    expect(access.location).toBe('Main');
  });
});
