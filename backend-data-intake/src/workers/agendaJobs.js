/*
 * Agenda job definitions (PR-1)
 * - Registers persistent job definitions that delegate to existing processors.
 * - Activated only when AGENDA_ENABLED=true (feature flag).
 */

const JOB_NAMES = {
  API_CALLS: 'api-calls',
  WEBHOOKS: 'webhooks',
  SYNC_TASKS: 'sync-tasks',
  REPORTS: 'reportes',
  EXPORTS: 'exports'
};

function registerAgendaJobs() {
  if (String(process.env.AGENDA_ENABLED).toLowerCase() !== 'true') {
    return false; // no-op when feature flag is off
  }

  const { getAgenda } = require('./agendaAdapter');
  const agenda = getAgenda();

  // Import processors from api-worker (we export them there for reuse)
  const { processApiCall, processWebhook, processSyncTask, processReport, processExport } = require('./api-worker');

  // NOTE: handlers adapt Agenda job -> existing processor signature
  agenda.define(JOB_NAMES.API_CALLS, { concurrency: 5 }, async (job, done) => {
    try {
      await processApiCall({ id: job.attrs._id, data: job.attrs.data, opts: job.attrs });
      done();
    } catch (err) {
      done(err);
    }
  });

  agenda.define(JOB_NAMES.WEBHOOKS, { concurrency: 10 }, async (job, done) => {
    try {
      await processWebhook({ id: job.attrs._id, data: job.attrs.data, opts: job.attrs });
      done();
    } catch (err) {
      done(err);
    }
  });

  agenda.define(JOB_NAMES.SYNC_TASKS, { concurrency: 2 }, async (job, done) => {
    try {
      await processSyncTask({ id: job.attrs._id, data: job.attrs.data, opts: job.attrs });
      done();
    } catch (err) {
      done(err);
    }
  });

  // Reports
  agenda.define(JOB_NAMES.REPORTS, { concurrency: 2 }, async (job, done) => {
    try {
      await processReport({ id: job.attrs._id, data: job.attrs.data, opts: job.attrs });
      done();
    } catch (err) {
      done(err);
    }
  });

  // Exports
  agenda.define(JOB_NAMES.EXPORTS, { concurrency: 2 }, async (job, done) => {
    try {
      await processExport({ id: job.attrs._id, data: job.attrs.data, opts: job.attrs });
      done();
    } catch (err) {
      done(err);
    }
  });

  return true;
}

module.exports = { registerAgendaJobs, JOB_NAMES };