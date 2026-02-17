describe('evo-w12-proxy import-safety', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('does not require native better-sqlite3 at module import', () => {
    // If the module tried to require('better-sqlite3') at top-level this mock
    // would throw and the test would fail — we assert the module is import-safe.
    // Mock as a *virtual* module so Jest doesn't try to resolve a real native
    // dependency on the test host. If the proxy ever requires this module at
    // import time the mock will throw and the test will fail.
    jest.mock('better-sqlite3', () => {
      throw new Error('better-sqlite3 should not be required during module import');
    }, { virtual: true });

    expect(() => require('../src/evo-w12-proxy-sqlite')).not.toThrow();
  });
});
