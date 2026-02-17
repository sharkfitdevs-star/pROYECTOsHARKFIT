const clearModule = (p) => { delete require.cache[require.resolve(p)]; };

describe('queueInterface (contract)', () => {
  afterEach(() => {
    delete process.env.AGENDA_ENABLED;
    clearModule('../src/workers/queueInterface');
  });

  test('returns InMemoryQueue by default with expected methods', () => {
    clearModule('../src/workers/queueInterface');
    const { getQueue } = require('../src/workers/queueInterface');
    const q = getQueue('test-default');
    expect(q).toBeDefined();
    expect(typeof q.add).toBe('function');
    expect(typeof q.process).toBe('function');
    expect(typeof q.getJobCounts).toBe('function');
  });

  test('returns an object with same interface when AGENDA_ENABLED=true', () => {
    process.env.AGENDA_ENABLED = 'true';
    clearModule('../src/workers/queueInterface');
    const { getQueue } = require('../src/workers/queueInterface');
    const q = getQueue('test-agenda');
    expect(q).toBeDefined();
    expect(typeof q.add).toBe('function');
    expect(typeof q.process).toBe('function');
    expect(typeof q.getJobCounts).toBe('function');
  });
});