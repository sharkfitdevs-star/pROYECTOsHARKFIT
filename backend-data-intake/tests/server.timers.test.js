/* Tests to ensure long-running timers are not scheduled during Jest runs */

describe('server timers (test environment)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // restore defaults
    delete process.env.EXTERNAL_API_SYNC_MINUTES;
  });

  test('auto-sync interval is skipped when NODE_ENV=test', async () => {
    const { logger } = require('../src/utils/logger');
    jest.spyOn(logger, 'info').mockImplementation(() => {});

    // Make sure we would normally schedule an interval
    process.env.EXTERNAL_API_SYNC_MINUTES = '15';

    // require the server (startServer runs during require)
    require('../src/server');

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('⏭️ Auto-sync de APIs externas omitido en entorno de test'));

    jest.restoreAllMocks();
  });
});
