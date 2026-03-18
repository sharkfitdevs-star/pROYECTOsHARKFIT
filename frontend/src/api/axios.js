/**
 * AXIOS CONFIG: Cliente HTTP con interceptores
 * ✅ SEGURIDAD: Access token en memoria, Refresh token en httpOnly cookie
 * - Access token: Corta vida (15 min), se envía en Authorization header
 * - Refresh token: Larga vida (7 días), en httpOnly cookie segura contra XSS
 * - withCredentials: true = servidor recibe cookies automáticamente en cada request
 */

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,  // ✅ CRÍTICO: Envía cookies automáticamente
  headers: {
    'Content-Type': 'application/json'
  }
});

// Cliente separado para refresh (evita interceptor infinito)
const refreshClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ Access token en memoria (NO en localStorage para protección XSS)
let accessToken = null;
let isRefreshing = false;
let pendingQueue = [];

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export const getAccessToken = () => accessToken;

/**
 * ✅ Renovar access token usando refresh token de la cookie httpOnly
 * La cookie se envía automáticamente porque withCredentials=true
 * NO necesitamos extraer el refresh token del localStorage
 */
export const refreshAccessToken = async () => {
  if (isRefreshing) {
    return new Promise((resolve) => {
      pendingQueue.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const response = await refreshClient.post('/auth/refresh');
    const newToken = response.data?.accessToken || null;
    
    if (newToken) {
      setAccessToken(newToken);
      pendingQueue.forEach((resolve) => resolve(newToken));
      pendingQueue = [];
      return newToken;
    } else {
      throw new Error('No access token en refresh response');
    }
  } catch (error) {
    console.error('❌ Refresh token falló:', error.message);
    clearAccessToken();
    pendingQueue.forEach((resolve) => resolve(null));
    pendingQueue = [];
    
    // Redirect a login si refresh falló (cookie expirada)
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw error;
  } finally {
    isRefreshing = false;
  }
};

// ✅ Interceptor REQUEST: Agregar access token al header Authorization
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Interceptor RESPONSE: Manejar 401 y renovar token automáticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es 401 (no autorizado) y no hemos intentado refresh ya
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        // Renovar token usando refresh token de la cookie httpOnly
        const newToken = await refreshAccessToken();

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);  // Reintentar con nuevo token
        }
      } catch (refreshError) {
        clearAccessToken();
        // Redirect a login manejado en refreshAccessToken()
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
