jest.mock('axios', () => ({ create: jest.fn() }));
jest.mock('../src/db/repositories', () => ({
  createSyncLog: jest.fn().mockResolvedValue({ syncId: 'stub-sync' }),
  updateSyncLog: jest.fn().mockResolvedValue(true),
  syncToRepo: jest.fn().mockResolvedValue({ upserted: 1, errors: 0 })
}));

const axios = require('axios');
const { extractAndSync } = require('../src/index');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.WEB_BASE_URL = 'https://example.com';
  process.env.WEB_API_TOKEN = 'fake-token';
});

afterEach(() => {
  delete process.env.WEB_BASE_URL;
  delete process.env.WEB_API_TOKEN;
});

describe('api-web extractor (configs/api-web.json)', () => {
  test('extractAndSync processes api-web endpoints using axios mock', async () => {
    const sales = { items: [{ id: 's1', amount: 100 }] };
    const prospects = { items: [{ id: 'p1', name: 'Lead Uno' }] };
    const access_logs = { records: [{ id: 'a1', location: 'Main' }] };
    const contacts = { items: [{ id: 'c1', name: 'Contacto' }] };

    axios.create.mockReturnValue({
      request: jest.fn().mockImplementation(({ url }) => {
        if (url.includes('/api/sales')) return Promise.resolve({ status: 200, data: sales });
        if (url.includes('/api/prospects')) return Promise.resolve({ status: 200, data: prospects });
        if (url.includes('/access-logs')) return Promise.resolve({ status: 200, data: access_logs });
        if (url.includes('/contacts')) return Promise.resolve({ status: 200, data: contacts });
        return Promise.resolve({ status: 200, data: {} });
      }),
      defaults: { headers: { common: {} } }
    });

    const result = await extractAndSync('api-web');

    expect(result).toBeTruthy();
    expect(result.results).toBeDefined();

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
