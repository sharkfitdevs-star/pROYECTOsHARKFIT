import api from '../api/axios';

// helpers for the imports-connection setting.  We centralize all calls here
// so that token injection, credentials, and error parsing live in one place.

async function _fetchWithFallback(method, url, data) {
  const isDev = process.env.NODE_ENV === 'development';
  const ts = new Date().toISOString();
  if (isDev) {
    console.log('[FE FETCH]', { url, method, ts });
  }

  try {
    let resp;
    if (method === 'get') {
      resp = await api.get(url);
    } else if (method === 'patch') {
      resp = await api.patch(url, data);
    } else {
      throw new Error('unsupported method ' + method);
    }
    if (isDev) {
      console.log('[FE FETCH OK]', { url, status: resp.status });
    }
    return resp;
  } catch (err) {
    if (isDev) {
      let bodySnippet = null;
      try {
        const text = err.response?.data && typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response?.data);
        bodySnippet = text?.slice(0, 300);
      } catch {}
      console.warn('[FE FETCH FAIL]', { url, status: err.response?.status, bodySnippet });
    }
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
