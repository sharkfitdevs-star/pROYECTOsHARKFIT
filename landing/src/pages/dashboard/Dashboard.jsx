import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ExportarDatos from './ExportarDatos'
import { createToast } from '@/components/ui/use-toast'
import ImportarExcelSection from './ImportarExcelSection'
import ClientesSection from './ClientesSection'
import VentasSection from './VentasSection'
import AlertasSection from './AlertasSection'
import OverviewCharts from './OverviewCharts'
import VentasOverview from './VentasOverview'
import ClientesOverview from './ClientesOverview'
import ProspectosOverview from './ProspectosOverview'
import './Dashboard.css'
import NotificationsDropdown from './NotificationsDropdown'
import { fetchDashboardOverview } from '../../services/dashboardApi'

function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [loadingOverview, setLoadingOverview] = useState(true)

  useEffect(() => {
    fetchDashboardOverview()
      .then(data => setOverview(data))
      .catch(err => console.error('Overview error:', err))
      .finally(() => setLoadingOverview(false))
  }, [])

  const fmt$ = (n) => n != null ? '$' + Number(n).toLocaleString('es-CL') : '-'
  const fmtPct = (n) => n != null ? (Number(n) > 0 ? '+' : '') + n + '%' : null

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(t)
  }, [])

  function ImportToggle() {
    const { importsConnected, isTogglingImports, setImportsConnectedRemote } = useAuth()
    const handleClick = async () => {
      const target = !importsConnected
      const msg = target ? 'Conectar importaciones?' : 'Desconectar importaciones?'
      if (!window.confirm(msg)) return
      try {
        const val = await setImportsConnectedRemote(target)
        createToast({ title: 'Exito', description: 'Importaciones ' + (val ? 'conectadas' : 'desconectadas') })
      } catch (e) {}
    }
    return (
      <button
        className="nav-item"
        onClick={handleClick}
        disabled={isTogglingImports}
        style={{ color: importsConnected ? 'black' : '#c53030' }}
      >
        Datos importados: {importsConnected ? 'ON' : 'OFF'}
      </button>
    )
  }

  const sections = {
    overview: {
      title: 'Dashboard',
      content: () => (
        <div>
          <div className="overview-cards">
            <div className="overview-card">
              <span className="overview-card-title">Ventas Este Mes</span>
              {loadingOverview
                ? <span className="overview-card-value">...</span>
                : <span className="overview-card-value">{fmt$(overview?.ventasEsteMes?.monto)}</span>
              }
              {!loadingOverview && overview?.ventasEsteMes?.variacion != null && (
                <span className={'overview-card-sub ' + (parseFloat(overview.ventasEsteMes.variacion) >= 0 ? 'positive' : 'negative')}>
                  {fmtPct(overview.ventasEsteMes.variacion)} vs mes anterior
                </span>
              )}
            </div>
            <div className="overview-card">
              <span className="overview-card-title">Clientes Activos</span>
              {loadingOverview
                ? <span className="overview-card-value">...</span>
                : <span className="overview-card-value">{overview?.clientesActivos?.total ?? '-'}</span>
              }
              {!loadingOverview && overview?.clientesActivos?.nuevosEsteMes != null && (
                <span className="overview-card-sub positive">+{overview.clientesActivos.nuevosEsteMes} nuevos</span>
              )}
            </div>
            <div className="overview-card">
              <span className="overview-card-title">Tareas Pendientes</span>
              {loadingOverview
                ? <span className="overview-card-value">...</span>
                : <span className="overview-card-value">{overview?.tareasPendientes?.total ?? '-'}</span>
              }
            </div>
            <div className="overview-card">
              <span className="overview-card-title">Tasa de Conversion</span>
              {loadingOverview
                ? <span className="overview-card-value">...</span>
                : <span className="overview-card-value">{overview?.tasaConversion?.porcentaje ?? '-'}%</span>
              }
              {!loadingOverview && overview?.tasaConversion?.variacion != null && (
                <span className={'overview-card-sub ' + (parseFloat(overview.tasaConversion.variacion) >= 0 ? 'positive' : 'negative')}>
                  {fmtPct(overview.tasaConversion.variacion)} pts vs mes anterior
                </span>
              )}
            </div>
          </div>
          <OverviewCharts ventasMes={overview?.ventasEsteMes} />
          <VentasOverview />
          <ClientesOverview />
          <ProspectosOverview />
        </div>
      )
    },
    clients: { title: 'Clientes', content: () => <ClientesSection /> },
    ventas: { title: 'Ventas', content: () => <VentasSection /> },
    alerts: { title: 'Alertas', content: () => <AlertasSection /> },
    importar: { title: 'Importar Excel', content: () => <ImportarExcelSection /> },
    exportar: { title: 'Exportar Datos', content: () => <ExportarDatos /> }
  }

  const currentSection = sections[activeSection]

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><p>Cargando...</p></div>
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>SharkFit Dashboard</h1>
          <p>Bienvenido, {user?.firstName || user?.username || 'Usuario'}</p>
        </div>
        <div className="header-actions">
          <NotificationsDropdown
            onNavigateToAlertas={(alertaId) => {
              setActiveSection('alerts');
            }}
          />
          <button className="btn-icon" onClick={() => { logout(); navigate('/login') }}>Salir</button>
          <div className="user-menu">
            <button className="btn-user">
              <span className="user-avatar">{(user?.firstName || user?.username)?.charAt(0).toUpperCase() || 'U'}</span>
              <span className="user-name">{user?.firstName || user?.username || 'Usuario'}</span>
            </button>
          </div>
        </div>
      </header>
      <div className="dashboard-main">
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <button className={'nav-item ' + (activeSection === 'overview' ? 'active' : '')} onClick={() => setActiveSection('overview')}>Overview</button>
            <button className={'nav-item ' + (activeSection === 'clients' ? 'active' : '')} onClick={() => setActiveSection('clients')}>Clientes</button>
            <button className={'nav-item ' + (activeSection === 'ventas' ? 'active' : '')} onClick={() => setActiveSection('ventas')}>Ventas</button>
            <button className={'nav-item ' + (activeSection === 'alerts' ? 'active' : '')} onClick={() => setActiveSection('alerts')}>Alertas</button>
            <button className={'nav-item ' + (activeSection === 'importar' ? 'active' : '')} onClick={() => setActiveSection('importar')}>Importar Excel</button>
            <div style={{ height: '1px', background: '#93509e', margin: '15px 0', opacity: 0.5 }}></div>
            <button className={'nav-item ' + (activeSection === 'exportar' ? 'active' : '')} onClick={() => setActiveSection('exportar')}>Exportar datos</button>
            <ImportToggle />
          </nav>
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar-small">{(user?.firstName || user?.username)?.charAt(0).toUpperCase() || 'U'}</div>
              <div className="user-details">
                <p className="user-name-small">{user?.firstName || user?.username || 'Usuario'}</p>
                <p className="user-role">{user?.role || 'Staff'}</p>
              </div>
            </div>
            <p className="version">v2.0.0</p>
            <button className="btn-logout" onClick={logout}>Salir</button>
          </div>
        </aside>
        <main className="dashboard-content">
          <h2>{currentSection.title}</h2>
          <div className="content-body">{currentSection.content()}</div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard

