import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ExportarDatos from './ExportarDatos'
import { createToast } from '@/components/ui/use-toast'
import ImportarExcelSection from './ImportarExcelSection'
import Clientes from './Clientes'
import VentasSection from './VentasSection'
import AlertasSection from './AlertasSection'
import OverviewCharts from './OverviewCharts'
import VentasOverview from './VentasOverview'
import ClientesOverview from './ClientesOverview'
import ProspectosOverview from './ProspectosOverview'
import './Dashboard.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import NotificationsDropdown from './NotificationsDropdown'
import ApiImportSection from './ApiImportSection'
import { fetchDashboardOverview } from '../../services/dashboardApi'
import { useOverviewLayout } from '../../hooks/useOverviewLayout'
import WidgetWrapper from '../../components/dashboard/WidgetWrapper'
import ChartBuilder from '../../components/dashboard/ChartBuilder'
import DynamicChart from '../../components/dashboard/DynamicChart'
import HiddenWidgetsPanel from '../../components/dashboard/HiddenWidgetsPanel'
import SessionWarning from '../../components/SessionWarning';

function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const { widgets, visibleWidgets, removeWidget, restoreWidget, reorderWidgets, addWidget, deleteWidget } = useOverviewLayout();
  const [showBuilder, setShowBuilder] = useState(false);
  const hiddenWidgets = widgets.filter(w => !w.visible);


  const loadOverview = useCallback(() => {
    setLoadingOverview(true)
    fetchDashboardOverview()
      .then(data => setOverview(data))
      .catch(err => console.error('Overview error:', err))
      .finally(() => setLoadingOverview(false))
  }, [])

  useEffect(() => { loadOverview() }, [loadOverview])

  useEffect(() => {
    window.addEventListener('clientes-refresh', loadOverview)
    window.addEventListener('ventas-refresh',   loadOverview)
    return () => {
      window.removeEventListener('clientes-refresh', loadOverview)
      window.removeEventListener('ventas-refresh',   loadOverview)
    }
  }, [loadOverview])

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
        className={`nav-item imports-toggle ${importsConnected ? 'on' : 'off'}`}
        onClick={handleClick}
        disabled={isTogglingImports}
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
          <div className="overview-toolbar">
            <HiddenWidgetsPanel hiddenWidgets={widgets.filter(w => !w.visible)} onRestore={restoreWidget} />
            <button onClick={() => setShowBuilder(true)} className="btn-create-chart">
              + Crear nuevo gráfico
            </button>
          </div>
          <div
            className="overview-grid"
            onDragOver={(e) => e.preventDefault()}
          >
            {widgets
              .filter(w => w.visible)
              .sort((a, b) => a.order - b.order)
              .map((widget) => (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('widgetId', widget.id)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('widgetId');
                    if (draggedId === widget.id) return;
                    const ids = widgets
                      .filter(w => w.visible)
                      .sort((a, b) => a.order - b.order)
                      .map(w => w.id);
                    const fromIdx = ids.indexOf(draggedId);
                    const toIdx   = ids.indexOf(widget.id);
                    if (fromIdx === -1 || toIdx === -1) return;
                    const newIds = [...ids];
                    newIds.splice(fromIdx, 1);
                    newIds.splice(toIdx, 0, draggedId);
                    reorderWidgets(newIds);
                  }}
                  style={{ cursor: 'grab' }}
                >
                  <WidgetWrapper
                    id={widget.id}
                    title={widget.title}
                    isDefault={widget.isDefault}
                    onRemove={deleteWidget || removeWidget}
                  >
                    {widget.id === 'kpi_block' && (
                      <div className="overview-cards">
                        <div className="overview-card">
                          <span className="overview-card-title">Ventas Este Mes</span>
                          {loadingOverview
                            ? <span className="overview-card-value">...</span>
                            : <span className="overview-card-value">{fmt$(overview?.ventasEsteMes?.monto)}</span>
                          }
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
                          <span className="overview-card-title">Tasa de Conversión</span>
                          {loadingOverview
                            ? <span className="overview-card-value">...</span>
                            : <span className="overview-card-value">{overview?.tasaConversion?.porcentaje ?? '-'}%</span>
                          }
                        </div>
                      </div>
                    )}
                    {widget.type === 'ventas_panel'     && <VentasOverview />}
                    {widget.type === 'clientes_panel'   && <ClientesOverview />}
                    {widget.type === 'prospectos_panel' && <ProspectosOverview />}
                    {!['kpi_block','ventas_panel','clientes_panel','prospectos_panel'].includes(widget.id) &&
                     !['ventas_panel','clientes_panel','prospectos_panel'].includes(widget.type) && (
                      <DynamicChart config={widget} />
                    )}
                  </WidgetWrapper>
                </div>
              ))
            }
          </div>
        </div>
      )
    },
    clients:      { title: 'Clientes',           content: () => <Clientes /> },
    ventas:       { title: 'Ventas',              content: () => <VentasSection /> },
    alerts:       { title: 'Alertas',             content: () => <AlertasSection /> },
    importar:     { title: 'Importar Excel',      content: () => <ImportarExcelSection /> },
    'api-import': { title: 'Importación por API', content: () => <ApiImportSection /> },
    exportar:     { title: 'Exportar Datos',      content: () => <ExportarDatos /> }
  }

  const currentSection = sections[activeSection]

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><p>Cargando...</p></div>
  }

  return (
    <div className="dashboard-container">
      <SessionWarning
        onExtend={async () => {
          try {
            const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
            const data = await res.json();
            if (data.accessToken) {
              const { setAccessToken } = await import('../../config/authStorage');
              const { setAccessToken: setApiToken } = await import('../../api/axios');
              setAccessToken(data.accessToken);
              setApiToken(data.accessToken);
            }
          } catch {}
        }}
        onLogout={logout}
      />
      <header className="dashboard-header">
        <div className="header-content">
          <h1>SharkFit Dashboard</h1>
          <p>Bienvenido, {user?.firstName || user?.username || 'Usuario'}</p>
        </div>
        <div className="header-actions">
          <NotificationsDropdown
            onNavigateToAlertas={() => { setActiveSection('alerts') }}
          />
          <button className="btn-icon" onClick={() => { logout(); navigate('/login') }} title="Salir">
            <i className="bi bi-box-arrow-right"></i>
          </button>
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
            <button className={'nav-item ' + (activeSection === 'overview'    ? 'active' : '')} onClick={() => setActiveSection('overview')}><i className="bi bi-speedometer2"></i><span>Overview</span></button>
            <button className={'nav-item ' + (activeSection === 'clients'     ? 'active' : '')} onClick={() => setActiveSection('clients')}><i className="bi bi-people"></i><span>Clientes</span></button>
            <button className={'nav-item ' + (activeSection === 'ventas'      ? 'active' : '')} onClick={() => setActiveSection('ventas')}><i className="bi bi-cash-coin"></i><span>Ventas</span></button>
            <button className={'nav-item ' + (activeSection === 'alerts'      ? 'active' : '')} onClick={() => setActiveSection('alerts')}><i className="bi bi-bell"></i><span>Alertas</span></button>
            <button className={'nav-item ' + (activeSection === 'importar'    ? 'active' : '')} onClick={() => setActiveSection('importar')}><i className="bi bi-file-earmark-arrow-up"></i><span>Importar Excel</span></button>
            <button className={'nav-item ' + (activeSection === 'api-import'  ? 'active' : '')} onClick={() => setActiveSection('api-import')}><i className="bi bi-plug"></i><span>Importación por API</span></button>
            <div className="sidebar-separator"></div>
            <button className={'nav-item ' + (activeSection === 'exportar'    ? 'active' : '')} onClick={() => setActiveSection('exportar')}><i className="bi bi-download"></i><span>Exportar datos</span></button>
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
            <button className="btn-logout" onClick={logout}>
              <i className="bi bi-box-arrow-right" style={{ fontSize: '16px' }}></i>
              Salir
            </button>
          </div>
        </aside>
        <main className="dashboard-content">
          <h2>{currentSection.title}</h2>
          <div className="content-body">{currentSection.content()}</div>
        </main>
        <ChartBuilder isOpen={showBuilder} onClose={() => setShowBuilder(false)} onAdd={addWidget} />
      </div>
    </div>
  )
}

export default Dashboard

