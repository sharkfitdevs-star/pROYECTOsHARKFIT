/**
 * 🔐 CLIENTE AXIOS MEJORADO - Frontend Seguro
 * 
 * Cambios CRÍTICOS:
 * ✅ Token en memoria (NO localStorage)
 * ✅ Refresh token en httpOnly cookie (automático del navegador)
 * ✅ Interceptores mejorados
 * ✅ Manejo de errores silencioso
 * 
 * Ubicación: /frontend/src/api/axios.IMPROVED.js
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ✅ Cliente principal para requests autenticados
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,  // CRÍTICO: permite enviar/recibir cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ Cliente secundario para refresh (sin interferencia)
const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 🔐 MANEJO DE TOKEN (EN MEMORIA)
// ════════════════════════════════════════════════════════════════════════════

let accessToken = null;
let isRefreshing = false;
let pendingQueue = [];

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
  accessToken = null;
};

// ════════════════════════════════════════════════════════════════════════════
// 🔄 REFRESH TOKEN LOGIC
// ════════════════════════════════════════════════════════════════════════════

const refreshAccessToken = async () => {
  // ✅ Evitar múltiples refresh simultaneos
  if (isRefreshing) {
    return new Promise((resolve) => {
      pendingQueue.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const response = await refreshClient.post('/auth/refresh');
    const newToken = response.data?.accessToken;

    setAccessToken(newToken);

    // ✅ Procesar queue de requests pendientes
    pendingQueue.forEach((callback) => callback(newToken));
    pendingQueue = [];

    return newToken;
  } catch (error) {
    // ✅ Si refresh falla = logout
    clearAccessToken();
    pendingQueue = [];

    // Redirigir a login (guardar location anterior si es posible)
    window.location.href = '/login?from=' + encodeURIComponent(window.location.pathname);

    throw error;
  } finally {
    isRefreshing = false;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 📤 REQUEST INTERCEPTOR
// ════════════════════════════════════════════════════════════════════════════

apiClient.interceptors.request.use(
  (config) => {
    // ✅ Inyectar access token si existe
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ════════════════════════════════════════════════════════════════════════════
// 📥 RESPONSE INTERCEPTOR
// ════════════════════════════════════════════════════════════════════════════

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ✅ Manejar 401 (token expirado)
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh falló, ya redirigido a login
        return Promise.reject(refreshError);
      }
    }

    // ✅ Validación de respuesta (400, 422)
    if (error.response?.status === 400 || error.response?.status === 422) {
      const errorData = error.response.data;
      console.warn('❌ Validación fallida:', errorData?.fields || errorData?.message);
    }

    // ✅ Error de servidor (500, 503)
    if (error.response?.status >= 500) {
      // Notificar pero no revelar detalles al usuario
      console.error('❌ Error del servidor. Intente más tarde.');
    }

    // ✅ Timeout
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Tiempo de espera agotado. Intente nuevamente.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// ════════════════════════════════════════════════════════════════════════════
// 💡 NOTA IMPORTANTE
// ════════════════════════════════════════════════════════════════════════════
//
// 🍪 FLUJO DE COOKIES (AUTOMÁTICO):
//
// 1. Login exitoso → Backend envía refreshToken en Set-Cookie
//    res.cookie('refreshToken', token, { httpOnly: true, ... })
//
// 2. Browser automáticamente guarda en cookies (httpOnly = invisible a JS)
//
// 3. Cada POST/GET a /api → Navegador envía automáticamente la cookie
//    (withCredentials: true permite esto)
//
// 4. Si accessToken expira → Llamamos a /auth/refresh
//    Cookie se envía automáticamente, backend lo verifica
//
// 5. Nunca exponemos refresh token en JS
//
// ════════════════════════════════════════════════════════════════════════════
