let MongoMemoryServer;
try {
  MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
} catch (err) {
  MongoMemoryServer = null;
}
const mongoose = require('mongoose');
const request = require('supertest');

const describeIfMongo = MongoMemoryServer ? describe : describe.skip;

/**
 * Validar que la nueva ruta /api/dashboard/summary devuelve el snapshot
 * asociado al run activo y que respeta filtros from/to.
 */
describeIfMongo('GET /api/dashboard/summary', () => {
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
    const db = mongoose.connection.db;
    const cols = await db.listCollections().toArray();
    await Promise.all(cols.map(c => db.collection(c.name).deleteMany({})));
  });

  test('404 cuando no hay dataset activo', async () => {
    const app = require('../src/app');
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('devuelve snapshot guardado y recalcula con rango de fechas', async () => {
    const { ExportRun } = require('../src/models');
    const { Venta, Cliente } = require('../src/models');
    const { buildDashboardSnapshot } = require('../src/services/ExportRunner');

    // crear datos de prueba
    const now = new Date();
    await Cliente.create({ uniqueId: 'c1', idMember: 'm1', name: 'A', registrationDate: now });
    await Venta.create({ idSale: 's1', idMember: 'm1', amount: 100, totalAmount: 100, saleDate: now, saleType: 'plan', paymentStatus: 'pagado' });

    // also insert one alert to verify snapshot picks it up
    const { Alert } = require('../src/models');
    await Alert.create({ runId:'r1', type:'payable_overdue', severity:'critical', message:'x' });

    const snapshot = await buildDashboardSnapshot();
    const run = await ExportRun.create({ runId: 'r1', sourceType: 'universal', status: 'done', datasetActivated: true, dashboardSnapshot: snapshot });

    const app = require('../src/app');
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(200);
    // el snapshot guardado contiene fechas como objetos; la respuesta JSON
    // serializa a string, así que comparamos con la versión parseada.
    const snapshotJson = JSON.parse(JSON.stringify(snapshot));
    expect(res.body).toEqual(snapshotJson);
    // new KPIs should be present (zero when no alerts)
    expect(res.body.kpis).toHaveProperty('alerts_count');
    expect(res.body.kpis).toHaveProperty('alerts_critical_count');
    expect(res.body.tables).toHaveProperty('lastAlerts');

    // ahora pido con un rango en el futuro, no debería haber ventas
    const future = new Date(now.getTime() + 1000 * 60 * 60).toISOString();
    const res2 = await request(app).get('/api/dashboard/summary').query({ from: future });
    expect(res2.status).toBe(200);
    expect(res2.body.kpis.total_sales).toBe(0);
    expect(res2.body.trends.salesByDay).toEqual([]);
  });
});
