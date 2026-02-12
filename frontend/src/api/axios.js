/**
 * AXIOS CONFIG: Cliente HTTP con interceptores
 * Configuración centralizada para todas las llamadas API
 */

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const refreshClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

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
    setAccessToken(newToken);
    pendingQueue.forEach((resolve) => resolve(newToken));
    pendingQueue = [];
    return newToken;
  } catch (error) {
    clearAccessToken();
    pendingQueue.forEach((resolve) => resolve(null));
    pendingQueue = [];
    throw error;
  } finally {
    isRefreshing = false;
  }
};

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        clearAccessToken();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
