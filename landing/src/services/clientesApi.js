import { getAccessToken } from '../config/authStorage';

// simple API client for fetching clients list
// follows same pattern used in importApi.js (native fetch, error handling)

/**
 * normalizeClientesResponse: various backend formats -> uniform shape
 * @param {*} raw
 * @returns {{items:Array, total:number, importsConnected:boolean|undefined}}
 */
export function normalizeClientesResponse(raw) {
  let items = [];
  if (raw) {
    if (Array.isArray(raw)) {
      items = raw;
    } else if (Array.isArray(raw.data)) {
      items = raw.data;
    } else if (Array.isArray(raw.clientes)) {
      items = raw.clientes;
    } else if (Array.isArray(raw.items)) {
      items = raw.items;
    }
  }
  const total =
    typeof raw?.total === 'number'
      ? raw.total
      : typeof raw?.meta?.count === 'number'
      ? raw.meta.count
      : items.length;
  const importsConnected = typeof raw?.importsConnected === 'boolean' ? raw.importsConnected : undefined;
  // also return raw.meta so callers can see skip/limit etc.
  return { items, total, importsConnected, meta: raw?.meta };
}


import { fetchAuth } from '../api/fetchAuth';

export async function fetchClientes({ skip = 0, limit } = {}) {
  // build query string when pagination params provided
  let url = "/api/clientes";
  const params = new URLSearchParams();
  if (typeof skip === 'number') params.set('skip', skip);
  if (typeof limit === 'number') params.set('limit', limit);
  if ([...params].length) url += `?${params.toString()}`;

  // instrument token presence
  const token = getAccessToken();
  if (process.env.NODE_ENV !== 'production') {
    console.log('clientesApi token?', !!token, 'len:', token ? token.length : 0, 'head:', token?.slice(0,12));
  }
  if (!token) {
    const err = new Error('Missing access token');
    err.code = 'NO_TOKEN';
    throw err;
  }

  let data;
  try {
    data = await fetchAuth(url, { method: 'GET' });
  } catch (err) {
    // rethrow special errors
    throw err;
  }

  const { items, total, importsConnected } = normalizeClientesResponse(data);
  // when importsConnected undefined assume true and print warning
  if (importsConnected === undefined) {
    console.warn('fetchClientes: missing importsConnected flag, assuming true');
  }

  // include raw meta for caller if present
  return {
    clientes: items,
    total,
    importsConnected: importsConnected !== undefined ? importsConnected : true,
    meta: data?.meta,
  };
}

// settings endpoints are handled in a dedicated helper to avoid
// duplicating auth/header logic across multiple modules.
export { getImportsConnection, setImportsConnection } from './settingsApi';

