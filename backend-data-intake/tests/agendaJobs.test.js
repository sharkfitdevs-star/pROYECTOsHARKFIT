const jestMock = require('jest-mock');

describe('Agenda jobs registration', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  test('registerAgendaJobs registers expected job names and handlers call processors', async () => {
    process.env.AGENDA_ENABLED = 'true';

    // Mock agendaAdapter.getAgenda to return a fake agenda with define()
    const defineMock = jestMock.fn();
    jest.doMock('../src/workers/agendaAdapter', () => ({
      getAgenda: () => ({ define: defineMock })
    }));

    // Mock processors
    const processApiCall = jestMock.fn().mockResolvedValue(true);
    const processWebhook = jestMock.fn().mockResolvedValue(true);
    const processSyncTask = jestMock.fn().mockResolvedValue(true);

    jest.doMock('../src/workers/api-worker', () => ({
      processApiCall,
      processWebhook,
      processSyncTask
    }));

    const { registerAgendaJobs, JOB_NAMES } = require('../src/workers/agendaJobs');
    const registered = registerAgendaJobs();
    expect(registered).toBe(true);

    // Ensure define was called for the three jobs
    expect(defineMock).toHaveBeenCalled();
    const definedNames = defineMock.mock.calls.map(c => c[0]);
    expect(definedNames).toEqual(expect.arrayContaining([JOB_NAMES.API_CALLS, JOB_NAMES.API_EXTRACTS, JOB_NAMES.WEBHOOKS, JOB_NAMES.SYNC_TASKS]));

    // Extract handler for API_CALLS and invoke it to ensure it calls processor
    const apiCallDefine = defineMock.mock.calls.find(c => c[0] === JOB_NAMES.API_CALLS);
    expect(apiCallDefine).toBeTruthy();
    const apiHandler = apiCallDefine[2];

    // simulate Agenda job invocation
    const fakeJob = { attrs: { _id: 'job-1', data: { foo: 'bar' }, opts: {} } };
    await apiHandler(fakeJob, () => {});
    expect(processApiCall).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1', data: { foo: 'bar' } }));

    // Ensure API_EXTRACTS handler was defined
    const apiExtractDefine = defineMock.mock.calls.find(c => c[0] === JOB_NAMES.API_EXTRACTS);
    expect(apiExtractDefine).toBeTruthy();
    const apiExtractHandler = apiExtractDefine[2];
    // invoking should not throw (handler calls extractAllApis internally)
    await expect(apiExtractHandler({ attrs: {} }, () => {})).resolves.not.toThrow();
  });
});
