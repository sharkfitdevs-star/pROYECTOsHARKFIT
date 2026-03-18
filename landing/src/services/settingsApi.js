import api from '../api/axios';

export async function getImportsConnection() {
  try {
    const resp = await api.get('/settings/imports-connection');
    if (resp.data && typeof resp.data.importsConnected === 'boolean') {
      return resp.data.importsConnected;
    }
    return true;
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      return false;
    }
    return true; // default si hay error de red
  }
}

export async function setImportsConnection(connected) {
  const resp = await api.patch('/settings/imports-connection', { 
    importsConnected: connected 
  });
  if (resp.data && typeof resp.data.importsConnected === 'boolean') {
    return resp.data.importsConnected;
  }
  return connected;
}
