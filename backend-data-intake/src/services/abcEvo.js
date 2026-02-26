// GymExtractor - abstracción para APIs ABC EVO y W12
const axios = require('axios');

// dominios permitidos
const ALLOWED_DOMAINS = [
  'api.abcevo.com',
  'evo-integracao-api.w12app.com.br'
];

function _validateUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch (e) {
    throw new Error(`URL inválida: ${url}`);
  }

  if (!ALLOWED_DOMAINS.includes(u.hostname)) {
    throw new Error(`Dominio no permitido: ${u.hostname}`);
  }
}

function _buildAuthHeaders(auth = {}) {
  const headers = {};
  if (auth.type === 'bearer' && auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  } else if (auth.type === 'apikey' && auth.key && auth.headerName) {
    headers[auth.headerName] = auth.key;
  }
  return headers;
}

async function _performRequest(url, config = {}) {
  _validateUrl(url);
  const logs = [];
  const headers = Object.assign({}, _buildAuthHeaders(config.auth), config.headers);
  try {
    const resp = await axios.request({
      url,
      method: config.method || 'GET',
      headers,
      params: config.params,
      timeout: config.timeout || 10000
    });
    logs.push({ url, statusCode: resp.status, bodyPreview: resp.data, count: Array.isArray(resp.data) ? resp.data.length : 1 });
    return { data: resp.data, logs, source: url.includes('abcevo.com') ? 'abc-evo' : 'w12' };
  } catch (err) {
    logs.push({ url, statusCode: err.response?.status, bodyPreview: err.response?.data, errorMessage: err.message });
    const e = new Error(err.message);
    e.statusCode = err.response?.status;
    e.body = err.response?.data;
    e.logs = logs;
    throw e;
  }
}

/**
 * Construye URL a partir de base y path, aplicando presets si existen
 */
function _buildUrl(config, type) {
  // config puede tener baseUrl o usar preset
  const base = config.baseUrl || '';
  const preset = config.abcEndpoints || {};
  const path = preset[`${type}Path`] || config[`${type}Path`];
  if (!path) throw new Error(`${type}Path no definido`);
  return base ? `${base}${path}` : path;
}

async function fetchMemberships(config = {}) {
  const url = _buildUrl(config, 'memberships');
  const resp = await _performRequest(url, { params: config, auth: config.auth });
  return resp;
}

async function fetchPayables(config = {}) {
  const url = _buildUrl(config, 'payables');
  const resp = await _performRequest(url, { params: config, auth: config.auth });
  return resp;
}

async function fetchSales(config = {}) {
  const url = _buildUrl(config, 'sales');
  const resp = await _performRequest(url, { params: config, auth: config.auth });
  return resp;
}

async function fetchClients(config = {}) {
  const url = _buildUrl(config, 'clients');
  const resp = await _performRequest(url, { params: config, auth: config.auth });
  return resp;
}

async function fetchEntries(config = {}) {
  const url = _buildUrl(config, 'entries');
  const resp = await _performRequest(url, { params: config, auth: config.auth });
  return resp;
}

async function fetchProspects(config = {}) {
  const url = _buildUrl(config, 'prospects');
  const resp = await _performRequest(url, { params: config, auth: config.auth });
  return resp;
}

module.exports = {
  fetchMemberships,
  fetchPayables,
  fetchSales,
  fetchClients,
  fetchEntries,
  fetchProspects
};
