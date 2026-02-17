/*
 * Agenda job definitions (PR-1)
 * - Registers persistent job definitions that delegate to existing processors.
 * - Activated only when AGENDA_ENABLED=true (feature flag).
 */

const JOB_NAMES = {
  API_CALLS: 'api-calls',
  API_EXTRACTS: 'api-extracts',
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

  // Job: API Extracts (runs extractAllApis to pull data from configured external APIs / web)
  agenda.define(JOB_NAMES.API_EXTRACTS, { concurrency: 1 }, async (job, done) => {
    try {
      const { extractAllApis } = require('../index');
      await extractAllApis();
      done();
    } catch (err) {
      done(err);
    }
  });

  // Auto-schedule API extract job if configured interval is present
  try {
    const minutes = Number(process.env.EXTERNAL_API_SYNC_MINUTES || 0);
    if (minutes > 0) {
      agenda.every(`${minutes} minutes`, JOB_NAMES.API_EXTRACTS);
    }
  } catch (e) {
    // noop - scheduling is best-effort
  }

  return true;
}

module.exports = { registerAgendaJobs, JOB_NAMES };