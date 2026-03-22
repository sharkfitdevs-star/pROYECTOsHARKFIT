// Conector SQLite externo usando sql.js
const initSqlJs = require('sql.js');
const fs = require('fs');

async function readSqliteTables(filePath, config) {
  const { limit = 100 } = config;
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(filePath);
  const db = new SQL.Database(fileBuffer);
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values.map(r => r[0]) || [];
  const result = {};
  for (const name of tables) {
    const rows = db.exec(`SELECT * FROM "${name}" LIMIT ${limit}`)[0];
    if (rows) {
      const columns = rows.columns;
      result[name] = rows.values.map(row => Object.fromEntries(row.map((v, i) => [columns[i], v])));
    } else {
      result[name] = [];
    }
  }
  db.close();
  return result;
}

module.exports = {
  read: async (filePath, config) => {
    return await readSqliteTables(filePath, config);
  }
};
