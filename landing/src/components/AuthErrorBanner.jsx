import React from 'react';
import { useAuth } from '../context/AuthContext';

// Banner que muestra mensajes de error global del contexto de autenticación.
// Renderiza solamente cuando "error" no es null ni cadena vacía.
export function AuthErrorBanner() {
  const { error } = useAuth();

  if (!error) {
    return null;
  }

  return <div className="auth-error-banner">{error}</div>;
}
