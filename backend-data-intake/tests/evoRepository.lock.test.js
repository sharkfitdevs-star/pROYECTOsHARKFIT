describe('evoRepository DB lock (unit)', () => {
  let originalConn;
  beforeEach(() => {
    jest.resetModules();
    originalConn = require('mongoose').connection;
  });
  afterEach(() => {
    // restore if needed
    require('mongoose').connection = originalConn;
    jest.restoreAllMocks();
  });

  test('acquireSyncLock / releaseSyncLock call underlying collection methods', async () => {
    const mockCol = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ value: { locked: true } }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true })
    };

    // Shim mongoose.connection.collection to return mockCol
    const mongoose = require('mongoose');
    const origCollection = mongoose.connection.collection;
    jest.spyOn(mongoose.connection, 'collection').mockImplementation((name) => mockCol);

    const evoRepo = require('../src/db/evoRepository');

    const acquired = await evoRepo.acquireSyncLock(1000);
    expect(acquired).toBe(true);
    expect(mockCol.findOneAndUpdate).toHaveBeenCalled();

    const released = await evoRepo.releaseSyncLock();
    expect(released).toBe(true);
    expect(mockCol.updateOne).toHaveBeenCalledWith({ _id: 'sync_lock' }, expect.any(Object));

    // restore
    mongoose.connection.collection = origCollection;
  });
});