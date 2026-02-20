const request = require('supertest');

describe('Export routes (enqueue behavior)', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
    jest.clearAllMocks();
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  test('GET /api/clientes/export enqueues export job via queueExportTask', async () => {
    const queueExportTask = jest.fn().mockResolvedValue({ id: 'exp-job-1' });
    jest.doMock('../src/workers/api-worker', () => ({ queueExportTask }));

    let app;
    jest.isolateModules(() => { app = require('../src/app'); });

    const res = await request(app).get('/api/clientes/export').query({ format: 'csv' });
    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(true);
    expect(res.body.jobId).toBe('exp-job-1');
    expect(queueExportTask).toHaveBeenCalledWith('clientes', 'csv', {});
  });

  test('GET /api/ventas/export enqueues export job via queueExportTask', async () => {
    const queueExportTask = jest.fn().mockResolvedValue({ id: 'exp-job-2' });
    jest.doMock('../src/workers/api-worker', () => ({ queueExportTask }));

    let app;
    jest.isolateModules(() => { app = require('../src/app'); });

    const res = await request(app).get('/api/ventas/export').query({ format: 'excel', desde: '2024-01-01' });
    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(true);
    expect(queueExportTask).toHaveBeenCalledWith('ventas', 'excel', expect.objectContaining({ desde: '2024-01-01' }));
  });

  // NUEVAS PRUEBAS DE FLUJO EXPORT
  test('POST /api/export/run utiliza ExportRunner.startRun', async () => {
    const fakeResult = { runId: 'run-1', availableMetrics: [], preview: [], counts: { total: 0 }, logsSummary: [] };
    const ExportRunner = { startRun: jest.fn().mockResolvedValue(fakeResult) };
    jest.doMock('../src/services/ExportRunner', () => ExportRunner);
    let app;
    jest.isolateModules(() => { app = require('../src/app'); });
    const res = await request(app)
      .post('/api/export/run')
      .send({ sourceType: 'universal', config: { foo: 'bar' } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeResult);
    expect(ExportRunner.startRun).toHaveBeenCalledWith('universal', { foo: 'bar' });
  });

  test('POST /api/export/run/:runId/metrics utiliza ExportRunner.confirmMetrics', async () => {
    const fakeConfirm = { ok: true, runId: 'run-1', countsByMetric: {}, datasetActivated: true };
    const ExportRunner = { confirmMetrics: jest.fn().mockResolvedValue(fakeConfirm) };
    jest.doMock('../src/services/ExportRunner', () => ExportRunner);
    let app;
    jest.isolateModules(() => { app = require('../src/app'); });
    const res = await request(app)
      .post('/api/export/run/run-1/metrics')
      .send({ selectedMetrics: ['clients'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeConfirm);
    expect(ExportRunner.confirmMetrics).toHaveBeenCalledWith('run-1', ['clients']);
  });
});