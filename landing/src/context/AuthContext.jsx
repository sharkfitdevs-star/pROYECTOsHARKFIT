// PROMPT PARA COPILOT:
// Archivo: `landing/src/context/AuthContext.jsx`
// Objetivo: definir un contexto de autenticación sencillo para el dashboard.
//
// Requisitos:
//
// 1. Crear un contexto de React llamado `AuthContext` usando `createContext(null)`.
// 2. Exportar un componente `AuthProvider` que reciba `children`.
//    - Debe manejar estos estados con `useState`:
//        - `user`: objeto usuario o null.
//        - `isAuthenticated`: booleano.
//        - `loading`: booleano para indicar que se está comprobando la sesión.
//    - En un `useEffect`, simular la carga inicial de la sesión:
//        - Por ahora, simplemente marcar `loading` en `false` y dejar `user` en `null` y `isAuthenticated` en `false`.
//        - Más adelante la lógica real se conectará al backend (JWT / refresh token), pero por ahora no hace peticiones.
//    - Implementar una función `login(email, password)`:
//        - Por ahora, simular el login sin llamar a un backend real.
//        - Asignar `user` a un objeto simple `{ email }`.
//        - Poner `isAuthenticated` en `true`.
//    - Implementar una función `logout()`:
//        - Poner `user` en `null`.
//        - Poner `isAuthenticated` en `false`.
//    - El `AuthProvider` debe envolver a `children` con:
//
//        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
//          {children}
//        </AuthContext.Provider>
//
// 3. Exportar un hook `useAuth()`:
//    - Debe usar `useContext(AuthContext)`.
//    - Si el contexto es `null`, lanzar un error claro indicando que `useAuth` debe usarse dentro de `<AuthProvider>`.
//
// 4. Exportaciones:
//    - `export function AuthProvider(...) { ... }`
//    - `export function useAuth() { ... }`
//    - `const AuthContext` debe mantenerse en este archivo, pero no es necesario exportarlo por defecto.
//
// Genera el código completo con React 18 (importando desde 'react'), sin TypeScript, usando funciones y hooks.

import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// base URL para API; si no está definida usa proxy relativo (/api)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearSession = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Verificar sesión al iniciar y en caso de cambio de token en otra pestaña.
  useEffect(() => {
    let aborted = false;

    const init = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        const controller = new AbortController();
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${storedToken}`
            }
          });
          if (aborted) return;
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setIsAuthenticated(true);
          } else {
            // token inválido o expirado
            clearSession();
            setError('Sesión expirada, vuelve a iniciar sesión');
            navigate('/login');
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
          // error de red o CORS
          clearSession();
          setError('Error verificando sesión');
        }
        finally {
          controller.abort();
        }
      }
      setLoading(false);
    };

    init();

    // sincronizar logout/login entre pestañas
    const onStorage = (e) => {
      if (e.key === 'accessToken') {
        if (!e.newValue) {
          // token borrado en otra pestaña
          clearSession();
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      aborted = true;
      window.removeEventListener('storage', onStorage);
    };
  }, [navigate]);

  const login = async (email, password) => {
    setError(null);
    // llamar al backend de autenticación
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // para recibir cookie de refresh
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.message || 'Error al iniciar sesión';
      setError(msg);
      throw new Error(msg);
    }
    const data = await res.json();
    // se espera un objeto "user" y accessToken en la respuesta
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    setUser(data.user || { email });
    setIsAuthenticated(true);
    return data;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      // ignorar errores al cerrar sesión
    }
    clearSession();
    navigate('/login');
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
