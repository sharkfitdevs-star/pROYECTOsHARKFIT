describe('evo-w12-proxy (enqueue mode)', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  test('syncTenant encola job cuando AGENDA_ENABLED=true', async () => {
    process.env.AGENDA_ENABLED = 'true';

    const queueSyncTask = jest.fn().mockResolvedValue(true);
    jest.doMock('../src/workers/api-worker', () => ({ queueSyncTask }));

    const { syncTenant } = require('../src/evo-w12-proxy-sqlite');

    const integration = {
      tenant_id: 'tenant-test',
      dns: 'acme.local',
      encrypted_token: 'deadbeef',
      encryption_iv: 'iv',
      id: 'int-1'
    };

    await syncTenant(integration);

    expect(queueSyncTask).toHaveBeenCalledWith('EVO', 'full-sync', expect.objectContaining({ integrationId: 'int-1', tenant_id: 'tenant-test' }));
  });
});
