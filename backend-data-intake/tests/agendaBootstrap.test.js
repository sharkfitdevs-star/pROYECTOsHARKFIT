// PR‑1: pruebas skeleton para Agenda bootstrap
// Nota: estas pruebas son placeholders. No deben inicializar Agenda en CI
// a menos que mongodb esté disponible. Se usarán con `mongodb-memory-server`.

describe('Agenda bootstrap (placeholder)', () => {
  it('exporta getAgenda desde agendaAdapter', () => {
    const { getAgenda } = require('../src/workers/agendaAdapter');
    expect(typeof getAgenda).toBe('function');
  });
});
