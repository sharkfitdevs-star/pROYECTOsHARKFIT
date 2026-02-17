/*
 * Queue interface + InMemory fallback
 * - getQueue(name): returns Agenda-backed queue when AGENDA_ENABLED=true,
 *   otherwise returns InMemoryQueue.
 * - Exports InMemoryQueue for tests/legacy usage.
 */

const { createQueue: createAgendaQueue } = require('./agendaAdapter');

class InMemoryQueue {
  constructor(name) {
    this.name = name;
    this._events = { failed: [], completed: [] };
    this._handler = null;
    this._nextId = 1;
  }

  on(event, fn) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(fn);
  }

  process(_concurrency, handler) {
    this._handler = handler;
  }

  async add(data, opts = {}) {
    const job = {
      id: `${this.name}-${this._nextId++}-${Date.now()}`,
      data,
      opts,
      attemptsMade: 0
    };

    setImmediate(async () => {
      if (!this._handler) return;
      try {
        await this._handler(job);
        (this._events.completed || []).forEach((h) => h(job));
      } catch (err) {
        job.attemptsMade = (job.attemptsMade || 0) + 1;
        (this._events.failed || []).forEach((h) => h(job, err));
      }
    });

    return job;
  }

  async getJobCounts() {
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }
}

function getQueue(name) {
  // In tests we always use the InMemoryQueue to avoid starting Agenda/Mongo
  if (process.env.NODE_ENV === 'test') {
    return new InMemoryQueue(name);
  }

  if (String(process.env.AGENDA_ENABLED).toLowerCase() === 'true') {
    try {
      return createAgendaQueue(name);
    } catch (err) {
      console.warn('AGENDA init failed, falling back to InMemoryQueue:', err.message);
      return new InMemoryQueue(name);
    }
  }
  return new InMemoryQueue(name);
}

module.exports = { getQueue, InMemoryQueue };