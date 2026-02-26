
const removeDiacritics = (str) =>
  str.normalize('NFD').replace(/\p{Diacritic}/gu, '');

function normalizeHeader(str) {
  if (str === undefined || str === null) return '';
  let s = String(str);
  s = s.trim().toLowerCase();
  s = removeDiacritics(s);
  s = s.replace(/[\s\-]+/g, '_');
  s = s.replace(/[^a-z0-9_]/g, '');
  return s;
}

// synonym dictionary for clientes (normalized values expected)
const SYNONYMS = {
  name: ['nombre','nombres','first name','firstname','givenname'],
  lastName: ['apellido','apellidos','last name','lastname','surname'],
  email: ['email','correo','mail','e-mail','correo electronico'],
  cellphone: ['telefono','teléfono','celular','movil','mobile','phone','fono'],
  idMember: ['id miembro','idmember','member id','socio id','id socio','rut','dni','documento']
};

/**
 * Detect mapping between file headers and schema fields.
 * @param {string[]} headers - raw header strings from file
 * @param {Object} provided - user-provided mapping (raw keys)
 * @param {string} entidad - entity being imported
 * @returns {{mapping:Object, detectedHeaders:string[], warnings:string[]}}
 */
function detectMapping(headers = [], provided = {}, entidad = 'clientes') {
  const normalizedHeaders = headers.map((h) => normalizeHeader(h || ''));
  const warnings = [];

  // build normalized provided map
  const provNorm = {};
  Object.entries(provided || {}).forEach(([k, v]) => {
    provNorm[normalizeHeader(k)] = v;
  });

  const mapping = {};
  headers.forEach((raw, idx) => {
    const nh = normalizedHeaders[idx];
    if (provNorm[nh]) {
      mapping[raw] = provNorm[nh];
    } else if (entidad === 'clientes') {
      // try synonyms
      for (const [field, syns] of Object.entries(SYNONYMS)) {
        if (syns.includes(nh)) {
          mapping[raw] = field;
          break;
        }
      }
    }
    if (!mapping[raw]) {
      warnings.push(`sin mapeo para cabecera '${raw}'`);
    }
  });

  // validations
  if (entidad === 'clientes') {
    const mapped = Object.values(mapping);
    const hasIdentifier = mapped.includes('name') || mapped.includes('email') || mapped.includes('phone');
    if (!hasIdentifier) {
      throw new Error('No se detectaron columnas identificadoras (name/email/phone)');
    }
  }

  return { mapping, detectedHeaders: normalizedHeaders, warnings };
}

/**
 * Suggest mapping from normalized headers using synonyms
 * @param {string[]} headers raw header strings
 * @param {string} entidad
 */
function suggestMapping(headers = [], entidad = 'clientes') {
  const normalized = headers.map((h) => normalizeHeader(h || ''));
  const result = {};
  if (entidad === 'clientes') {
    ['name','lastName','email','cellphone','idMember'].forEach((field) => {
      result[field] = null;
      const syns = SYNONYMS[field] || [];
      normalized.forEach((nh, idx) => {
        if (nh === field || syns.includes(nh)) {
          result[field] = headers[idx];
        }
      });
    });
  }
  return result;
}

// export everything; avoid accidentally overriding
module.exports = {
  normalizeHeader,
  detectMapping,
  suggestMapping
};
