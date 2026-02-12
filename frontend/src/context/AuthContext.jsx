/**
 * CONTEXT: Autenticación y Gestión de Sesión
 * Maneja login, logout, registro y estado del usuario autenticado
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setAccessToken, clearAccessToken, refreshAccessToken } from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Verificar sesión al cargar usando refresh token (cookie)
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const newToken = await refreshAccessToken();

      if (!newToken) {
        setLoading(false);
        return;
      }

      // Obtener usuario actual
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
      clearAccessToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    try {
      setError(null);
      setLoading(true);

      const isEmail = identifier.includes('@');
      const payload = isEmail
        ? { email: identifier, password }
        : { username: identifier, password };

      const response = await api.post('/auth/login', payload);

      const { accessToken, user } = response.data;

      if (accessToken && user) {
        setAccessToken(accessToken);
        setUser(user);
        navigate('/dashboard');
      }

      return { success: true, message: response.data?.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al iniciar sesión';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await api.post('/auth/register', userData);

      const { accessToken, user } = response.data;

      setAccessToken(accessToken);

      // Actualizar estado
      setUser(user);

      // Redirigir al dashboard
      navigate('/dashboard');

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al registrarse';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignorar errores en logout
    } finally {
      clearAccessToken();
      setUser(null);
      navigate('/login');
    }
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  
  return context;
};

export default AuthContext;
