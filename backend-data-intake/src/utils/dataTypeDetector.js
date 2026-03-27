// backend-data-intake/src/utils/dataTypeDetector.js
// Utilidad para detectar tipos de datos en columnas (date, boolean, number, id, string)

const ISO_DATE_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/;
const SHORT_ID_REGEX = /^[a-zA-Z0-9]{5,12}$/;

function detectType(value) {
  if (value === null || value === undefined) return 'null';
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

module.exports = { detectType };
