const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
// load app factory (do not start server/DB on import)
const { createApp } = require('../src/app.IMPROVED');
let app;

// setup to avoid interfering with other tests
let mongoServer;

beforeAll(async () => {
  // silence noisy startup logs from app.IMPROVED
  jest.spyOn(console, 'log').mockImplementation(() => {});

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  app = createApp();
});

afterAll(async () => {
  // restore console.log if we mocked it
  if (console.log.mockRestore) console.log.mockRestore();

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  await mongoServer.stop();
});

afterEach(async () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const collections = Object.keys(mongoose.connection.collections);
    for (const coll of collections) {
      try { await mongoose.connection.collections[coll].deleteMany({}); } catch {};
    }
  }
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  await mongoServer.stop();
});



describe('Settings routes', () => {
  // helper to create a user in the in-memory DB and issue a JWT
  // The JWT payload deliberately omits any `role` field; requireAuth
  // must look up the role from the database, not from the token.
  async function issueUser(role = 'viewer') {
    const { Usuario } = require('../src/models');
    const user = await Usuario.create({
      username: `u${Date.now()}`,
      email: `u${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role,
    });
    // sign using the same secret the middleware reads
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    // payload uses `userId` claim because requireAuth checks it first
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '1h' });
    return { user, token };
  }

  test('GET returns default true if no setting exists', async () => {
    const res = await request(app).get('/api/settings/imports-connection');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.importsConnected).toBe(true);
  });

  test('clientes GET respects flag and includes flag in empty result', async () => {
    const resp = await request(app).get('/api/clientes');
    expect(resp.status).toBe(200);
    expect(resp.body.ok).toBe(true);
    expect(resp.body.importsConnected).toBe(true);
    expect(Array.isArray(resp.body.data)).toBe(true);
    expect(resp.body.total).toBe(0);
    // alias for backwards compatibility
    expect(Array.isArray(resp.body.clientes)).toBe(true);
    expect(resp.body.clientes).toEqual(resp.body.data);
  });

  test('PATCH rejects invalid body', async () => {
    const res = await request(app)
      .patch('/api/settings/imports-connection')
      .send({ importsConnected: 'notbool' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('PATCH without token returns 401', async () => {
    const res = await request(app)
      .patch('/api/settings/imports-connection')
      .send({ importsConnected: true });
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  test('PATCH with malformed token returns 401', async () => {
    const res = await request(app)
      .patch('/api/settings/imports-connection')
      .set('Authorization', 'Bearer abc.def.ghi')
      .send({ importsConnected: true });
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  test('PATCH with valid non-staff token returns 403', async () => {
    const { token } = await issueUser('viewer');
    const res = await request(app)
      .patch('/api/settings/imports-connection')
      .set('Authorization', `Bearer ${token}`)
      .send({ importsConnected: true });
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('PATCH updates value and GET reflects change (staff token)', async () => {
    const { token } = await issueUser('staff');
    const res1 = await request(app)
      .patch('/api/settings/imports-connection')
      .set('Authorization', `Bearer ${token}`)
      .send({ importsConnected: false });
    expect(res1.status).toBe(200);
    expect(res1.body.ok).toBe(true);
    expect(res1.body.importsConnected).toBe(false);

    const res2 = await request(app).get('/api/settings/imports-connection');
    expect(res2.body.importsConnected).toBe(false);
  });


  test('clientes GET returns importsConnected flag and empties list when disconnected', async () => {
    const Cliente = require('../src/models/Cliente');
    // insert two clients, one with importId one without
    await Cliente.create({ uniqueId:'a1', idMember:'m1', name:'Joe', importId:'imp1' });
    await Cliente.create({ uniqueId:'a2', idMember:'m2', name:'Sam' });

    // ensure connected -> returns both and flag true
    await request(app).patch('/api/settings/imports-connection').send({ importsConnected: true });
    let resp = await request(app).get('/api/clientes');
    expect(resp.body.importsConnected).toBe(true);
    expect(resp.body.data.length).toBe(2);
    expect(resp.body.clientes.length).toBe(2);

    // disconnect
    await request(app).patch('/api/settings/imports-connection').send({ importsConnected: false });
    resp = await request(app).get('/api/clientes');
    expect(resp.body.importsConnected).toBe(false);
    expect(resp.body.data.length).toBe(0);
    expect(resp.body.total).toBe(0);
    expect(resp.body.clientes.length).toBe(0);
  });
});
