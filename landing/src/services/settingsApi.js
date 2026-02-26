import api from '../api/axios';

// helpers for the imports-connection setting.  We centralize all calls here
// so that token injection, credentials, and error parsing live in one place.

async function _fetchWithFallback(method, url, data) {
  try {
    if (method === 'get') {
      return await api.get(url);
    }
    if (method === 'patch') {
      return await api.patch(url, data);
    }
    throw new Error('unsupported method ' + method);
  } catch (err) {
    // if the route doesn't exist, try the legacy alias
    if (err.response?.status === 404) {
      const legacy = url.replace('imports-connection', 'imports-connected');
      return method === 'get'
        ? api.get(legacy)
        : api.patch(legacy, data);
    }
    throw err;
  }
}

export async function getImportsConnection() {
  const resp = await _fetchWithFallback('get', '/settings/imports-connection');
  const val = resp.data && typeof resp.data.importsConnected === 'boolean'
    ? resp.data.importsConnected
    : true;
  return val;
}

export async function setImportsConnection(connected) {
  const resp = await _fetchWithFallback('patch', '/settings/imports-connection', { importsConnected: connected });
  const val = resp.data && typeof resp.data.importsConnected === 'boolean'
    ? resp.data.importsConnected
    : true;
  return val;
}
