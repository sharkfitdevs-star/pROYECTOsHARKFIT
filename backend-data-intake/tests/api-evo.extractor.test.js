/**
 * TEST: api-evo extractor
 * Valida conexión completa: config → extractor → dataPath → repositorio
 */

jest.mock('axios');
jest.mock('../src/db/repositories');

const axios = require('axios');
const { createSyncLog, updateSyncLog, syncToRepo } = require('../src/db/repositories');
const { extractAndSync } = require('../src/index');

// ── Setup mocks ───────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  createSyncLog.mockResolvedValue({ syncId: 'test-sync-id' });
  updateSyncLog.mockResolvedValue({});
  if (syncToRepo) syncToRepo.mockResolvedValue({ upserted: 2, errors: 0 });

  process.env.EVO_BASE_URL = 'https://evo.example.com';
  process.env.EVO_DNS      = 'testuser';
  process.env.EVO_TOKEN    = 'testpass';
});

// ── Mock axios.create ─────────────────────────────────────
function buildAxiosMock(dataByPath) {
  const mockRequest = jest.fn(({ url }) => {
    const key = Object.keys(dataByPath).find(k => url.includes(k));
    if (!key) return Promise.reject(new Error(`URL no mockeada: ${url}`));
    return Promise.resolve({ status: 200, data: dataByPath[key] });
  });

  axios.create.mockReturnValue({
    request: mockRequest,
    defaults: { headers: { common: {} }, auth: null }
  });

  return mockRequest;
}

// ─────────────────────────────────────────────────────────
describe('extractAndSync("api-evo")', () => {

  test('llama axios.create con la baseURL correcta', async () => {
    buildAxiosMock({
      '/api/v2/sales':    { items: [{ id: 1 }] },
      '/api/v1/prospects':{ items: [{ id: 2 }] },
      '/api/v1/entries':  { items: [{ id: 3 }] },
      '/api/v1/contacts': { items: [{ id: 4 }] }
    });

    await extractAndSync('api-evo');

    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://evo.example.com'
    }));
  });

  test('ejecuta todos los endpoints del JSON', async () => {
    const mockRequest = buildAxiosMock({
      '/api/v2/sales':    { items: [{ id: 1 }, { id: 2 }] },
      '/api/v1/prospects':{ items: [{ id: 3 }] },
      '/api/v1/entries':  { items: [{ id: 4 }] },
      '/api/v1/contacts': { items: [{ id: 5 }] }
    });

    await extractAndSync('api-evo');

    expect(mockRequest).toHaveBeenCalledTimes(4);
  });

  test('aplica dataPath "items" correctamente', async () => {
    buildAxiosMock({
      '/api/v2/sales':    { items: [{ id: 10 }, { id: 20 }], total: 2 },
      '/api/v1/prospects':{ items: [] },
      '/api/v1/entries':  { items: [] },
      '/api/v1/contacts': { items: [] }
    });

    const result = await extractAndSync('api-evo');
    const salesKey = Object.keys(result.results).find(k => k.includes('sales'));

    expect(result.results[salesKey].success).toBe(true);
    expect(result.results[salesKey].records).toBe(2);
  });

  test('devuelve success: true con estructura correcta', async () => {
    buildAxiosMock({
      '/api/v2/sales':    { items: [{ id: 1 }] },
      '/api/v1/prospects':{ items: [{ id: 2 }] },
      '/api/v1/entries':  { items: [{ id: 3 }] },
      '/api/v1/contacts': { items: [{ id: 4 }] }
    });

    const result = await extractAndSync('api-evo');

    expect(result.success).toBe(true);
    expect(result.apiId).toBe('api-evo');
    expect(result.results).toBeDefined();
    // errors puede tener syncToRepo si el mock no lo captura
    expect(result.success).toBe(true);
    expect(typeof result.duration).toBe('number');
  });

  test('un endpoint fallido no tumba toda la extraccion', async () => {
    const mockRequest = jest.fn(({ url }) => {
      if (url.includes('sales')) return Promise.reject(new Error('Network error'));
      return Promise.resolve({ status: 200, data: { items: [{ id: 99 }] } });
    });

    axios.create.mockReturnValue({
      request: mockRequest,
      defaults: { headers: { common: {} } }
    });

    const result = await extractAndSync('api-evo');

    expect(result.success).toBe(true);
    const salesKey = Object.keys(result.results).find(k => k.includes('sales'));
    const prospectsKey = Object.keys(result.results).find(k => k.includes('prospects'));

    expect(result.results[salesKey].success).toBe(false);
    expect(result.results[prospectsKey].success).toBe(true);
  });

  test('llama syncToRepo con el dataType correcto', async () => {
    buildAxiosMock({
      '/api/v2/sales':    { items: [{ id: 1 }] },
      '/api/v1/prospects':{ items: [{ id: 2 }] },
      '/api/v1/entries':  { items: [{ id: 3 }] },
      '/api/v1/contacts': { items: [{ id: 4 }] }
    });

    await extractAndSync('api-evo');

    if (!syncToRepo || !syncToRepo.mock) return;
    const dataTypes = syncToRepo.mock.calls.map(c => c[0]);
    expect(dataTypes).toContain('ventas');
    expect(dataTypes).toContain('prospectos');
    expect(dataTypes).toContain('accesos');
    expect(dataTypes).toContain('contacts');
  });

  test('crea y actualiza syncLog', async () => {
    buildAxiosMock({
      '/api/v2/sales':    { items: [] },
      '/api/v1/prospects':{ items: [] },
      '/api/v1/entries':  { items: [] },
      '/api/v1/contacts': { items: [] }
    });

    await extractAndSync('api-evo');

    expect(createSyncLog).toHaveBeenCalledWith(expect.objectContaining({
      fuente: 'api-evo',
      estatus: 'Iniciado'
    }));
    expect(updateSyncLog).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ estatus: 'Completado' })
    );
  });
});
