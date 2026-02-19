const request = require('supertest');
// Allow longer timeout for API tests that may involve DB setup
jest.setTimeout(20000);

jest.mock('../src/models', () => ({
  Usuario: { findOne: jest.fn().mockResolvedValue(null) },
  Session: { create: jest.fn().mockResolvedValue({}) },
  EmailToken: { create: jest.fn().mockResolvedValue({}) },
  AccessRequest: { create: jest.fn().mockResolvedValue({ _id: 'req-1', email: 'juan.perez@example.com', firstName: 'Juan' }), find: jest.fn().mockResolvedValue([]) }
}));

// Mock email util so tests don't try to send real emails
jest.mock('../src/utils/email', () => ({
  sendAccessRequestEmail: jest.fn().mockResolvedValue(true)
}));

const app = require('../src/app');

describe('Access Requests API', () => {
  test('POST /api/auth/request-access creates a request', async () => {
    const res = await request(app)
      .post('/api/auth/request-access')
      .send({ firstName: 'Juan', lastName: 'Perez', email: 'juan.perez@example.com' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('success', true);
  });

  test('POST /api/auth/request-access rejects when user exists', async () => {
    const models = require('../src/models');
    models.Usuario.findOne.mockResolvedValueOnce({ _id: 'existing' });

    const res = await request(app)
      .post('/api/auth/request-access')
      .send({ firstName: 'Test', lastName: 'User', email: 'exists@example.com' });

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('error', true);
  });
});
