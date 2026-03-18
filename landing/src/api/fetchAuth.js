import { getAccessToken, clearAccessToken } from '../config/authStorage';

export async function fetchAuth(url, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  const token = getAccessToken();

  if (process.env.NODE_ENV !== 'production') {
    console.log('fetchAuth sending Authorization?', !!token, 'head:', token?.slice(0,12));
  }

  if (!token) {
    const err = new Error('No access token');
    err.code = 'NO_TOKEN';
    throw err;
  }

  headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearAccessToken();
    window.dispatchEvent(new CustomEvent('auth:expired'));
    const err = new Error('Token expired or invalid');
    err.code = 'AUTH_EXPIRED';
    throw err;
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP error ${res.status}`);
    err.code = 'HTTP_ERROR';
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}
