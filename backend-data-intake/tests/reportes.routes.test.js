const request = require('supertest');

describe('Reportes routes (enqueue behavior)', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('POST /api/reportes enqueues a report generation job via queueReportTask', async () => {
    const queueReportTask = jest.fn().mockResolvedValue({ id: 'rep-job-1' });
    const ReporteMock = function (data) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    };
    jest.doMock('../src/workers/api-worker', () => ({ queueReportTask }));
    jest.doMock('../src/models', () => ({ Reporte: ReporteMock }));

    const app = require('../src/app');

    const payload = { reportType: 'ventas', title: 'Reporte Ventas', periodType: 'mensual', startDate: new Date(), endDate: new Date() };
    const res = await request(app).post('/api/reportes').send(payload).set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.idReport).toBeDefined();
    expect(res.body.data.status).toBe('generando');
    expect(queueReportTask).toHaveBeenCalledWith(expect.any(String));
    expect(queueReportTask.mock.calls[0][0]).toMatch(/rep-/);
  });

  test('GET /api/reportes returns list (no change)', async () => {
    const ReporteMock = {
      find: jest.fn().mockReturnValue({ sort: () => ({ limit: () => ({ skip: () => [{ idReport: 'x' }] }) }) }),
      countDocuments: jest.fn().mockResolvedValue(1)
    };

    jest.doMock('../src/models', () => ({ Reporte: ReporteMock }));
    const app = require('../src/app');

    const res = await request(app).get('/api/reportes');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ idReport: 'x' }]);
  });
});