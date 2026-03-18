/**
 * CONTEXT: Autenticación y Gestión de Sesión
 * ✅ SEGURIDAD:
 * - Access token en memoria (15 min) + httpOnly cookie refresh token
 * - Sin localStorage para tokens (previene XSS)
 * - Auto-refresh mediante interceptor de axios
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UsuariosService from '../api/services/usuariosService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      setLoading(true);
      try {
        const userData = await UsuariosService.getCurrentUser();
        if (!cancelled) setUser(userData.user || userData);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchUser();
    return () => { cancelled = true; };
  }, []);

  const login = async (identifier, password) => {
    try {
      setError(null);
      setLoading(true);
      const result = await UsuariosService.login(identifier, password);
      if (result.user) {
        setUser(result.user);
      } else if (result) {
        setUser(result);
      }
      navigate('/dashboard');
      return { success: true, message: 'Sesión iniciada correctamente' };
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 'Error al iniciar sesión';
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
      const result = await UsuariosService.register(userData);
      if (result.user) {
        setUser(result.user);
      } else if (result) {
        setUser(result);
      }
      navigate('/dashboard');
      return { success: true, message: 'Cuenta creada correctamente' };
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 'Error al registrarse';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await UsuariosService.logout();
    } catch {
      // ignorar error de logout, limpiar estado igual
    }
  
    setUser(null);
    navigate('/login');
  };

  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export default AuthContext;