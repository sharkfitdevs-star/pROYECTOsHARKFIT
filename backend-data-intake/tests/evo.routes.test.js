let MongoMemoryServer;
try {
  MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
} catch (err) {
  MongoMemoryServer = null;
}
const mongoose = require('mongoose');
const request = require('supertest');

jest.setTimeout(20000);

const describeIfMongo = MongoMemoryServer ? describe : describe.skip;

describeIfMongo('GET /api/evo/dashboard/stats — extractor / mongodb compatibility', () => {
  let mongod;
  let originalEnv;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    const { connectDB } = require('../src/db/mongodb');
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.env = originalEnv;
  });

  beforeEach(async () => {
    // clean
    const db = mongoose.connection.db;
    const cols = await db.listCollections().toArray();
    await Promise.all(cols.map(c => db.collection(c.name).deleteMany({})));
  });

  test('returns aggregated stats from MongoDB when extractor config is absent', async () => {
    const Cliente = require('../src/models/Cliente');
    const Venta = require('../src/models/Venta');
    const AccessLog = require('../src/models/AccessLog');

    // Insert sample documents
    await Cliente.create({ tenantId: 'tenant-test', uniqueId: 'c-1', idMember: 'm-1', name: 'Test Client', email: 't@example.com', registrationDate: new Date() });
    await Venta.create({ tenantId: 'tenant-test', idSale: 's-1', idMember: 'm-1', amount: 2500, totalAmount: 2500, saleDate: new Date(), saleType: 'plan' });
    await AccessLog.create({ tenantId: 'tenant-test', evoEntryId: 'e-1', memberId: 'm-1', accessTime: new Date().toISOString(), location: 'central' });

    const app = require('../src/app');

    // sanity-check health endpoint first
    const h = await request(app).get('/api/health');
    // ensure server app is responding
    expect(h.status).toBe(200);

    const res = await request(app).get('/api/evo/dashboard/stats').query({ mode: 'db' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_sales');
    expect(res.body).toHaveProperty('total_prospects');
    expect(res.body).toHaveProperty('total_entries');
    expect(res.body.total_sales).toBeGreaterThanOrEqual(1);
    expect(res.body.total_entries).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.recent_sales)).toBe(true);
    expect(Array.isArray(res.body.recent_prospects)).toBe(true);
    expect(Array.isArray(res.body.recent_entries)).toBe(true);
  });

  test('returns aggregated stats from extractor when config present (mocked UniversalExtractor)', async () => {
    // Use isolateModules + doMock so the mock doesn't affect other tests
    let isolatedApp;
    jest.isolateModules(() => {
      const mockExtract = jest.fn((path) => {
        if (path.includes('sales')) return Promise.resolve({ success: true, data: [{ id: 'SX1', value: 500 }] });
        if (path.includes('prospects')) return Promise.resolve({ success: true, data: [{ id: 'PX1', name: 'Prospecto X', email: 'x@ex.com' }] });
        if (path.includes('entries')) return Promise.resolve({ success: true, data: [{ id: 'EX1', accessTime: new Date().toISOString() }] });
        return Promise.resolve({ success: true, data: [] });
      });

      jest.doMock('../src/connectors/UniversalExtractor', () => {
        return jest.fn().mockImplementation(() => ({ extract: mockExtract }));
      });

      isolatedApp = require('../src/app');
    });

    const res = await request(isolatedApp).get('/api/evo/dashboard/stats').query({ mode: 'extractor' });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('extractor');
    expect(res.body.total_sales).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.recent_sales)).toBe(true);

    // cleanup
    jest.dontMock('../src/connectors/UniversalExtractor');
  });
});
