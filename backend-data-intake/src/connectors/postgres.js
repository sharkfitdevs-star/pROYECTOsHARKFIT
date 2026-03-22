// Conector PostgreSQL externo
const { Client } = require('pg');

async function readPostgresTables(source, config) {
  const { host, port, database, user, password, limit = 100 } = config;
  const client = new Client({ host, port, database, user, password });
  await client.connect();
  const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  const tables = tablesRes.rows.map(r => r.table_name);
  const result = {};
  for (const name of tables) {
    const rowsRes = await client.query(`SELECT * FROM "${name}" LIMIT $1`, [limit]);
    result[name] = rowsRes.rows;
  }
  await client.end();
  return result;
}

module.exports = {
  read: async (source, config) => {
    return await readPostgresTables(source, config);
  }
};
