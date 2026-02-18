const { getHealthCheckService } = require('../src/services/HealthCheckService');

describe('HealthCheckService.startPeriodicChecks', () => {
  const realEnv = { ...process.env };
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...realEnv };
  });
  afterEach(() => {
    process.env = realEnv;
    jest.restoreAllMocks();

    // Detener timers en la instancia del módulo recargado (si existe)
    try {
      const reloaded = require('../src/services/HealthCheckService');
      const svc = reloaded && typeof reloaded.getHealthCheckService === 'function'
        ? reloaded.getHealthCheckService()
        : null;
      if (svc && typeof svc.stopPeriodicChecks === 'function') svc.stopPeriodicChecks();
    } catch (err) {
      // noop
    }

    // También intentar detener cualquier singleton referenciado por el require hoisted al tope
    try {
      const svc2 = getHealthCheckService && typeof getHealthCheckService === 'function' ? getHealthCheckService() : null;
      if (svc2 && typeof svc2.stopPeriodicChecks === 'function') svc2.stopPeriodicChecks();
    } catch (err) {
      // noop
    }
  });

  test('is a no-op when NODE_ENV === "test"', () => {
    process.env.NODE_ENV = 'test';
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const svc = getHealthCheckService();
    svc.startPeriodicChecks();

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  test('schedules intervals when not in test env', async () => {
    process.env.NODE_ENV = 'development';
    // avoid real HTTP calls inside checks
    jest.doMock('axios', () => ({ get: jest.fn().mockResolvedValue({ status: 200, data: {} }) }));
    // reload service so axios mock is used
    const { getHealthCheckService: reloadedGet } = require('../src/services/HealthCheckService');

    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const svc = reloadedGet();
    svc.startPeriodicChecks();

    // Expect at least 3 intervals scheduled (EVO, W12, DJANGO, MONGODB)
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(setIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});