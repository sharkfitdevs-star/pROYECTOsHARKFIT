const request = require('supertest');

describe('Sync routes (enqueue behavior)', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('POST /api/sync/start (syncNew) enqueues a job via queueSyncTask', async () => {
    const queueSyncTask = jest.fn().mockResolvedValue({ id: 'job-123' });
    jest.doMock('../src/workers/api-worker', () => ({ queueSyncTask }));

    const app = require('../src/app');

    const payload = { sourceId: 'src-1', modo: 'full', entidades: ['clientes'] };
    const res = await request(app).post('/api/sync/start').send(payload).set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.queued).toBe(true);
    expect(res.body.jobId).toBe('job-123');
    expect(queueSyncTask).toHaveBeenCalledWith('EVO', 'manual-sync', expect.objectContaining({ sourceId: 'src-1', modo: 'full', entidades: expect.any(Array) }));
  });


});
