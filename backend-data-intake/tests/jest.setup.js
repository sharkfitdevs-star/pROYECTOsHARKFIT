// Jest global setup for backend-data-intake tests
// - Disable Mongoose auto-indexing to reduce duplicate-index noise in tests
// - Provide a lightweight global mock for `ioredis` so external services can't spam CI logs

const mongoose = require('mongoose');

// Performance + avoid duplicate-index warnings during tests
mongoose.set('autoIndex', false);

// `ioredis` is mocked via a physical manual mock at `tests/__mocks__/ioredis.js`
// (mapped in package.json jest.moduleNameMapper). This avoids runtime resolution
// errors when the module is not installed in this package.

// Global safe no-op mocks for all queue producers to prevent real async workers
// from starting during unit tests. Individual tests can still override with
// `jest.doMock()` if they need to inspect calls.
try {
  jest.mock('../src/workers/api-worker', () => ({
    queueImportTask: jest.fn().mockResolvedValue({ id: 'mock-import' }),
    queueExportTask: jest.fn().mockResolvedValue({ id: 'mock-export' }),
    queueReportTask: jest.fn().mockResolvedValue({ id: 'mock-report' }),
    queueWebhook: jest.fn().mockResolvedValue(true),
    queueSyncTask: jest.fn().mockResolvedValue({ id: 'mock-sync' }),
    // export stubs for other utilities if referenced
    getWorkerStats: jest.fn().mockResolvedValue({ api: {}, webhooks: {}, sync: {} })
  }));
} catch (err) {
  // jest.mock may throw when executed outside Jest; ignore in that case
}
