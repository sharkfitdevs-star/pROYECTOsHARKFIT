const EventEmitter = require('events');

class MockRedis extends EventEmitter {
  constructor() { super(); }
  async get() { return null; }
  async set() { return 'OK'; }
  async incr() { return 1; }
  async sadd() { return 1; }
  async scard() { return 0; }
  async srem() { return 0; }
  async publish() { return 0; }
  async subscribe() { return 0; }
  async psubscribe() { return 0; }
  async unsubscribe() { return 0; }
  async lpush() { return 0; }
  async rpop() { return null; }
  async quit() { return; }
  async disconnect() { return; }
  duplicate() { return this; }
}

module.exports = MockRedis;