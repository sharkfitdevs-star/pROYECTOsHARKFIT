/*
 * Minimal Agenda adapter (factory) — initial lightweight implementation.
 * Real job persistence/behaviour will be completed in PR‑1/PR‑2.
 */
const Agenda = require('agenda');

let _agendaInstance = null;
function getAgenda() {
  if (_agendaInstance) return _agendaInstance;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sharkfit';
  const collection = process.env.AGENDA_COLLECTION || 'agendaJobs';
  _agendaInstance = new Agenda({ db: { address: mongoUri, collection } });
  // Start when ready (non-blocking)
  _agendaInstance.on('ready', () => _agendaInstance.start());
  return _agendaInstance;
}

function createQueue(name) {
  const ag = getAgenda();

  return {
    process(concurrency, handler) {
      // define a job named by queue name; handler receives job-like object
      ag.define(name, { concurrency }, async (job, done) => {
        try {
          // map Agenda job to expected handler signature
          await handler({ id: job.attrs._id, data: job.attrs.data, opts: job.attrs });
          done();
        } catch (err) {
          done(err);
        }
      });
    },

    async add(data, opts = {}) {
      const job = ag.create(name, data);
      if (opts.priority) job.priority(opts.priority);
      if (opts.delay) job.schedule(new Date(Date.now() + opts.delay));
      await job.save();
      return { id: job.attrs._id.toString(), data: job.attrs.data, opts };
    },

    on(event, fn) {
      // Agenda emits 'success:jobName' and 'fail:jobName'
      if (event === 'completed') ag.on(`success:${name}`, ({ attrs }) => fn({ id: attrs._id, data: attrs.data }));
      if (event === 'failed') ag.on(`fail:${name}`, (err, job) => fn({ id: job?.attrs?._id, data: job?.attrs?.data }, err));
    },

    async getJobCounts() {
      try {
        const coll = ag._collection;
        if (!coll) return { waiting: 0, active: 0, completed: 0, failed: 0 };
        const waiting = await coll.countDocuments({ name, nextRunAt: { $ne: null } });
        return { waiting, active: 0, completed: 0, failed: 0 };
      } catch (e) {
        return { waiting: 0, active: 0, completed: 0, failed: 0 };
      }
    }
  };
}

module.exports = { createQueue, getAgenda };