import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../styles/Auth.css'

function Login() {
  const [email, setEmail] = useState('')
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
    setLocalError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      // el contexto ya puso authError, aquí sólo guardamos fallback
      setLocalError(err.message || 'Error al iniciar sesión')
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
          <div className="auth-card-inner">
            <h2>Bienvenido de vuelta</h2>
            <p className="auth-subtitle">Ingresa tus credenciales para acceder</p>
          </div>

          { (authError || localError) && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span>{authError || localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
