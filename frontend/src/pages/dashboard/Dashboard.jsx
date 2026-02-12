import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import '../../styles/Dashboard.css'

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const { user, logout } = useAuth()

  const sections = {
    overview: {
      title: '📊 Dashboard',
      content: () => (
        <div className="overview-grid">
          <div className="card">
            <h3>Ventas Este Mes</h3>
            <p className="large-number">$45,230</p>
            <span className="trend positive">↑ 12% vs mes anterior</span>
          </div>
          <div className="card">
            <h3>Clientes Activos</h3>
            <p className="large-number">328</p>
            <span className="trend positive">↑ 8 nuevos</span>
          </div>
          <div className="card">
            <h3>Tareas Pendientes</h3>
            <p className="large-number">47</p>
            <span className="trend neutral">⏳ Requiere atención</span>
          </div>
          <div className="card">
            <h3>Tasa de Conversión</h3>
            <p className="large-number">24%</p>
            <span className="trend positive">↑ 3% vs mes anterior</span>
          </div>
        </div>
      )
    },
    clients: {
      title: '👥 Clientes',
      content: () => (
        <div className="section-placeholder">
          <p>📋 Gestión de clientes - Próximamente</p>
          <p className="subtitle">Se cargarán los 60+ componentes de clientes aquí</p>
        </div>
      )
    },
    sales: {
      title: '💼 Ventas',
      content: () => (
        <div className="section-placeholder">
          <p>📈 Seguimiento de ventas - Próximamente</p>
          <p className="subtitle">Se cargarán los componentes de ventas aquí</p>
        </div>
      )
    },
    alerts: {
      title: '🚨 Alertas',
      content: () => (
        <div className="section-placeholder">
          <p>⚠️ Sistema de alertas - Próximamente</p>
          <p className="subtitle">Se cargarán los componentes de alertas aquí</p>
        </div>
      )
    }
  }

  const currentSection = sections[activeSection]

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📊 SharkFit Dashboard</h1>
          <p>Bienvenido, {user?.name || 'Usuario'}</p>
        </div>
        <div className="header-actions">
          <button className="btn-icon" title="Notificaciones">
            🔔
            <span className="notification-badge">3</span>
          </button>
          <button className="btn-icon" title="Configuración">⚙️</button>
          <div className="user-menu">
            <button className="btn-user" title="Mi perfil">
              <span className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || '👤'}
              </span>
              <span className="user-name">{user?.name || 'Usuario'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-main">
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              📊 Overview
            </button>
            <button
              className={`nav-item ${activeSection === 'clients' ? 'active' : ''}`}
              onClick={() => setActiveSection('clients')}
            >
              👥 Clientes
            </button>
            <button
              className={`nav-item ${activeSection === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveSection('sales')}
            >
              💼 Ventas
            </button>
            <button
              className={`nav-item ${activeSection === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveSection('alerts')}
            >
              🚨 Alertas
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar-small">
                {user?.name?.charAt(0).toUpperCase() || '👤'}
              </div>
              <div className="user-details">
                <p className="user-name-small">{user?.name || 'Usuario'}</p>
                <p className="user-role">{user?.role || 'Staff'}</p>
              </div>
            </div>
            <p className="version">v2.0.0</p>
            <button className="btn-logout" onClick={logout} title="Cerrar sesión">
              🚪 Salir
            </button>
          </div>
        </aside>

        <main className="dashboard-content">
          <h2>{currentSection.title}</h2>
          <div className="content-body">
            {currentSection.content()}
          </div>
        </main>
      </div>
    </div>
  )
}
