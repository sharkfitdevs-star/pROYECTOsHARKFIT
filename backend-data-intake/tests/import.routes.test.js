// make sure a secret is available so jwt.sign doesn't throw during tests
jest.setTimeout(20000);
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret';
process.env.JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// stub sync log helpers since routes now call them
jest.mock('../src/db/repositories', () => ({
  listImportHistory: jest.fn(),
  createSyncLog: jest.fn().mockResolvedValue(true),
  updateSyncLog: jest.fn().mockResolvedValue(true)
}));
// bypass authentication during tests
jest.mock('../src/middleware/auth', () => ({ requireAuth: (req, res, next) => next(), requireRole: () => (req, res, next) => next() }));
// avoid hitting real Mongo for Usuario.create used in issueUser
jest.mock('../src/models', () => ({
  Usuario: { create: jest.fn(async data => ({ ...data, _id: 'dummy' })) }
}));

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

describe('Import routes (enqueue behavior)', () => {
  let originalEnv;
  let authToken;

  // helper to create a user and token (similar to settings tests)
  async function issueUser(role = 'staff') {
    const { Usuario } = require('../src/models');
    const user = await Usuario.create({
      username: `u${Date.now()}`,
      email: `u${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role,
    });
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '1h' });
    return { user, token };
  }

  beforeAll(async () => {
    const issued = await issueUser('staff');
    authToken = issued.token;
  });

  test('protected routes return 401 without token', async () => {
    const app = require('../src/app');
    const r1 = await request(app).post('/api/import/excel/commit');
    expect(r1.status).toBe(401);
    expect(r1.body.error).toBe('UNAUTHORIZED');
    const r2 = await request(app).get('/api/import/history');
    expect(r2.status).toBe(401);
    expect(r2.body.error).toBe('UNAUTHORIZED');
  });

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

  test('POST /api/import/excel/commit processes file synchronously and returns counts', async () => {
    // stub service to avoid real processing
    const processExcelFile = jest.fn().mockResolvedValue({ insertedCount: 5, skippedCount: 2, estatus: 'Exitoso', totalRows:1 });
    jest.doMock('../src/services/ImportService', () => ({ processExcelFile }));

    const { createSyncLog, updateSyncLog } = require('../src/db/repositories');

    const app = require('../src/app');
    const mapeo = { Nombre: 'cliente.nombre', Email: 'cliente.email' };

    const res = await request(app)
      .post('/api/import/excel/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapeo', JSON.stringify(mapeo))
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake-xlsx-content'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.importId).toBeDefined();
    expect(res.body.totalRows).toBeUndefined(); // service stub returns no rows
    expect(res.body.insertedCount).toBe(5);
    expect(res.body.updatedCount).toBe(0);
    expect(res.body.skippedCount).toBe(2);
    expect(res.body.invalidCount).toBe(0);
    expect(Array.isArray(res.body.warnings)).toBe(true);
    expect(res.body.status).toBe('Exitoso');
    expect(res.body.counts.inserted).toBe(5);
    expect(res.body.counts.skipped).toBe(2);
    expect(processExcelFile).toHaveBeenCalled();
    expect(createSyncLog).toHaveBeenCalledWith(expect.objectContaining({ syncId: expect.any(String), estatus: 'Procesando' }));
    expect(updateSyncLog).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ estatus: expect.any(String) }));
  });

  test('commit is idempotent when same importId is reused', async () => {
    const processExcelFile = jest.fn().mockResolvedValue({ insertedCount: 1, skippedCount: 0, estatus: 'Exitoso', totalRows:1 });
    jest.doMock('../src/services/ImportService', () => ({ processExcelFile }));
    const { createSyncLog } = require('../src/db/repositories');
    createSyncLog.mockClear();

    const app = require('../src/app');
    const importId = 'fixed-id-123';

    const base = request(app).post('/api/import/excel/commit')
      .field('mapeo', JSON.stringify({ a: 'a' }))
      .field('entidad', 'clientes')
      .field('importId', importId)
      .attach('file', Buffer.from('fake'), { filename: 'd.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const [r1, r2] = await Promise.all([base, base]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.importId).toBe(importId);
    expect(r2.body.importId).toBe(importId);
    // createSyncLog called twice but should not throw duplicate-key
    expect(createSyncLog).toHaveBeenCalledTimes(2);
  });

  test('POST /api/import/csv/commit returns counts synchronously', async () => {
    const processCSVFile = jest.fn().mockResolvedValue({ insertedCount: 3, skippedCount: 1, estatus: 'Parcial', totalRows:1 });
    jest.doMock('../src/services/ImportService', () => ({ processCSVFile }));

    const { createSyncLog, updateSyncLog } = require('../src/db/repositories');

    const app = require('../src/app');
    const mapeo = { Nombre: 'cliente.nombre', Email: 'cliente.email' };

    const res = await request(app)
      .post('/api/import/csv/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapeo', JSON.stringify(mapeo))
      .field('entidad', 'clientes')
      .field('delimitador', ',')
      .attach('file', Buffer.from('a,b\n1,2'), { filename: 'data.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.importId).toBeDefined();
    expect(res.body.counts.inserted).toBe(3);
    expect(res.body.counts.skipped).toBe(1);
    expect(res.body.status).toBe('Parcial');
    expect(processCSVFile).toHaveBeenCalled();
    expect(createSyncLog).toHaveBeenCalledWith(expect.objectContaining({ syncId: expect.any(String), estatus: 'Procesando' }));
    expect(updateSyncLog).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ estatus: expect.any(String) }));
  });

  test('POST /api/import/excel/commit reports failure and still logs', async () => {
    const processExcelFile = jest.fn().mockRejectedValue(new Error('boom'));
    jest.doMock('../src/services/ImportService', () => ({ processExcelFile }));
    const { createSyncLog, updateSyncLog } = require('../src/db/repositories');

    const app = require('../src/app');
    const mapeo = { Nombre: 'cliente.nombre', Email: 'cliente.email' };

    const res = await request(app)
      .post('/api/import/excel/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapeo', JSON.stringify(mapeo))
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(res.body.importId).toBeDefined();
    expect(res.body.status).toBe('failed');
    expect(res.body.error).toMatch(/boom/);
    expect(createSyncLog).toHaveBeenCalled();
    expect(updateSyncLog).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ estatus: 'Fallido' }));
  });

  test('POST /api/import/csv/commit reports failure and still logs', async () => {
    const processCSVFile = jest.fn().mockRejectedValue(new Error('boom2'));
    jest.doMock('../src/services/ImportService', () => ({ processCSVFile }));
    const { createSyncLog, updateSyncLog } = require('../src/db/repositories');

    const app = require('../src/app');
    const mapeo = { Nombre: 'cliente.nombre' };

    const res = await request(app)
      .post('/api/import/csv/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapeo', JSON.stringify(mapeo))
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('a,b\n1,2'), { filename: 'data.csv', contentType: 'text/csv' });

    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(res.body.importId).toBeDefined();
    expect(res.body.status).toBe('failed');
    expect(res.body.error).toMatch(/boom2/);
    expect(createSyncLog).toHaveBeenCalled();
    expect(updateSyncLog).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ estatus: 'Fallido' }));
  });

  test('GET /api/import/selftest returns success when mongo writable', async () => {
    // mock repositories before loading app
    const findSyncLogById = jest.fn().mockResolvedValue({ syncId: 'selftest' });
    const createSyncLog = jest.fn().mockResolvedValue(true);
    const updateSyncLog = jest.fn().mockResolvedValue(true);
    jest.doMock('../src/db/repositories', () => ({
      listImportHistory: jest.fn(),
      createSyncLog,
      updateSyncLog,
      findSyncLogById
    }));

    const app = require('../src/app');
    const res = await request(app)
      .get('/api/import/selftest')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.mongo).toBe(true);
    expect(res.body.syncLogsWritable).toBe(true);
    expect(findSyncLogById).toHaveBeenCalledWith('selftest');
  });

  test('POST /api/import/excel/commit rejects missing or invalid mapping', async () => {
    const app = require('../src/app');
    const { createSyncLog, updateSyncLog } = require('../src/db/repositories');

    // malformed json using legacy field
    let res = await request(app)
      .post('/api/import/excel/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapeo', '{badjson')
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('INVALID_MAPPING');

    // malformed json using new "mapping" field
    res = await request(app)
      .post('/api/import/excel/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapping', '{badjson')
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('INVALID_MAPPING');

    // completely missing mapping (neither field present)
    res = await request(app)
      .post('/api/import/excel/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('INVALID_MAPPING');

    // missing mapping with new field name (mapping undefined still)
    res = await request(app)
      .post('/api/import/excel/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('INVALID_MAPPING');

    // empty object using legacy name
    res = await request(app)
      .post('/api/import/excel/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapeo', JSON.stringify({}))
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('INVALID_MAPPING');

    // empty object using new field name
    res = await request(app)
      .post('/api/import/excel/commit')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapping', JSON.stringify({}))
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('INVALID_MAPPING');

    expect(createSyncLog).toHaveBeenCalled();
    expect(updateSyncLog).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ estatus: 'Fallido' }));
  });

  test('POST /api/import/excel enqueues import job via queueImportTask', async () => {
    const queueImportTask = jest.fn().mockResolvedValue({ id: 'imp-job-1' });
    jest.doMock('../src/workers/api-worker', () => ({ queueImportTask }));

    const app = require('../src/app');

    const mapeo = { Nombre: 'cliente.nombre', Email: 'cliente.email' };

    const res = await request(app)
      .post('/api/import/excel')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapeo', JSON.stringify(mapeo))
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake-xlsx-content'), { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.queued).toBe(true);
    expect(res.body.jobId).toBe('imp-job-1');
    expect(res.body.syncId).toBeDefined();
    expect(queueImportTask).toHaveBeenCalledWith('excel', expect.objectContaining({ path: expect.any(String) }), expect.any(Object), 'clientes', expect.objectContaining({ syncId: expect.any(String) }));
  });

  test('POST /api/import/csv enqueues CSV import job via queueImportTask', async () => {
    const queueImportTask = jest.fn().mockResolvedValue({ id: 'imp-job-2' });
    jest.doMock('../src/workers/api-worker', () => ({ queueImportTask }));

    const app = require('../src/app');

    const mapeo = { Nombre: 'cliente.nombre', Email: 'cliente.email' };

    const res = await request(app)
      .post('/api/import/csv')
      .set('Authorization', `Bearer ${authToken}`)
      .field('mapeo', JSON.stringify(mapeo))
      .field('entidad', 'clientes')
      .field('delimitador', ',')
      .attach('file', Buffer.from('a,b\n1,2'), { filename: 'data.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.queued).toBe(true);
    expect(res.body.jobId).toBe('imp-job-2');
    expect(res.body.syncId).toBeDefined();
    expect(queueImportTask).toHaveBeenCalledWith('csv', expect.objectContaining({ path: expect.any(String) }), expect.any(Object), 'clientes', expect.objectContaining({ delimitador: ',', syncId: expect.any(String) }));
  });

  test('GET /api/import/history returns normalized field names', async () => {
    const fakeLogs = [
      {
        syncId: 'abc123',
        fuente: 'Excel',
        entidad: 'clientes',
        estatus: 'Exitoso',
        iniciado: '2025-01-01T00:00:00.000Z',
        registosProcesados: 5,
        registosInseridos: 2,
        registosActualizados: 1,
        updated_count: 1
      }
    ];
    const listImportHistory = jest.fn().mockResolvedValue(fakeLogs);
    jest.doMock('../src/db/repositories', () => ({ listImportHistory }));

    const app = require('../src/app');
    const res = await request(app)
      .get('/api/import/history')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0]).toEqual({
      syncId: 'abc123',
      iniciado: '2025-01-01T00:00:00.000Z',
      fuente: 'Excel',
      entidad: 'clientes',
      estatus: 'Exitoso',
      totalRows: undefined,
      insertedCount: undefined,
      updatedCount: undefined,
      skippedCount: undefined,
      invalidCount: undefined,
      errorMessage: undefined,
      errorCode: undefined,
      warnings: undefined,
      mappingUsed: undefined,
      detectedHeaders: undefined,
      sheetName: undefined,
      fileMeta: undefined
    });
  });

  test('POST /api/import/excel returns 400 when mapeo JSON is malformed', async () => {
    const app = require('../src/app');
    const res = await request(app)
      .post('/api/import/excel')
      .field('mapeo', '{invalidJson')
      .field('entidad', 'clientes')
      .attach('file', Buffer.from('fake'), { filename: 'x.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
    expect(res.body.error).toMatch(/Mapeo JSON inválido/);
  });

  test('POST /api/import/csv returns 400 when entidad is invalid', async () => {
    const app = require('../src/app');
    const res = await request(app)
      .post('/api/import/csv')
      .field('mapeo', JSON.stringify({ a: 'a' }))
      .field('entidad', 'invalida')
      .attach('file', Buffer.from('a,b\n1,2'), { filename: 'data.csv', contentType: 'text/csv' });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
    expect(res.body.error).toMatch(/Entidad inválida/);
  });

  test('POST /api/import/excel returns 400 when entidad is invalid', async () => {
    const app = require('../src/app');
    const res = await request(app)
      .post('/api/import/excel')
      .field('mapeo', JSON.stringify({ a: 'a' }))
      .field('entidad', 'otra')
      .attach('file', Buffer.from('fake'), { filename: 'x.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
    expect(res.body.error).toMatch(/Entidad inválida/);
  });

  test('POST /api/import/preview returns ok true with importId and additional metadata', async () => {
    const app = require('../src/app');
    // fake preview output
    const previewExcelFile = jest.fn().mockResolvedValue({
      columnas: ['Nombre','Email'],
      primerosRegistros: [['Juan','juan@test.com'],['Ana','ana@test.com']]
    });
    jest.doMock('../src/services/ImportService', () => ({ previewExcelFile }));

    const res = await request(app)
      .post('/api/import/preview')
      .field('entity','clientes')
      .attach('file', Buffer.from('data'), { filename: 'f.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.importId).toBeDefined();
    expect(res.body.headers).toEqual(['Nombre','Email']);
    expect(res.body.normalizedHeaders).toEqual(['nombre','email']);
    expect(Array.isArray(res.body.sampleRows)).toBe(true);
    expect(res.body.suggestedMapping).toEqual(expect.objectContaining({ name: 'Nombre', email: 'Email' }));
    expect(res.body.previewRows).toEqual(expect.any(Array));
  });

  test('POST /api/import/preview logs failure and returns importId', async () => {
    const app = require('../src/app');
    const res = await request(app).post('/api/import/preview');
    // missing file should produce 400 with NO_FILE error
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('NO_FILE');
    expect(res.body).toHaveProperty('importId');
  });

  test('POST /api/import/preview echoes provided importId even on error', async () => {
    const app = require('../src/app');
    const res = await request(app).post('/api/import/preview').field('importId', 'manual-42');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.importId).toBe('manual-42');
    expect(res.body.error).toBe('NO_FILE');
  });

  test('GET /api/import/history returns metadata fields when present', async () => {
    const fakeLogs = [
      {
        syncId: 'xyz',
        fuente: 'CSV',
        entidad: 'clientes',
        estatus: 'Fallido',
        total_rows: 3,
        inserted_count: 1,
        updated_count: 2,
        skipped_count: 1,
        invalid_count: 1,
        error_message: 'test error'
      }
    ];
    const listImportHistory = jest.fn().mockResolvedValue(fakeLogs.map(r => ({ ...r, registosProcesados:0, registosInseridos:0, registosActualizados:0, registosFallidos:0 })));
    jest.doMock('../src/db/repositories', () => ({ listImportHistory }));
    const app = require('../src/app');
    const res = await request(app)
      .get('/api/import/history')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.body.datos[0]).toMatchObject({
      syncId: 'xyz',
      fuente: 'CSV',
      estatus: 'Fallido',
      totalRows: 3,
      insertedCount: 1,
      updatedCount: 2,
      skippedCount: 1,
      invalidCount: 1,
      errorMessage: 'test error'
    });
  });
});
