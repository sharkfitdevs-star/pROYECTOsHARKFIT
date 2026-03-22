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

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { setAccessToken as setApiToken, clearAccessToken as clearApiToken, setAuthHooks } from "../api/axios";
import { getAccessToken, setAccessToken, clearAccessToken, TOKEN_KEY } from "../config/authStorage";
import { getImportsConnection, setImportsConnection } from "../services/settingsApi";
import { createToast } from "@/components/ui/use-toast";

// safeFetchJson removed; use getImportsConnection from services/settingsApi

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importsConnected, setImportsConnected] = useState(null);
  const [importsConnectionError, setImportsConnectionError] = useState(null);
  const [isTogglingImports, setIsTogglingImports] = useState(false);
  const [importsReloadKey, setImportsReloadKey] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false); // prevent duplicate fetch
  const [importsToggleForbidden, setImportsToggleForbidden] = useState(() =>
    sessionStorage.getItem('importsToggleForbidden') === '1'
  ); // if server returns 403, stop trying (session-persistent)

  // restaura sesión desde localStorage al montar
  // listen for expiration events dispatched by fetchAuth
  useEffect(() => {
    const handleExpired = () => {
      console.log('auth expired event, logging out');
      try { localStorage.setItem('authMessage', 'Tu sesión expiró. Por favor inicia sesión nuevamente.'); } catch {}
      // Limpiar estado directamente sin depender del closure de logout
      clearApiToken();
      clearAccessToken();
      localStorage.removeItem('authUser');
      // Redirigir al login
      window.location.href = '/login';
    };
    window.addEventListener('auth:expired', handleExpired);

    const storedToken = getAccessToken();
    const storedUser = localStorage.getItem('authUser');
    if (storedToken) {
      setToken(storedToken);
      setApiToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);

    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  // fetch importsConnected flag once on mount and set up polling & cross-tab sync
  useEffect(() => {
    // if there's no auth token we are on login/unauthed page; disable polling
    const storedToken = getAccessToken();
    if (!storedToken) {
      setImportsConnected(false);
      setSettingsLoaded(true);
      setLoading(false);
      return;
    }
    // garantiza que axios tenga el token antes del primer fetch de settings
    setApiToken(storedToken);

    const importsConnectedRef = { current: importsConnected };
    const togglingRef = { current: isTogglingImports };

    // keep refs up to date
    const updRefs = () => {
      importsConnectedRef.current = importsConnected;
      togglingRef.current = isTogglingImports;
    };

    let pollId;
    let lastTickLog = 0;

    const load = async () => {
      updRefs();

      // initial fetch (only set settingsLoaded on a successful response)
      if (!settingsLoaded) {
        try {
          const val = await getImportsConnection();
          if (typeof val === 'boolean') {
            setImportsConnected(val);
            setImportsConnectionError(null);
            setSettingsLoaded(true); // mark only after we know it succeeded
          } else {
            throw new Error('unexpected value from getImportsConnection');
          }
        } catch (e) {
          setImportsConnected(null);
          setImportsConnectionError(e.message || String(e));
          if (e.status === 401 || (e.response && e.response.status === 401)) {
            createToast({
              title: 'Sesión expirada',
              description: 'Por favor, vuelva a iniciar sesión.',
              variant: 'destructive'
            });
            logout();
            return;
          }
          createToast({
            title: 'Advertencia',
            description: 'Error leyendo configuración de imports; usando valor por defecto.',
            variant: 'warning'
          });
          if (sessionStorage.getItem('settingsErrorLogged') !== '1') {
            sessionStorage.setItem('settingsErrorLogged', '1');
            console.warn('settings initial load error, using default true', e.message || e);
          }
        }
      }

      // log tick at most once every 30s or when forbidden toggles
      const now = Date.now();
      if (now - lastTickLog > 30000) {
        console.log('[AuthContext] settings poll tick', { forbidden: importsToggleForbidden });
        lastTickLog = now;
      }

      // polling logic should run every time, regardless of settingsLoaded
      if (importsToggleForbidden) return;
      if (togglingRef.current) return;

      try {
        const val = await getImportsConnection();
        if (typeof val === 'boolean') {
          if (val !== importsConnectedRef.current) {
            _syncImportsConnected(val);
            createToast({
              title: 'Info',
              description: 'Estado de datos importados actualizado.',
              variant: 'info'
            });
          }
        }
      } catch (e) {
        if (e.status === 401 || (e.response && e.response.status === 401)) {
          logout();
          return;
        }
        // network/500: keep previous value but record error
        setImportsConnectionError(e.message || String(e));
        if (sessionStorage.getItem('settingsErrorLogged') !== '1') {
          sessionStorage.setItem('settingsErrorLogged', '1');
          console.warn('settings connection error, using default true', e.message || e);
        }
      }
    };

    const onStorage = async (ev) => {
      if (ev.key !== 'importsConnectedUpdatedAt') return;
      if (togglingRef.current) return;
      try {
        const val = await getImportsConnection();
        if (typeof val === 'boolean') {
          if (val !== importsConnectedRef.current) {
            _syncImportsConnected(val);
            createToast({
              title: 'Info',
              description: 'Estado de datos importados actualizado.',
              variant: 'info'
            });
          }
        }
      } catch (e) {
        console.debug('storage listener fetch failed', e.message);
        if (e.status === 403 && pollId) clearInterval(pollId);
      }
    };

    load();
    pollId = setInterval(load, 60000);
    window.addEventListener('storage', onStorage);
    return () => {
      if (pollId) clearInterval(pollId);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = async ({ identifier, password }) => {
    setError(null);

    // prepare payload outside of try/catch so it is always in scope
    const trimmed = (identifier || '').trim();
    const payload = {
      ...(trimmed.includes('@') ? { email: trimmed } : { username: trimmed }),
      password,
    };

    try {
      // the backend contract is { identifier, password }
      // axios already has baseURL `/api`; request path should be relative
      // otherwise we risk `/api/api/auth/login` in some environments.
      const res = await api.post('/auth/login', payload);
      // backend replies with `{ success:true, accessToken, user }`
      const newToken = res.data.accessToken || res.data.token;
      const loggedUser = res.data.user;
      if (process.env.NODE_ENV !== 'production') {
        console.log('Saved token key: authToken len:', newToken ? newToken.length : 0);
      }

      setToken(newToken);
      setUser(loggedUser);
      setApiToken(newToken);
      setAccessToken(newToken);
      localStorage.setItem('authUser', JSON.stringify(loggedUser));
      // clear any previous expiration message
      try { localStorage.removeItem('authMessage'); } catch {}
      if (process.env.NODE_ENV !== 'production') {
        console.debug('Saved token key:', TOKEN_KEY, 'len:', newToken?.length, 'head:', newToken?.slice(0,12));
      }
      return loggedUser;
      } catch (error) {
        const status = error?.response?.status;
        // guard-log for server errors
        if (status >= 500) {
          const cfg = error.config || {};
          const resolved = (cfg.baseURL || '') + (cfg.url || '');
          const safeKeys = Object.keys(payload).filter(k => k !== 'password');
          console.error('[LOGIN SERVER ERROR]', { status, resolvedUrl: resolved, payloadKeys: safeKeys });
        }
        const data = error?.response?.data || {};
        const errorCode = data.error || 'ERROR';
        const errorMessage2 = data.message || '';
        const errorMessage = status 
          ? `${status}_${errorCode}${errorMessage2 ? '|' + errorMessage2 : ''}`
          : errorCode;
        setError(errorMessage);
        throw error;
      }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearApiToken();
    clearAccessToken();
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  // refresh explícito para mantener sesión activa desde el modal de inactividad
  const extendSession = useCallback(async () => {
    const res = await api.post('/auth/refresh');
    const refreshedToken = res?.data?.accessToken || null;

    if (!refreshedToken) {
      throw new Error('No se recibió accessToken al refrescar sesión');
    }

    setToken(refreshedToken);
    setApiToken(refreshedToken);
    setAccessToken(refreshedToken);
    window.dispatchEvent(new Event('session:extended'));
    return refreshedToken;
  }, []);

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
    extendSession,
    // import control
    importsConnected,
    importsConnectionError,
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
