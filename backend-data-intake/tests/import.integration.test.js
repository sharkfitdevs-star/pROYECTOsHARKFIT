const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

// We need real queueImportTask, not the jest.setup mock
jest.unmock('../src/workers/api-worker');

let mongoServer;
let app;
const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  // force re-require app so it uses new connection and real worker
  jest.resetModules();
  app = require('../src/app');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
});

afterAll(async () => {
  try { await mongoose.disconnect(); } catch {};
  if (mongoServer) await mongoServer.stop();
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
});

afterEach(async () => {
  // clear collections
  const names = Object.keys(mongoose.connection.collections);
  for (const n of names) {
    try { await mongoose.connection.collections[n].deleteMany({}); } catch (e) {}
  }
});

describe('integration import flow', () => {
  test('CSV import through route persists a cliente and appears in history', async () => {
    const filepath = path.join(UPLOAD_DIR, 'full.csv');
    fs.writeFileSync(filepath, 'nombre,apellido,email\nCarlos,Santana,carlos@x.com');
    const mapeo = { nombre: 'nombre', apellido: 'apellido', email: 'email' };

    const res = await request(app)
      .post('/api/import/csv')
      .field('mapeo', JSON.stringify(mapeo))
      .field('entidad', 'clientes')
      .field('delimitador', ',')
      .attach('file', fs.readFileSync(filepath), { filename: 'full.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.jobId).toBeTruthy();

    // since queue is in-memory, job should execute immediately; give small pause
    await new Promise(r => setTimeout(r, 100));

    // history
    const hist = await request(app).get('/api/import/history');
    expect(hist.status).toBe(200);
    expect(hist.body.exito).toBe(true);
    expect(hist.body.datos.length).toBe(1);
    const item = hist.body.datos[0];
    expect(item.registrosProcesados).toBe(1);
    expect(item.registrosInseridos).toBe(1);
    expect(item.registrosFallidos).toBe(0);

    // clientes route
    const cli = await request(app).get('/api/clientes');
    expect(cli.status).toBe(200);
    expect(cli.body.total).toBe(1);
    expect(cli.body.clientes[0].email).toBe('carlos@x.com');
  });
});