const jestMock = require('jest-mock');

// Mock axios.create used by UniversalExtractor._createHttpClient
jest.mock('axios', () => ({
  create: jest.fn()
}));

const axios = require('axios');

describe('api-web extractor (configs/api-web.json)', () => {
  beforeEach(() => {
    jest.resetModules();
    // prevent real DB calls from repositories
    jest.doMock('../src/db/repositories', () => ({
      createSyncLog: jest.fn().mockResolvedValue({ syncId: 'stub-sync' }),
      updateSyncLog: jest.fn().mockResolvedValue(true)
    }));

    process.env.WEB_BASE_URL = 'https://example.com';
    process.env.WEB_API_TOKEN = 'fake-token';
  });

  afterEach(() => {
    jest.dontMock('../src/db/repositories');
    delete process.env.WEB_BASE_URL;
    delete process.env.WEB_API_TOKEN;
  });

  test('extractAndSync processes api-web endpoints using axios mock', async () => {
    // reset modules + re-require axios so mocks are fresh
    jest.resetModules();
    const axios = require('axios');

    // axios.create should return a client with request/get methods
    axios.create.mockReturnValue({
      request: jest.fn().mockImplementation(({ url }) => {
        if (url.includes('/api/sales')) return Promise.resolve({ data: sales });
        if (url.includes('/api/prospects')) return Promise.resolve({ data: prospects });
        if (url.includes('/access-logs')) return Promise.resolve({ data: access_logs });
        if (url.includes('/contacts')) return Promise.resolve({ data: contacts });
        return Promise.resolve({ data: {} });
      }),
      get: jest.fn().mockImplementation((u) => {
        if (u.includes('/api/sales')) return Promise.resolve({ data: sales });
        if (u.includes('/api/prospects')) return Promise.resolve({ data: prospects });
        if (u.includes('/access-logs')) return Promise.resolve({ data: access_logs });
        if (u.includes('/contacts')) return Promise.resolve({ data: contacts });
        return Promise.resolve({ data: {} });
      }),
      post: jest.fn().mockResolvedValue({ data: {} }),
      // minimal defaults shape used by UniversalExtractor._createHttpClient
      defaults: { headers: { common: {} } }
    });

    // require after mocks/resetModules so internal requires use the mocks
    const { extractAndSync } = require('../src/index');
    const sales = { items: [{ id: 's1', amount: 100 }] };
    const prospects = { items: [{ id: 'p1', name: 'Lead Uno' }] };
    const access_logs = { records: [{ id: 'a1', location: 'Main' }] };
    const contacts = { items: [{ id: 'c1', name: 'Contacto' }] };

    const result = await extractAndSync('api-web');
    expect(result).toBeTruthy();
    expect(result.results).toBeDefined();

    // Verify each configured endpoint reported success and record counts
    const salesKey = '/api/sales';
    const prospectsKey = '/api/prospects';
    const accessKey = '/access-logs';

    expect(result.results[salesKey].success).toBe(true);
    expect(result.results[salesKey].records).toBe(1);

    expect(result.results[prospectsKey].success).toBe(true);
    expect(result.results[prospectsKey].records).toBe(1);

    expect(result.results[accessKey].success).toBe(true);
    expect(result.results[accessKey].records).toBe(1);
  });
});
