import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ExportarDatos from './ExportarDatos'
import { createToast } from '@/components/ui/use-toast'
import ImportarExcelSection from './ImportarExcelSection'
import ClientesSection from './ClientesSection'
import './Dashboard.css'

function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // simulate initial load delay
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(t)
  }, [])

  // component to render toggle switch in sidebar
  function ImportToggle() {
    const {
      importsConnected,
      isTogglingImports,
      setImportsConnectedRemote,
    } = useAuth();

    const handleClick = async () => {
      const target = !importsConnected;
      const msg = target
        ? '¿Conectar importaciones globalmente?'
        : '¿Desconectar importaciones globalmente? Los datos importados se ocultarán.';
      if (!window.confirm(msg)) return;
      try {
        const val = await setImportsConnectedRemote(target);
        createToast({ title: 'Éxito', description: `Importaciones ${val ? 'conectadas' : 'desconectadas'}` });
      } catch (e) {
        // error toast already handled in context
      }
    };

    return (
      <button
        className="nav-item"
        onClick={handleClick}
        disabled={isTogglingImports}
        style={{ color: importsConnected ? 'black' : '#c53030' }}
        title="Datos importados"
      >
        📁 Datos importados: {importsConnected ? 'ON' : 'OFF'}
      </button>
    );
  }

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
      content: () => <ClientesSection />,
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
    importar: {
      title: '📂 Importar Excel',
      content: () => <ImportarExcelSection />
    },
    exportar: {
      title: '📥 Exportar Datos',
      content: () => <ExportarDatos />
    }
  }

  const currentSection = sections[activeSection]

  if (loading) {
    return (
      <div className="dashboard-loading" style={{padding: '2rem', textAlign: 'center'}}>
        <p>Cargando dashboard...</p>
      </div>
    )
  }

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
          <button className="btn-icon" title="Cerrar sesión" onClick={() => { logout(); navigate('/login'); }}>
            🚪
          </button>
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

            <button
              className={`nav-item ${activeSection === 'importar' ? 'active' : ''}`}
              onClick={() => setActiveSection('importar')}
            >
              📂 Importar Excel
            </button>

            {/* Línea separadora */}
            <div style={{ height: '1px', background: '#93509e', margin: '15px 0', opacity: 0.5 }}></div>

            {/* Sección de administración */}
            <button
              className={`nav-item ${activeSection === 'exportar' ? 'active' : ''}`}
              onClick={() => setActiveSection('exportar')}
              title="Exportar datos en múltiples formatos e integración con APIs"
            >
              📥 Exportar datos
            </button>

            {/* global toggle for imports connection */}
            <ImportToggle />
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

export default Dashboard;
