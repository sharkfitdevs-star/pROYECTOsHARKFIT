const request = require('supertest');

describe('Export routes (enqueue behavior)', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  test('GET /api/clientes/export enqueues export job via queueExportTask', async () => {
    const queueExportTask = jest.fn().mockResolvedValue({ id: 'exp-job-1' });
    jest.doMock('../src/workers/api-worker', () => ({ queueExportTask }));

    const app = require('../src/app');

    const res = await request(app).get('/api/clientes/export').query({ format: 'csv' });
    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(true);
    expect(res.body.jobId).toBe('exp-job-1');
    expect(queueExportTask).toHaveBeenCalledWith('clientes', 'csv', {});
  });

  test('GET /api/ventas/export enqueues export job via queueExportTask', async () => {
    const queueExportTask = jest.fn().mockResolvedValue({ id: 'exp-job-2' });
    jest.doMock('../src/workers/api-worker', () => ({ queueExportTask }));

    const app = require('../src/app');

    const res = await request(app).get('/api/ventas/export').query({ format: 'excel', desde: '2024-01-01' });
    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(true);
    expect(queueExportTask).toHaveBeenCalledWith('ventas', 'excel', expect.objectContaining({ desde: '2024-01-01' }));
  });
});