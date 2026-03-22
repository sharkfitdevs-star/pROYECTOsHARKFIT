// cliente HTTP central para la aplicación landing
// en principio sólo se usa desde AuthContext.jsx, pero tenerlo
// separado permite reutilizarlo en el futuro.


import axios from "axios";
import { TOKEN_KEY, getAccessToken as getStoredToken } from '../config/authStorage';

const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL,
  timeout: 360000, // 6min - importaciones EVO pueden tardar hasta 3min en hora pico
  withCredentials: true, // el backend usa cookies para refresh token
  headers: { "Content-Type": "application/json" },
});

// cliente separado para refresh para evitar loops de interceptores
const refreshClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// token en memoria (no localStorage para evitar XSS)
let accessToken = null;
let isRefreshing = false;
let pendingQueue = [];

function flushPendingQueue(newToken) {
  pendingQueue.forEach((resolve) => resolve(newToken));
  pendingQueue = [];
}

async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve) => pendingQueue.push(resolve));
  }

  isRefreshing = true;
  try {
    const response = await refreshClient.post('/auth/refresh');
    const newToken = response.data?.accessToken || null;
    if (!newToken) {
      throw new Error('No access token en respuesta de refresh');
    }

    setAccessToken(newToken);
    // Actualizar también localStorage para consistencia
    try { localStorage.setItem('authToken', newToken); } catch {}
    flushPendingQueue(newToken);
    return newToken;
  } catch (error) {
    clearAccessToken();
    // Limpiar localStorage completamente
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('jwt');
    } catch {}
    flushPendingQueue(null);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:expired'));
    }

    throw error;
  } finally {
    isRefreshing = false;
  }
}

export function setAccessToken(token) {
  accessToken = token || null;
  if (accessToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export function clearAccessToken() {
  accessToken = null;
  delete api.defaults.headers.common["Authorization"];
}

// -----------------------------------------------------------------------------
// allow external modules (AuthContext) to register callbacks without importing
// the axios instance itself, avoiding circular dependency problems.
let _markImportsForbidden = null;
export function setAuthHooks({ markImportsForbidden }) {
  _markImportsForbidden = markImportsForbidden;
}

// request interceptor: attach token from memory or storage, log in dev
api.interceptors.request.use(
  (config) => {
    const tokenToUse = accessToken
      || getStoredToken()
      || localStorage.getItem(TOKEN_KEY);
    if (tokenToUse) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${tokenToUse}`;
      if (!accessToken && tokenToUse) accessToken = tokenToUse;
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug('[AXIOS REQ]', config.method, config.url, 'headers', {
        authorization: config.headers?.Authorization
      });
    }
    // guard: block any attempt to hit the imports connection endpoint if we
    // already know it's forbidden for this session.
    const url = config.url || '';
    if (url.includes('/api/settings/imports-connection') &&
        sessionStorage.getItem('importsToggleForbidden') === '1') {
      const err = new Error('imports-connection forbidden (guard)');
      err.code = 'IMPORTS_FORBIDDEN_GUARD';
      return Promise.reject(err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// response interceptor: catch 403 from the same endpoint and mark forbidden.
api.interceptors.response.use(
  (resp) => resp,
  async (err) => {
    const cfg = err.config || {};
    const url = cfg.url || '';
    const status = err.response?.status;

    // refresh automático: mantiene sesión activa sin tocar TTL
    if (
      status === 401 &&
      !cfg._retry &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/refresh')
    ) {
      cfg._retry = true;
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          cfg.headers = cfg.headers || {};
          cfg.headers.Authorization = `Bearer ${newToken}`;
          return api(cfg);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    if (url.includes('/api/settings/imports-connection') &&
        status === 403) {
      if (_markImportsForbidden) {
        _markImportsForbidden();
      }
      err.code = 'IMPORTS_FORBIDDEN_403';
    }
    return Promise.reject(err);
  }
);

export default api;
