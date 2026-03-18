import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ExportarDatos from './ExportarDatos'
import '../../styles/Dashboard.css'
import { fetchDashboardOverview } from '../../services/dashboardApi';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    fetchDashboardOverview()
      .then(data => setOverview(data))
      .catch(err => console.error('Overview error:', err))
      .finally(() => setLoadingOverview(false));
  }, []);

  const fmt$ = (n) => n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—';
  const fmtPct = (n) => n != null ? `${n > 0 ? '+' : ''}${n}%` : null;

  const sections = {
    overview: {
      title: '📊 Dashboard',
      content: () => (
        <>
          <div className="overview-cards">
            <div className="overview-card">
              <span className="overview-card-title">Ventas Este Mes</span>
              {loadingOverview ? (
                <span className="overview-card-value">...</span>
              ) : (
                <>
                  <span className="overview-card-value">
                    {fmt$(overview?.ventasEsteMes?.monto)}
                  </span>
                  {overview?.ventasEsteMes?.variacion != null && (
                    <span className={`overview-card-sub ${parseFloat(overview.ventasEsteMes.variacion) >= 0 ? 'positive' : 'negative'}`}>
                      {fmtPct(overview.ventasEsteMes.variacion)} vs mes anterior
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="overview-card">
              <span className="overview-card-title">Clientes Activos</span>
              {loadingOverview ? (
                <span className="overview-card-value">...</span>
              ) : (
                <>
                  <span className="overview-card-value">
                    {overview?.clientesActivos?.total ?? '—'}
                  </span>
                  {overview?.clientesActivos?.nuevosEsteMes != null && (
                    <span className="overview-card-sub positive">
                      +{overview.clientesActivos.nuevosEsteMes} nuevos
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="overview-card">
              <span className="overview-card-title">Tareas Pendientes</span>
              {loadingOverview ? (
                <span className="overview-card-value">...</span>
              ) : (
                <>
                  <span className="overview-card-value">
                    {overview?.tareasPendientes?.total ?? '—'}
                  </span>
                  {overview?.tareasPendientes?.requiereAtencion && (
                    <span className="overview-card-sub negative">
                      ⚠ Requiere atención
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="overview-card">
              <span className="overview-card-title">Tasa de Conversión</span>
              {loadingOverview ? (
                <span className="overview-card-value">...</span>
              ) : (
                <>
                  <span className="overview-card-value">
                    {overview?.tasaConversion?.porcentaje ?? '—'}%
                  </span>
                  {overview?.tasaConversion?.variacion != null && (
                    <span className={`overview-card-sub ${parseFloat(overview.tasaConversion.variacion) >= 0 ? 'positive' : 'negative'}`}>
                      {fmtPct(overview.tasaConversion.variacion)} pts vs mes anterior
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      ),
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
    },
    exportar: {
      title: '📥 Exportar Datos',
      content: () => <ExportarDatos />
    }
  }

  const currentSection = sections[activeSection]

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📊 SharkFit Dashboard</h1>
          <p>Bienvenido, {user?.firstName || user?.username || 'Usuario'}</p>
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
                {(user?.firstName || user?.username)?.charAt(0).toUpperCase() || '👤'}
              </span>
              <span className="user-name">{user?.firstName || user?.username || 'Usuario'}</span>
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
            <div style={{ height: '1px', background: 'rgba(59,130,246,0.3)', margin: '15px 0' }}></div>
            <button
              className={`nav-item ${activeSection === 'exportar' ? 'active' : ''}`}
              onClick={() => setActiveSection('exportar')}
            >
              📥 Exportar datos
            </button>
            <button
              className="nav-item"
              onClick={() => navigate('/admin')}
            >
              ⚙️ Admin
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar-small">
                {(user?.firstName || user?.username)?.charAt(0).toUpperCase() || '👤'}
              </div>
              <div className="user-details">
                <p className="user-name-small">{user?.firstName || user?.username || 'Usuario'}</p>
                <p className="user-role">{user?.role || 'Staff'}</p>
              </div>
            </div>
            <p className="version">v2.0.0</p>
            <button className="btn-logout" onClick={logout}>
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
