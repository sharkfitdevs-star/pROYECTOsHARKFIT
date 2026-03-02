
/**
 * Unit tests for ImportService._importarClientes
 * Validates idempotency and duplicate handling.
 */

// ensure we use fresh modules per test
beforeEach(() => {
  jest.resetModules();
});

describe('_importarClientes logic', () => {
  let ImportService;
  let clienteStore;

  beforeEach(() => {
    // simple in-memory "collection"
    clienteStore = [];

    const Cliente = {
      findOne: jest.fn(async (query) => {
        if (query.idMember) {
          return clienteStore.find(c => c.idMember === query.idMember) || null;
        }
        if (query.email) {
          return clienteStore.find(c => c.email === query.email) || null;
        }
        if (query.$or) {
          return (
            clienteStore.find(c =>
              query.$or.some(cond => {
                const key = Object.keys(cond)[0];
                return c[key] === cond[key];
              })
            ) || null
          );
        }
        return null;
      }),
      create: jest.fn(async (data) => {
        // simulate unique constraint on idMember/email
        if (
          clienteStore.some(c => (data.idMember && c.idMember === data.idMember) || (data.email && c.email === data.email))
        ) {
          const err = new Error('dup');
          err.code = 11000;
          throw err;
        }
        const doc = { ...data, save: async function() { Object.assign(this, this); } };
        clienteStore.push(doc);
        return doc;
      })
    };

    // stub the model before loading service
    jest.doMock('../src/models/Cliente', () => Cliente);
    ImportService = require('../src/services/ImportService');
  });

  it('inserts first row and updates on second identical call', async () => {
    const registro = { idMember: 'A', email: 'a@x', name: 'Name A' };
    const r1 = await ImportService._importarClientes([registro], 'sync');
    expect(r1.insertedCount).toBe(1);
    expect(r1.updatedCount).toBe(0);

    const r2 = await ImportService._importarClientes([registro], 'sync');
    expect(r2.insertedCount).toBe(0);
    expect(r2.updatedCount).toBe(1);
  });

  it('does not create duplicate with same email but different idMember', async () => {
    const reg1 = { idMember: 'B', email: 'b@x', name: 'Bob' };
    await ImportService._importarClientes([reg1], 'sync');
    const reg2 = { idMember: 'C', email: 'b@x', name: 'Bob New' };
    const r = await ImportService._importarClientes([reg2], 'sync');
    expect(r.insertedCount).toBe(0);
    expect(r.updatedCount).toBe(1);
  });

  it('flags invalid rows and does not insert', async () => {
    const r = await ImportService._importarClientes([{}], 'sync');
    expect(r.insertedCount).toBe(0);
    expect(r.invalidCount).toBe(1);
  });
});
