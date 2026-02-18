const request = require('supertest');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

describe('Import routes (enqueue behavior)', () => {
  let originalEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    jest.resetModules();

    // Asegurar uploads vacía antes de cada test
    try {
      if (fs.existsSync(UPLOAD_DIR)) {
        for (const f of fs.readdirSync(UPLOAD_DIR)) {
          fs.rmSync(path.join(UPLOAD_DIR, f), { force: true });
        }
      }
    } catch (err) {
      // noop
    }

    // Si hay conexión mongoose activa, limpiar colecciones para evitar interferencia
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const collections = Object.keys(mongoose.connection.collections);
      for (const collName of collections) {
        try {
          await mongoose.connection.collections[collName].deleteMany({});
        } catch (err) {
          // ignore
        }
      }
    }
  });

  afterEach(async () => {
    process.env = originalEnv;

    // eliminar archivos subidos por multer
    try {
      if (fs.existsSync(UPLOAD_DIR)) {
        for (const f of fs.readdirSync(UPLOAD_DIR)) {
          fs.rmSync(path.join(UPLOAD_DIR, f), { force: true });
        }
      }
    } catch (err) {
      // noop
    }
  });

  afterAll(async () => {
    // Cierre/limpieza robusta de mongoose para evitar 'open handles'
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
      }
    } catch (err) {
      // no bloquear el pipeline de tests
    }

    // Limpiar modelos registrados para prevenir warnings en ejecuciones siguientes
    mongoose.models = {};
    mongoose.modelSchemas = {};
  });

  test('POST /api/import/excel enqueues import job via queueImportTask', async () => {
    const queueImportTask = jest.fn().mockResolvedValue({ id: 'imp-job-1' });
    jest.doMock('../src/workers/api-worker', () => ({ queueImportTask }));

    const app = require('../src/app');

    const mapeo = { Nombre: 'cliente.nombre', Email: 'cliente.email' };

    const res = await request(app)
      .post('/api/import/excel')
      .field('mapeo', JSON.stringify(mapeo))
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake-xlsx-content'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.queued).toBe(true);
    expect(res.body.jobId).toBe('imp-job-1');
    expect(queueImportTask).toHaveBeenCalledWith('excel', expect.objectContaining({ path: expect.any(String) }), expect.any(Object), 'clientes');
  });

  test('POST /api/import/csv enqueues CSV import job via queueImportTask', async () => {
    const queueImportTask = jest.fn().mockResolvedValue({ id: 'imp-job-2' });
    jest.doMock('../src/workers/api-worker', () => ({ queueImportTask }));

    const app = require('../src/app');

    const mapeo = { Nombre: 'cliente.nombre', Email: 'cliente.email' };

    const res = await request(app)
      .post('/api/import/csv')
      .field('mapeo', JSON.stringify(mapeo))
      .field('entidad', 'clientes')
      .field('delimitador', ',')
      .attach('file', Buffer.from('a,b\n1,2'), { filename: 'data.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.queued).toBe(true);
    expect(res.body.jobId).toBe('imp-job-2');
    expect(queueImportTask).toHaveBeenCalledWith('csv', expect.objectContaining({ path: expect.any(String) }), expect.any(Object), 'clientes', expect.objectContaining({ delimitador: ',' }));
  });
});
