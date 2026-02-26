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
import api, { setAccessToken, clearAccessToken, setAuthHooks } from "../api/axios";
import { getImportsConnection, setImportsConnection } from "../services/settingsApi";
import { createToast } from "@/components/ui/use-toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importsConnected, setImportsConnected] = useState(true);
  const [isTogglingImports, setIsTogglingImports] = useState(false);
  const [importsReloadKey, setImportsReloadKey] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false); // prevent duplicate fetch
  const [importsToggleForbidden, setImportsToggleForbidden] = useState(() => 
    sessionStorage.getItem('importsToggleForbidden') === '1'
  ); // if server returns 403, stop trying (session-persistent)

  // restaura sesión desde localStorage al montar
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken) {
      setToken(storedToken);
      setAccessToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // fetch importsConnected flag once on mount and set up polling & cross-tab sync
  useEffect(() => {
    let pollId;
    let lastTickLog = 0;

    const load = async () => {
      if (settingsLoaded) return; // already done
      try {
        const val = await getImportsConnection();
        setImportsConnected(val);
      } catch (e) {
        if (e.status === 401 || (e.response && e.response.status === 401)) {
          // session has expired or token invalid
          createToast({
            title: 'Sesión expirada',
            description: 'Por favor, vuelva a iniciar sesión.',
            variant: 'destructive'
          });
          logout();
          return;
        }
        // other problems: network, 500, etc.
        createToast({
          title: 'Advertencia',
          description: 'No se pudo leer configuración de imports; usando valor por defecto.',
          variant: 'warning'
        });
        // fallback to true; will also be handled by poll below if needed
        setImportsConnected(true);
        if (sessionStorage.getItem('settingsErrorLogged') !== '1') {
          sessionStorage.setItem('settingsErrorLogged', '1');
          console.warn('settings initial load error, using default true', e.message || e);
        }
      } // end catch

      // log tick at most once every 30s or when forbidden toggles
      const now = Date.now();
      if (now - lastTickLog > 30000) {
        console.log('[AuthContext] settings poll tick', { forbidden: importsToggleForbidden });
        lastTickLog = now;
      }

      if (importsToggleForbidden) return;
      if (isTogglingImports) return;

      try {
        const val = await getImportsConnection();
        if (typeof val === 'boolean' && val !== importsConnected) {
          _syncImportsConnected(val);
          createToast({
            title: 'Info',
            description: 'Estado de datos importados actualizado.',
            variant: 'info'
          });
        }
      } catch (e) {
        // auth failure -> logout
        if (e.status === 401 || (e.response && e.response.status === 401)) {
          logout();
          return;
        }
        // handle 403 specially
        if (e.status === 403 || (typeof e.message === 'string' && e.message.includes('403'))) {
          markImportsForbidden();
          if (pollId) clearInterval(pollId);
          return;
        }
        // other errors: network/500
        setImportsConnected(true);
        if (sessionStorage.getItem('settingsErrorLogged') !== '1') {
          sessionStorage.setItem('settingsErrorLogged', '1');
          console.warn('settings connection error, using default true', e.message || e);
        }
        // swallow error
      }
    };

    const onStorage = async (ev) => {
      if (ev.key !== 'importsConnectedUpdatedAt') return;
      // other tab changed, refetch flag
      if (isTogglingImports) return;
      try {
        const val = await getImportsConnection();
        if (typeof val === 'boolean' && val !== importsConnected) {
          _syncImportsConnected(val);
          createToast({
            title: 'Info',
            description: 'Estado de datos importados actualizado.',
            variant: 'info'
          });
        }
      } catch (e) {
        console.debug('storage listener fetch failed', e.message);
        if (e.status === 403 || (typeof e.message === 'string' && e.message.includes('403'))) {
          if (pollId) clearInterval(pollId);
        }
      }
    };

    load();
    pollId = setInterval(poll, 25000);
    window.addEventListener('storage', onStorage);
    return () => {
      if (pollId) clearInterval(pollId);
      window.removeEventListener('storage', onStorage);
    };
  }, [importsConnected, isTogglingImports]);

  const login = async ({ identifier, password }) => {
    setError(null);
    try {
      // The backend expects either { email, password } or { username, password }.
      // Our form collects a single "identifier" string (email OR username).
      // Translate it here and drop the helper field so Joi validation does not
      // reject the request with 400 "Campos desconocidos".
      const payload = { password };
      const trimmed = (identifier || '').trim();
      if (trimmed.includes('@')) {
        payload.email = trimmed.toLowerCase();
      } else {
        payload.username = trimmed;
      }

      const res = await api.post('/auth/login', payload);
      // backend replies with `{ success:true, accessToken, user }`
      const newToken = res.data.accessToken || res.data.token;
      const loggedUser = res.data.user;

      setToken(newToken);
      setUser(loggedUser);
      setAccessToken(newToken);
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('authUser', JSON.stringify(loggedUser));
      return loggedUser;
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Error al iniciar sesión';
      setError(msg);
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearAccessToken();
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  const isAuthenticated = !!token;

  // helper used internally to sync state without talking to backend
  const _syncImportsConnected = (val) => {
    if (typeof val !== 'boolean') return;
    if (val !== importsConnected) {
      setImportsConnected(val);
      setImportsReloadKey((k) => k + 1);
    }
  };

  /**
   * Update the importsConnected flag on the server and locally.
   * Optimistic update is applied; if the request fails the previous
   * value is restored and an error toast is shown.
   */
  const setImportsConnectedRemote = async (next) => {
    if (isTogglingImports) {
      // already in flight, ignore
      return importsConnected;
    }
    setIsTogglingImports(true);
    const previous = importsConnected;
    // optimistic
    setImportsConnected(next);
    try {
      const val = await setImportsConnection(next);
      // backend may return a different canonical value
      _syncImportsConnected(val);
      // notify pages that depend on this value
      window.dispatchEvent(new Event('clientes-refresh'));
      // broadcast to other tabs
      try {
        localStorage.setItem('importsConnectedUpdatedAt', Date.now().toString());
      } catch {}
      return val;
    } catch (e) {
      // revert and notify
      setImportsConnected(previous);

      // session/token expired? kick user out
      if (e.status === 401 || (e.response && e.response.status === 401)) {
        logout();
        throw e; // let caller handle if desired
      }

      if (e.status === 403 || (typeof e.message === 'string' && e.message.includes('403'))) {
        markImportsForbidden();
        createToast({
          title: 'No autorizado',
          description: 'No tienes permiso para cambiar el estado de importaciones.',
          variant: 'warning'
        });
        // swallow error so caller doesn't rethrow
        return previous;
      }

      createToast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de importaciones.'
      });
      throw e;
    } finally {
      setIsTogglingImports(false);
    }
  };

  // helpers for persistent forbidden flag
  const markImportsForbidden = () => {
    setImportsToggleForbidden(true);
    try { sessionStorage.setItem('importsToggleForbidden','1'); } catch {}
  };
  const clearImportsForbidden = () => {
    setImportsToggleForbidden(false);
    try { sessionStorage.removeItem('importsToggleForbidden'); } catch {}
  };

  // register hooks so axios interceptor can call our helper without circular deps
  useEffect(() => {
    setAuthHooks({ markImportsForbidden });
  }, [markImportsForbidden]);

  // convenience toggle that uses the remote setter
  const toggleImportsConnected = () => setImportsConnectedRemote(!importsConnected);

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    // import control
    importsConnected,
    isTogglingImports,
    importsReloadKey,
    importsToggleForbidden,
    markImportsForbidden,
    clearImportsForbidden,
    setImportsConnectedRemote,
    toggleImportsConnected,
    syncImportsConnected: _syncImportsConnected
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
