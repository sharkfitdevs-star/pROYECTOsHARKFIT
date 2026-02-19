let MongoMemoryServer;
try {
  MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
} catch (err) {
  MongoMemoryServer = null;
}
const mongoose = require('mongoose');
const request = require('supertest');

const describeIfMongo = MongoMemoryServer ? describe : describe.skip;
// Tests that hit mongodb-memory-server can be a bit slow on CI/low-end machines
jest.setTimeout(20000);

describeIfMongo('API compatibility — fields expected by Django (contract)', () => {
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
    // Defensive cleanup for background timers
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
    // clean
    const db = mongoose.connection.db;
    const cols = await db.listCollections().toArray();
    await Promise.all(cols.map(c => db.collection(c.name).deleteMany({})));

    // Reset modules to ensure test isolation, then reconnect the fresh mongoose instance
    jest.resetModules();
    const { connectDB } = require('../src/db/mongodb');
    await connectDB();
  });

  test('GET /api/clientes returns expected fields (idMember, name)', async () => {
    const Cliente = require('../src/models/Cliente');
    await Cliente.create({ uniqueId: 'u-1', idMember: 'm-1', name: 'Ana', email: 'a@x.com' });

    const app = require('../src/app');
    const res = await request(app).get('/api/clientes').query({ limit: 10 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const c = res.body.data[0];
    expect(c).toHaveProperty('idMember');
    expect(c).toHaveProperty('name');
  });

  test('GET /api/ventas returns expected fields (idMember, saleDate, amount)', async () => {
    const Venta = require('../src/models/Venta');
    await Venta.create({ idSale: 's-1', idMember: 'm-1', amount: 100, totalAmount: 100, saleDate: new Date(), saleType: 'plan' });

    const app = require('../src/app');
    const res = await request(app).get('/api/ventas').query({ limit: 10 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const v = res.body.data[0];
    expect(v).toHaveProperty('idMember');
    expect(v).toHaveProperty('saleDate');
    expect(v).toHaveProperty('amount');
  });
});
