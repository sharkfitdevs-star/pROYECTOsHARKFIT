// backend-data-intake/src/utils/sqlParser.js
// Senior Node.js + Express utility for parsing SQL INSERT INTO statements from .sql files

const ISO_DATE_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/;
const SHORT_ID_REGEX = /^[a-zA-Z0-9]{5,12}$/;

function detectType(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (value === 'true' || value === 'false') return 'boolean';
    if (ISO_DATE_REGEX.test(value)) return 'date';
    if (!isNaN(Number(value)) && value.trim() !== '') return 'number';
    if (SHORT_ID_REGEX.test(value)) return 'id';
    return 'string';
  }
  return 'string';
}

function parseValue(raw) {
  if (raw === null) return null;
  if (raw === 'NULL') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (ISO_DATE_REGEX.test(raw)) return new Date(raw);
  if (!isNaN(Number(raw)) && raw.trim() !== '') return Number(raw);
  if (SHORT_ID_REGEX.test(raw)) return raw;
  return raw;
}

function stripComments(sql) {
  // Remove -- comments
  let noLineComments = sql.replace(/--.*$/gm, '');
  // Remove /* ... */ comments
  let noBlockComments = noLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
  return noBlockComments;
}

function splitInsertValues(valuesStr) {
  // Split values by comma, but ignore commas inside single quotes
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < valuesStr.length) {
    const char = valuesStr[i];
    if (char === "'") {
      if (inQuotes && valuesStr[i + 1] === "'") {
        // Escaped quote
        current += "'";
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }
  if (current.trim() !== '') result.push(current.trim());
  return result;
}

function parseSQLInserts(sqlContent) {
  const sql = stripComments(sqlContent);
  const insertRegex = /INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^;]+)\);/gim;
  const tables = {};
  let totalRows = 0;
  let match;
  while ((match = insertRegex.exec(sql)) !== null) {
    const table = match[1];
    const columns = match[2].split(',').map(c => c.trim());
    const valuesRaw = match[3];
    const valuesArr = splitInsertValues(valuesRaw).map(v => {
      if (v === 'NULL') return null;
      if (v.startsWith("'")) {
        // Remove surrounding quotes and unescape ''
        return v.slice(1, -1).replace(/''/g, "'");
      }
      return v;
    });
    if (columns.length !== valuesArr.length) continue; // skip malformed
    if (!tables[table]) {
      tables[table] = {
        name: table,
        columns,
        columnTypes: {},
        rows: [],
        rowCount: 0,
        preview: []
      };
    }
    // Detect types for this row
    const row = {};
    columns.forEach((col, idx) => {
      row[col] = parseValue(valuesArr[idx]);
    });
    tables[table].rows.push(row);
    tables[table].rowCount++;
    totalRows++;
  }
  // Detect column types per table
  Object.values(tables).forEach(tableObj => {
    tableObj.columns.forEach(col => {
      // Find first non-null value for type detection
      const firstVal = tableObj.rows.find(r => r[col] !== null)?.[col];
      tableObj.columnTypes[col] = detectType(firstVal);
    });
    tableObj.preview = tableObj.rows.slice(0, 5);
  });
  return {
    tables: Object.values(tables),
    totalRows,
    totalTables: Object.keys(tables).length
  };
}

module.exports = { parseSQLInserts };