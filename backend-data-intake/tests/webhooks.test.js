const request = require('supertest');

describe('POST /api/webhooks (routes)', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  test('POST /api/webhooks/evo encola webhook (uses queueWebhook)', async () => {
    // Mock the queueWebhook producer and a simple Webhook model
    const queueWebhook = jest.fn().mockResolvedValue(true);
    const WebhookMock = {
      create: jest.fn().mockResolvedValue(true),
      findOne: jest.fn().mockResolvedValue(null)
    };

    jest.doMock('../src/workers/api-worker', () => ({ queueWebhook }));
    jest.doMock('../src/models', () => ({ Webhook: WebhookMock }));

    const app = require('../src/app');

    const payload = { evento: 'venta.creada', data: { tenant_id: 't1', amount: 100 } };
    const res = await request(app).post('/api/webhooks/evo').send(payload).set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.webhookId).toBeDefined();
    expect(queueWebhook).toHaveBeenCalled();
    const callArgs = queueWebhook.mock.calls[0];
    expect(callArgs[1]).toBe('EVO');
    expect(callArgs[2]).toBe('venta.creada');
    expect(callArgs[3]).toMatchObject(payload.data);
  });

  test('POST /api/webhooks/w12 encola webhook W12', async () => {
    const queueWebhook = jest.fn().mockResolvedValue(true);
    const WebhookMock = { create: jest.fn().mockResolvedValue(true), findOne: jest.fn().mockResolvedValue(null) };

    jest.doMock('../src/workers/api-worker', () => ({ queueWebhook }));
    jest.doMock('../src/models', () => ({ Webhook: WebhookMock }));

    const app = require('../src/app');

    const payload = { evento: 'member.updated', data: { tenant_id: 't1', member: { id: 12 } } };
    const res = await request(app).post('/api/webhooks/w12').send(payload).set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(queueWebhook).toHaveBeenCalledWith(expect.any(String), 'W12', 'member.updated', expect.any(Object), 5);
  });
});
