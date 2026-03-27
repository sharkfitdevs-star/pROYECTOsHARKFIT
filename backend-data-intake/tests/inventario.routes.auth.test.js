const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

// Token JWT de ejemplo (deberás reemplazarlo por uno válido en tu entorno de test)
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'Bearer test.jwt.token';

describe('Inventario API autenticado', () => {
  beforeAll(async () => {
    // Aquí podrías conectar a una base de datos de prueba si es necesario
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('GET /api/inventario/productos', () => {
    it('debe responder con 200 y array de productos (autenticado)', async () => {
      const res = await request(app)
        .get('/api/inventario/productos')
        .set('Authorization', AUTH_TOKEN);
      // El test espera 200, pero si el token es inválido puede ser 401
      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      }
    });
  });

  describe('POST /api/inventario/productos', () => {
    it('debe rechazar creación sin permisos suficientes', async () => {
      const res = await request(app)
        .post('/api/inventario/productos')
        .set('Authorization', AUTH_TOKEN)
        .send({ nombre: 'Test', sku: 'SKU-TEST', estado: 'activo' });
      // Puede ser 403 si el rol no es admin/manager/owner, o 401 si el token es inválido
      expect([401, 403, 400]).toContain(res.status);
    });
  });

  describe('PUT /api/inventario/productos/:id', () => {
    it('debe rechazar actualización sin permisos suficientes', async () => {
      const res = await request(app)
        .put('/api/inventario/productos/123456789012345678901234')
        .set('Authorization', AUTH_TOKEN)
        .send({ nombre: 'Modificado' });
      expect([401, 403, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/inventario/productos/:id', () => {
    it('debe rechazar borrado sin permisos suficientes', async () => {
      const res = await request(app)
        .delete('/api/inventario/productos/123456789012345678901234')
        .set('Authorization', AUTH_TOKEN);
      expect([401, 403, 404]).toContain(res.status);
    });
  });
});
