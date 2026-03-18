import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// Context
import { AuthProvider } from './context/AuthContext'

// Componentes
import ProtectedRoute from './components/shared/ProtectedRoute'

// Páginas
import Home from './pages/Home'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'
import Account from './pages/auth/Account'
import Dashboard from './pages/dashboard/Dashboard'
import DashboardEVO from './components/DashboardEVO'
import Toaster from './components/ui/toaster'
import ExportHistory from './pages/dashboard/ExportHistory'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Toaster />
          <Routes>
            {/*
              FLUJO DE NAVEGACIÓN MODIFICADO:
              - La ruta raíz ('/') ahora SIEMPRE muestra la pantalla de Login.
              - No importa si existe una sesión activa, el login es el punto de entrada obligatorio.
              - El acceso al dashboard sigue protegido por ProtectedRoute.
              - No se modifica backend ni lógica JWT.
              - Se elimina cualquier redirect automático desde Login.
              - UX: El usuario debe autenticarse explícitamente cada vez que entra por '/'.
            */}
            <Route path="/" element={<Home />} />
            {/*
              La ruta '/login' sigue disponible y funcional.
              Si se accede manualmente, se muestra la pantalla de login.
              El registro también está disponible desde el login.
            */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            {/* Rutas protegidas (requieren autenticación) */}
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/evo" 
              element={
                <ProtectedRoute>
                  <DashboardEVO />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/dashboard/export-history"
              element={
                <ProtectedRoute>
                  <ExportHistory />
                </ProtectedRoute>
              }
            />
            
            {/* Ruta por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App

