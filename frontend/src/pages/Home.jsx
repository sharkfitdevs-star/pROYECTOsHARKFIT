import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/Home.css'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="hero-title">
          <h1>Shark app</h1>
          <div className="hero-icon" aria-hidden="true">🦈</div>
        </div>
        <p>Sistema de Gestión Integral para Gimnasios</p>

        <div className="action-buttons">
          <button onClick={handleGetStarted} className="btn btn-primary">
            {isAuthenticated ? 'Ir al Dashboard' : 'Iniciar Sesión'}
          </button>
          <Link to="/login?mode=register" className="btn btn-secondary">
            {isAuthenticated ? 'Cambiar cuenta' : 'Registrarse'}
          </Link>
        </div>

        {isAuthenticated && (
          <div className="quick-info">
            <h3>Módulos disponibles</h3>
            <ul>
              <li>📊 Dashboard de Ventas</li>
              <li>👥 Gestión de Clientes</li>
              <li>💼 Seguimiento de Ventas</li>
              <li>📅 Agendamientos</li>
              <li>🚨 Sistema de Alertas</li>
              <li>📈 Reportes</li>
              <li>🔄 Sincronización con EVO5</li>
              <li>🔐 Autenticación JWT</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
