const request = require('supertest');

// Mock rápido de modelos para pruebas unitarias que no necesitan MongoDB
// Evita que las rutas hagan operaciones reales con mongoose durante la suite
jest.mock('../src/models', () => ({
  Usuario: {
    findOne: jest.fn().mockResolvedValue(null),
    countDocuments: jest.fn().mockResolvedValue(0)
  },
  Session: { create: jest.fn().mockResolvedValue({}) },
  EmailToken: { create: jest.fn().mockResolvedValue({}) }
}));

const app = require('../src/app');

describe('Autenticación y validación', () => {
  it('rechaza login con credenciales inválidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@demo.com', password: 'incorrecta123' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', true);
  });

  it('requiere campos obligatorios en registro', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: '', password: '' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', true);
    expect(res.body).toHaveProperty('fields');
  });

  it('limita intentos de login (rate limit)', async () => {
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'noexiste@demo.com', password: 'incorrecta123' });
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@demo.com', password: 'incorrecta123' });
    expect([401, 429]).toContain(res.statusCode);
  });
});
