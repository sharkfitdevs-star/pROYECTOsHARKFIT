import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../styles/Auth.css'

function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { login, error: authError, loading: authLoading, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // si ya estamos logueados redirige automáticamente
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    localStorage.removeItem('authMessage');
    setLocalError(null)
    setSubmitting(true)
    // Validación básica antes de enviar
    if (!identifier.trim() || !password.trim()) {
      setLocalError('VALIDATION_ERROR');
      setSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres');
      setSubmitting(false);
      return;
    }
    try {
      await login({ identifier, password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Error al iniciar sesión'
      setLocalError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const disabled = authLoading || submitting;

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-background-overlay"></div>
      </div>

      <div className="auth-header-wrapper">
        <div className="auth-header-content">
          <div className="auth-logo">
            <span className="logo-icon">🦈</span>
            <h1>SharkFit</h1>
          </div>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          {localStorage.getItem('authMessage') && (
            <div style={{
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '1rem',
              color: '#fbbf24',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}>
              {localStorage.getItem('authMessage')}
            </div>
          )}
          <div className="auth-card-inner">
            <h2>Bienvenido de vuelta</h2>
            <p className="auth-subtitle">Ingresa tus credenciales para acceder</p>
          </div>

          { (authError || localError) && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span>{
                (() => {
                  const err = authError || localError;
                  if (!err) return '';
                  if (err.includes('RATE_LIMIT') || err.includes('429')) return 'Demasiados intentos. Espera 15 minutos.';
                  if (err.includes('ACCOUNT_LOCKED') || err.includes('423')) return 'Cuenta bloqueada temporalmente. Intenta más tarde.';
                  if (err.includes('INVALID_CREDENTIALS') || err.includes('401')) return 'Email o contraseña incorrectos.';
                  if (err.includes('VALIDATION_ERROR')) return 'Completa todos los campos.';
                  if (err.includes('DB_NOT_READY') || err.includes('503')) return 'Servicio no disponible. Intenta más tarde.';
                  return 'Error al iniciar sesión. Intenta nuevamente.';
                })()
              }</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="identifier">Email o usuario</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={disabled}
              />
            </div>
            <button type="submit" disabled={disabled}>
              {submitting ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
          <p style={{ marginTop: '1rem' }}>
            ¿No tienes cuenta?{' '}
            <span
              className="link"
              onClick={() => navigate('/register')}
              style={{ cursor: 'pointer', color: 'blue' }}
            >
              Regístrate
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
