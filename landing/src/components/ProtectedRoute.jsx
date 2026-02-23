import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Componente de alto orden que protege rutas privadas.
// Lee el estado de autenticación desde el contexto y controla
// la navegación según saldo de sesión.
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // Mientras se consulta la sesión mostramos un mensaje de carga.
  if (loading) {
    return <div>Cargando...</div>;
  }

  // Si ya terminó de cargar y no está autenticado, redirige al login.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado, renderiza el contenido protegido.
  return children;
}

export default ProtectedRoute;