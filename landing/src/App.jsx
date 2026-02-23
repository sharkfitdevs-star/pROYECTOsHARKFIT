import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Contexto de autenticación
import { AuthProvider } from "./context/AuthContext";

// Componentes
import ProtectedRoute from "./components/shared/ProtectedRoute";
import Toaster from "./components/ui/toaster";

// Páginas de autenticación
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Account from "./pages/auth/Account";

// Landing público
import Landing from "./pages/Landing";

// Páginas de dashboard
import Dashboard from "./pages/dashboard/Dashboard";
import DashboardEVO from "./components/DashboardEVO";
import ExportHistory from "./pages/dashboard/ExportHistory";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Toaster />
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/register" element={<Register />} />
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
  );
}

export default App;