const request = require('supertest');

describe('Export flow API', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
    jest.clearAllMocks();
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  test('POST /api/export/run triggers ExportRunner.startRun', async () => {
    const fakeResult = { runId: 'run-1', availableMetrics: ['clients'], preview: [], counts: { total: 0 }, logsSummary: [] };
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

  test('POST /api/export/run/:runId/metrics triggers ExportRunner.confirmMetrics', async () => {
    const fakeConfirm = { ok: true, runId: 'run-1', countsByMetric: { clients: 1 }, datasetActivated: true };
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

  test('GET /api/export/runs and /api/export/runs/:id return data', async () => {
    const fakeRuns = [{ runId: 'run-1' }, { runId: 'run-2' }];
    const ExportRun = { find: jest.fn().mockResolvedValue(fakeRuns), findOne: jest.fn().mockResolvedValue(fakeRuns[0]) };
    jest.doMock('../src/models/ExportRun', () => ExportRun);

    let app;
    jest.isolateModules(() => { app = require('../src/app'); });

    const resList = await request(app).get('/api/export/runs');
    expect(resList.status).toBe(200);
    expect(resList.body).toEqual(fakeRuns);

    const resGet = await request(app).get('/api/export/runs/run-1');
    expect(resGet.status).toBe(200);
    expect(resGet.body).toEqual(fakeRuns[0]);
  });
});