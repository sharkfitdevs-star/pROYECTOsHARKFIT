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
  const total = typeof raw?.total === 'number' ? raw.total : items.length;
  const importsConnected = typeof raw?.importsConnected === 'boolean' ? raw.importsConnected : undefined;
  return { items, total, importsConnected };
}


export async function fetchClientes() {
  let res;
  try {
    res = await fetch("/api/clientes");
  } catch (err) {
    throw new Error('Error de red al obtener clientes');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Respuesta inválida del servidor');
  }

  if (!res.ok || data?.ok === false) {
    const msg = data?.error || `Error al obtener clientes (HTTP ${res.status})`;
    const err = new Error(msg);
    if (data?.details) err.details = err.details;
    throw err;
  }

  const { items, total, importsConnected } = normalizeClientesResponse(data);
  // when importsConnected undefined assume true and print warning
  if (importsConnected === undefined) {
    console.warn('fetchClientes: missing importsConnected flag, assuming true');
  }

  return { clientes: items, total, importsConnected: importsConnected !== undefined ? importsConnected : true };
}

// settings endpoints are handled in a dedicated helper to avoid
// duplicating auth/header logic across multiple modules.
export { getImportsConnection, setImportsConnection } from './settingsApi';

