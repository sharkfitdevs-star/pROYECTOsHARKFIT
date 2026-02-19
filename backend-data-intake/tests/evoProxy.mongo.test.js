let MongoMemoryServer;
try {
  MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
} catch (err) {
  MongoMemoryServer = null;
}
let mongoose;
const crypto = require('crypto');

jest.setTimeout(20000);

const describeIfMongo = MongoMemoryServer ? describe : describe.skip;

describeIfMongo('evo-w12-proxy — Mongo integration (mongodb-memory-server)', () => {
  let mongod;
  let originalEnv;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    // Set a valid ENCRYPTION_KEY (32 bytes hex)
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    process.env.ENCRYPTION_KEY = encryptionKey;

    // Connect using app helper
    const { connectDB } = require('../src/db/mongodb');
    await connectDB();
    mongoose = require('mongoose');
  });

  afterAll(async () => {
    // Defensive cleanup: stop any periodic health-check timers and clear Jest timers
    try {
      const { getHealthCheckService } = require('../src/services/HealthCheckService');
      const svc = getHealthCheckService && typeof getHealthCheckService === 'function' ? getHealthCheckService() : null;
      if (svc && typeof svc.stopPeriodicChecks === 'function') svc.stopPeriodicChecks();
    } catch (e) { /* noop */ }

    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.env = originalEnv;
  });

  beforeEach(async () => {
    // Clean DB
    const db = mongoose.connection.db;
    const cols = await db.listCollections().toArray();
    await Promise.all(cols.map(c => db.collection(c.name).deleteMany({})));

    // Reset modules and reconnect to ensure models use the active mongoose instance
    jest.resetModules();
    const { connectDB } = require('../src/db/mongodb');
    await connectDB();
    mongoose = require('mongoose');
  });

  test('runIntegrations inserts prospects, sales, entries and creates sync_log', async () => {
    // Prepare encrypted token for ApiIntegration so decryptToken succeeds
    const keyHex = process.env.ENCRYPTION_KEY;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
    let encrypted = cipher.update('plain-token', 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([encrypted, authTag]).toString('hex');

    // Insert ApiIntegration
    const ApiIntegration = require('../src/models/ApiIntegration');
    await ApiIntegration.create({ tenantId: 'tenant-test', dns: 'dns-test', encryptedToken: combined, encryptionIv: iv.toString('hex'), status: 'active' });

    // Mock axios.create to return canned responses
    const axios = require('axios');
    jest.spyOn(axios, 'create').mockImplementation(() => ({
      get: (url) => {
        if (url.includes('/api/v1/prospects')) return Promise.resolve({ data: [{ id: 11, name: 'Prospect A', email: 'a@example.com' }] });
        if (url.includes('/api/v2/sales')) return Promise.resolve({ data: [{ id: 'S1', idMember: 123, value: 150.5 }] });
        if (url.includes('/api/v1/entries')) return Promise.resolve({ data: [{ id: 'E1', idMember: 123, accessTime: new Date().toISOString() }] });
        return Promise.resolve({ data: [] });
      }
    }));

    // Run sync directly for the single test integration (avoid DB lock logic)
    const { syncTenant } = require('../src/evo-w12-proxy-sqlite');
    const evoRepo = require('../src/db/evoRepository');
    const integrations = await evoRepo.getActiveIntegrations();
    expect(integrations.length).toBeGreaterThan(0);

    await syncTenant(integrations[0]);

    // Assertions: Cliente (stub), Venta, AccessLog, SyncLog
    const Cliente = require('../src/models/Cliente');
    const Venta = require('../src/models/Venta');
    const AccessLog = require('../src/models/AccessLog');
    const { SyncLog } = require('../src/models');

    const cliente = await Cliente.findOne({ source: 'evo' }).lean();
    expect(cliente).toBeTruthy();

    const venta = await Venta.findOne({ source: 'evo' }).lean();
    expect(venta).toBeTruthy();
    expect(venta.amount).toBeGreaterThan(0);

    const access = await AccessLog.findOne({ evoEntryId: 'E1' }).lean();
    expect(access).toBeTruthy();

    const sync = await SyncLog.findOne({ tenant_id: 'tenant-test', fuente: 'EVO' }).lean();
    expect(sync).toBeTruthy();
    expect(sync.estatus).toBe('COMPLETED' || 'Completado' || 'completed' || sync.estatus);
  });
});