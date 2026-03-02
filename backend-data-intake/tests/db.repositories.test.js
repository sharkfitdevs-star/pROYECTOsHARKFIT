
let mongoose = require('mongoose');

// repository module is loaded inside each test after mocks are in place

describe('createSyncLog helper', () => {
  let createSyncLog;
  let loggerMock;

  beforeEach(() => {
    jest.resetModules();
    // re-require mongoose after clearing modules so tests and repositories share the same instance
    mongoose = require('mongoose');
    mongoose.connection.readyState = 1; // pretend DB is open

    loggerMock = { warn: jest.fn(), debug: jest.fn() };
    // provide a dummy logger before requiring repositories
    jest.doMock('../src/utils/logger', () => ({ logger: loggerMock }));
    // stub out mongoose-backed models so they don't try to compile against a real connection
    jest.doMock('../src/models/Cliente', () => ({}));
    jest.doMock('../src/models/Venta', () => ({}));
    jest.doMock('../src/models/Lead', () => ({}));
  });

  it('generates a new id each time when none is supplied (no caching)', async () => {
    const fakeDocId = { toString: () => '507f1f77bcf86cd799439011' };
    const SyncLog = {
      findOneAndUpdate: jest.fn().mockImplementation((query) => {
        return Promise.resolve({ _id: fakeDocId, sync_id: query.sync_id });
      })
    };
    jest.doMock('../src/models/MongoModels', () => ({
      SyncLog,
      queries: {
        checkWebhookIdempotency: jest.fn(),
        markWebhookProcessed: jest.fn()
      }
    }));

    mongoose.connection.readyState = 1;
    createSyncLog = require('../src/db/repositories').createSyncLog;

    const r1 = await createSyncLog({ entidad: 'test' });
    const r2 = await createSyncLog({ entidad: 'test' });

    expect(r1.syncId).toBeDefined();
    expect(r2.syncId).toBeDefined();
    expect(r1.syncId).not.toBe(r2.syncId);
    // each call should log that we generated an id, but never a reuse message
    expect(loggerMock.debug).toHaveBeenCalledWith(expect.stringContaining('generated syncId for createSyncLog'), expect.objectContaining({ syncId: r1.syncId }));
    expect(loggerMock.debug).toHaveBeenCalledWith(expect.stringContaining('generated syncId for createSyncLog'), expect.objectContaining({ syncId: r2.syncId }));
  });

  it('should swallow write errors, log a warning and return ok:false', async () => {
    const SyncLog = { findOneAndUpdate: jest.fn().mockRejectedValue(new Error('boom')) };
    jest.doMock('../src/models/MongoModels', () => ({
      SyncLog,
      queries: {
        checkWebhookIdempotency: jest.fn(),
        markWebhookProcessed: jest.fn()
      }
    }));

    mongoose.connection.readyState = 1;
    createSyncLog = require('../src/db/repositories').createSyncLog;
    const result = await createSyncLog({ syncId: 'my-id' });
    expect(result.ok).toBe(false);
    expect(result.syncId).toBe('my-id');
    expect(loggerMock.warn).toHaveBeenCalledWith('syncLog failed but import continues', expect.objectContaining({ syncId: 'my-id', err: expect.any(String) }));
  });

  it('should handle duplicate-key error by looking up existing document', async () => {
    const dupErr = new Error('dup');
    dupErr.code = 11000;
    const SyncLog = {
      findOneAndUpdate: jest.fn().mockRejectedValue(dupErr),
      findOne: jest.fn().mockImplementation(() => {
        const payload = { _id: { toString: () => '507f1f77bcf86cd799439011' }, sync_id: 'dup-id' };
        const p = Promise.resolve(payload);
        // add lean method to promise itself
        p.lean = () => p;
        return p;
      })
    };
    jest.doMock('../src/models/MongoModels', () => ({
      SyncLog,
      queries: {
        checkWebhookIdempotency: jest.fn(),
        markWebhookProcessed: jest.fn()
      }
    }));

    mongoose.connection.readyState = 1;
    createSyncLog = require('../src/db/repositories').createSyncLog;
    const res = await createSyncLog({ syncId: 'dup-id' });
    expect(res.syncId).toBe('dup-id');
  });
});
