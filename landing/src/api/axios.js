// cliente HTTP central para la aplicación landing
// en principio sólo se usa desde AuthContext.jsx, pero tenerlo
// separado permite reutilizarlo en el futuro.

import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true, // el backend usa cookies para refresh token
  headers: { "Content-Type": "application/json" },
});

// token en memoria (no localStorage para evitar XSS)
let accessToken = null;

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

// request guard: block any attempt to hit the imports connection endpoint if we
// already know it's forbidden for this session.
api.interceptors.request.use((config) => {
  const url = config.url || '';
  if (url.includes('/api/settings/imports-connection') &&
      sessionStorage.getItem('importsToggleForbidden') === '1') {
    const err = new Error('imports-connection forbidden (guard)');
    err.code = 'IMPORTS_FORBIDDEN_GUARD';
    return Promise.reject(err);
  }
  return config;
});

// response interceptor: catch 403 from the same endpoint and mark forbidden.
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const cfg = err.config || {};
    const url = cfg.url || '';
    if (url.includes('/api/settings/imports-connection') &&
        err.response?.status === 403) {
      if (_markImportsForbidden) {
        _markImportsForbidden();
      }
      err.code = 'IMPORTS_FORBIDDEN_403';
    }
    return Promise.reject(err);
  }
);

export default api;
