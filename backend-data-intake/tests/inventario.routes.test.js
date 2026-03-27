const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

describe('Inventario API', () => {
  beforeAll(async () => {
    // Aquí podrías conectar a una base de datos de prueba si es necesario
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('GET /api/inventario/productos', () => {
    it('debe responder con 401 si no hay autenticación', async () => {
      const res = await request(app).get('/api/inventario/productos');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/inventario', () => {
    it('debe responder con 401 si no hay autenticación', async () => {
      const res = await request(app).get('/api/inventario');
      expect(res.status).toBe(401);
    });
  });

  // Puedes agregar más tests básicos para POST, PUT, DELETE, etc.
});
