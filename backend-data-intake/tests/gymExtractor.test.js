const {
  fetchMemberships,
  fetchPayables,
  fetchSales,
  fetchClients,
  fetchEntries,
  fetchProspects
} = require('../src/services/abcEvo');
const axios = require('axios');

jest.mock('axios');

describe('GymExtractor basic behaviour', () => {
  beforeEach(() => jest.resetAllMocks());

  test('rejects invalid domain', async () => {
    await expect(fetchMemberships({ baseUrl: 'https://evil.com', membershipsPath:'/x' }))
      .rejects.toThrow(/Dominio no permitido/);
  });

  test('builds URL from presets and returns data', async () => {
    axios.request.mockResolvedValue({ status:200, data:[1,2,3] });
    const resp = await fetchMemberships({ baseUrl:'https://api.abcevo.com', membershipsPath:'/get-memberships-123', auth:{type:'bearer',token:'t'} });
    expect(resp.data).toEqual([1,2,3]);
    expect(resp.source).toBe('abc-evo');
    expect(resp.logs.length).toBe(1);
  });

  test('passes params and handles error', async () => {
    axios.request.mockRejectedValue({ response:{status:404,data:'not'}, message:'fail' });
    await expect(fetchPayables({ baseUrl:'https://api.abcevo.com', payablesPath:'/get-payables-xyz', from:'2022' }))
      .rejects.toMatchObject({ statusCode:404 });
  });
});
