// ensure jwt secret available for test helpers
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret';
process.env.JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;

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
  let authToken;
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

  test('GET returns default false if no setting exists', async () => {
    const res = await request(app).get('/api/settings/imports-connection');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // default setting is false unless a document exists
    expect(res.body.importsConnected).toBe(false);
  });

  test('GET /api/clientes without token returns 401', async () => {
    const r = await request(app).get('/api/clientes');
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('MISSING_TOKEN');
    expect(r.headers['x-service']).toBe('backend-data-intake');
  });

  test('clientes GET respects flag and includes flag in empty result', async () => {
    const { token } = await issueUser('staff');
    const resp = await request(app).get('/api/clientes').set('Authorization', `Bearer ${token}`);
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
    const { token } = await issueUser('staff');
    const res = await request(app)
      .patch('/api/settings/imports-connection')
      .set('Authorization', `Bearer ${token}`)
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
    expect(res.body.error).toBe('MISSING_TOKEN');
    expect(res.headers['x-service']).toBe('backend-data-intake');
  });

  test('PATCH with JWT payload staff bypasses local DB user', async () => {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const fakeId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ userId: fakeId, role: 'staff', username: 'ext-staff' }, secret, { expiresIn: '1h' });
    const res = await request(app)
      .patch('/api/settings/imports-connection')
      .set('Authorization', `Bearer ${token}`)
      .send({ importsConnected: true });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('PATCH with JWT payload non-staff returns 403 even if DB user missing', async () => {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const fakeId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ userId: fakeId, role: 'user', username: 'ext-user' }, secret, { expiresIn: '1h' });
    const res = await request(app)
      .patch('/api/settings/imports-connection')
      .set('Authorization', `Bearer ${token}`)
      .send({ importsConnected: false });
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  // ---------- CLIENTES pagination & behavior ----------
  // clients endpoint should be protected by auth and DB checks
  test('clientes GET default page/limit metadata', async () => {
    const { token } = await issueUser('staff');
    // create 5 clients
    const Cliente = require('../src/models/Cliente');
    for (let i = 0; i < 5; i++) {
      await Cliente.create({ uniqueId: `u${i}`, idMember: `m${i}`, name: `C${i}` });
    }
    const resp = await request(app).get('/api/clientes').set('Authorization', `Bearer ${token}`);
    expect(resp.status).toBe(200);
    expect(resp.body.ok).toBe(true);
    // default page 1 and default limit 10
    expect(resp.body.meta.limit).toBe(10);
    expect(resp.body.meta.skip).toBe(0);
    expect(resp.body.meta.count).toBe(5);
    expect(resp.body.data.length).toBe(5);
  });

  test('clientes GET returns 503 when DB not ready', async () => {
    const { token } = await issueUser('staff');
    // temporarily pretend connection is down without closing it
    const orig = mongoose.connection.readyState;
    mongoose.connection.readyState = 0;
    const resp = await request(app).get('/api/clientes').set('Authorization', `Bearer ${token}`);
    expect(resp.status).toBe(503);
    expect(resp.body.error).toBe('DB_UNAVAILABLE');
    mongoose.connection.readyState = orig;
  });

  test('clientes GET respects page and limit parameters', async () => {
    const Cliente = require('../src/models/Cliente');
    const { token } = await issueUser('staff');
    // add 10 docs
    for (let i = 0; i < 10; i++) {
      await Cliente.create({ uniqueId: `k${i}`, idMember: `m${i}`, name: `K${i}` });
    }
    // page=2, limit=2 should skip 2 results
    let r = await request(app).get('/api/clientes?page=2&limit=2').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(2);
    expect(r.body.meta.skip).toBe(2);
    expect(r.body.meta.limit).toBe(2);

    // large limit should still be honored (not capped in this API)
    r = await request(app).get('/api/clientes?limit=5000').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.meta.limit).toBe(5000);
  });

  // NOTE: DB not ready scenario is no longer reachable once auth is enforced,
  // because requireAuth must query the user collection.  We skip this test to
  // avoid introducing flaky behaviour.
  test.skip('GET /api/clientes returns 503 when DB not ready', async () => {
    // skip during CI
  });

  test('PATCH with malformed token returns 401', async () => {
    const res = await request(app)
      .patch('/api/settings/imports-connection')
      .set('Authorization', 'Bearer abc.def.ghi')
      .send({ importsConnected: true });
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  test('GET with expired token returns TOKEN_EXPIRED', async () => {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const token = jwt.sign({ userId: new mongoose.Types.ObjectId() }, secret, { expiresIn: '-1s' });
    const resp = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);
    expect(resp.status).toBe(401);
    expect(resp.body.error).toBe('TOKEN_EXPIRED');
    expect(resp.headers['x-service']).toBe('backend-data-intake');
  });

  test('PATCH with valid non-staff token returns 403', async () => {
    const { token } = await issueUser('viewer');
    const res = await request(app)
      .patch('/api/settings/imports-connection')
      .set('Authorization', `Bearer ${token}`)
      .send({ importsConnected: true });
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('FORBIDDEN');
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
    const { token } = await issueUser('staff');
    await request(app).patch('/api/settings/imports-connection').set('Authorization', `Bearer ${token}`).send({ importsConnected: true });
    let resp = await request(app).get('/api/clientes').set('Authorization', `Bearer ${token}`);
    expect(resp.body.importsConnected).toBe(true);
    expect(resp.body.data.length).toBe(2);
    expect(resp.body.clientes.length).toBe(2);

    // disconnect
    await request(app).patch('/api/settings/imports-connection').set('Authorization', `Bearer ${token}`).send({ importsConnected: false });
    resp = await request(app).get('/api/clientes').set('Authorization', `Bearer ${token}`);
    expect(resp.body.importsConnected).toBe(false);
    expect(resp.body.data.length).toBe(0);
    expect(resp.body.total).toBe(0);
    expect(resp.body.clientes.length).toBe(0);
  });

  // CORS compliance check for preflight requests
  test('PATCH preflight (OPTIONS) returns 200 and correct headers', async () => {
    const { token } = await issueUser('staff');
    const resp = await request(app)
      .options('/api/settings/imports-connection')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'Authorization,Content-Type');
    expect(resp.status).toBe(200);
    // server should allow CORS for our origin
    expect(resp.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(resp.headers['access-control-allow-methods']).toMatch(/PATCH/);
    expect(resp.headers['access-control-allow-headers']).toMatch(/Authorization/);
  });
});
