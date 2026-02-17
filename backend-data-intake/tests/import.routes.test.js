const request = require('supertest');

describe('Import routes (enqueue behavior)', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
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
    expect(queueImportTask).toHaveBeenCalledWith('excel', expect.objectContaining({ path: expect.any(String) }), expect.any(Object), 'clientes', expect.any(Object));
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
