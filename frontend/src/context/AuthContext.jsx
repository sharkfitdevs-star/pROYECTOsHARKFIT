/**
 * CONTEXT: Autenticación y Gestión de Sesión
 * ✅ SEGURIDAD MEJORADA:
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

  // Cargar usuario actual desde el microservicio si hay token
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const userData = await UsuariosService.getCurrentUser();
        setUser(userData.user || userData);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
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
      const resp = error?.response?.data || {};
      const errorMessage = resp.message || 'Error al iniciar sesión';
      const fieldDetails = resp.fields ? Object.values(resp.fields).join('; ') : null;
      const combined = fieldDetails ? `${errorMessage}: ${fieldDetails}` : errorMessage;
      setError(combined);
      return { success: false, error: fieldDetails || errorMessage };
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
      const resp = error?.response?.data || {};
      const rawMessage = resp.message || 'Error al registrarse';
      const fieldDetails = resp.fields ? Object.values(resp.fields).join('; ') : null;

      // Mensaje amistoso y acción sugerida cuando el backend deshabilita el registro público
      let friendly = fieldDetails ? `${rawMessage}: ${fieldDetails}` : rawMessage;
      const normalized = String(rawMessage).toLowerCase();

      if (normalized.includes('registro deshabilitado') || error?.response?.status === 403) {
        friendly = 'Registro público deshabilitado en el servidor. Ejecuta `cd backend-data-intake && npm run create-owner` en el servidor o contacta al administrador.';
      }

      setError(friendly);
      return { success: false, error: fieldDetails || rawMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await UsuariosService.logout();
    } catch (e) {
      // Ignorar error de logout
    }
    setUser(null);
    navigate('/login');
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
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
