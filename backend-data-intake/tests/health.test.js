const request = require('supertest');
// Allow slightly longer for health-check under CI contention
jest.setTimeout(10000);

describe('/api/health includes agenda info when enabled', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });
  afterEach(() => { process.env = originalEnv; });

  test('returns agenda.enabled=false when flag off', async () => {
    process.env.AGENDA_ENABLED = 'false';
    const app = require('../src/app');
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('agenda');
    expect(res.body.agenda.enabled).toBe(false);
  });

  test('returns agenda.enabled=true when flag on (mocked agenda)', async () => {
    process.env.AGENDA_ENABLED = 'true';

    // mock agendaAdapter.getAgenda to avoid real Mongo connection
    jest.doMock('../src/workers/agendaAdapter', () => ({
      getAgenda: () => ({ _collection: { collectionName: 'agendaJobs' } })
    }));

    const app = require('../src/app');
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.agenda.enabled).toBe(true);
    expect(['ready', 'initializing', 'error']).toContain(res.body.agenda.status);
  });
});
