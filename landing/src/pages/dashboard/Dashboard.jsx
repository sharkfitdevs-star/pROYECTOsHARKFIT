import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import OverviewBI from '../../components/dashboard/OverviewBI';
import { useTheme } from '../../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createToast } from '@/components/ui/use-toast';
import './Dashboard.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import NotificationsDropdown from './NotificationsDropdown';
import SessionWarning from '../../components/SessionWarning';

const Clientes = lazy(() => import('./Clientes'));
const VentasSection = lazy(() => import('./VentasSection'));
const AlertasSection = lazy(() => import('./AlertasSection'));
const AprobacionesSection = lazy(() => import('./AprobacionesSection'));
const ExportarDatos = lazy(() => import('./ExportarDatos'));
const ImportarExcelSection = lazy(() => import('./ImportarExcelSection'));
const MigracionBDSection = lazy(() => import('./MigracionBDSection'));
const ApiImportSection = lazy(() => import('./ApiImportSection'));
const ProductosSection = lazy(() => import('../../components/inventario/ProductosSection'));
const InventarioSection = lazy(() => import('../../components/inventario/InventarioSection'));
const ProveedoresSection = lazy(() => import('../../components/inventario/ProveedoresSection'));
const EntregasSection = lazy(() => import('../../components/inventario/EntregasSection'));
const ComprasSection = lazy(() => import('../../components/inventario/ComprasSection'));
const RemuneracionesSection = lazy(() => import('../../components/rrhh/RemuneracionesSection'));
const ColaboradoresSection = lazy(() => import('../../components/rrhh/ColaboradoresSection'));
const EvaluacionSection = lazy(() => import('../../components/rrhh/EvaluacionSection'));
const ReclutamientoSection = lazy(() => import('../../components/rrhh/ReclutamientoSection'));
const DistribucionSection = lazy(() => import('../../components/rrhh/DistribucionSection'));
const AcademySection = lazy(() => import('../../components/formacion/AcademySection'));
const DocumentosSection = lazy(() => import('../../components/rrhh/DocumentosSection'));


class SectionErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return React.createElement('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary,#94a3b8)' } },
        React.createElement('p', { style: { fontSize: '1rem', marginBottom: '12px' } }, 'Error al cargar esta seccion'),
        React.createElement('p', { style: { fontSize: '0.75rem', opacity: 0.6 } }, String(this.state.error?.message || '')),
        React.createElement('button', { style: { marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border,rgba(255,255,255,0.1))', background: 'var(--color-bg-card,#1a2f55)', color: 'var(--color-text,#f1f5f9)', cursor: 'pointer' }, onClick: () => this.setState({ error: null }) }, 'Reintentar')
      );
    }
    return this.props.children;
  }
}
function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const { user, logout, extendSession } = useAuth()
  const navigate = useNavigate()

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

  const navItems = [
    // Grupo Principal
    // Principal — todos los roles
    { type: 'item', label: 'Overview', icon: 'bi-grid', internalSection: 'overview', roles: ['owner', 'staff', 'viewer'] },
    { type: 'item', label: 'Clientes', icon: 'bi-people', internalSection: 'clients', roles: ['owner', 'staff', 'viewer'] },
    { type: 'item', label: 'Ventas', icon: 'bi-cart', internalSection: 'ventas', roles: ['owner', 'staff', 'viewer'] },
    { type: 'item', label: 'Alertas', icon: 'bi-bell', internalSection: 'alerts', roles: ['owner', 'staff', 'viewer'] },
    { type: 'item', label: 'Aprobaciones', icon: 'bi-check2-square', internalSection: 'aprobaciones', roles: ['owner'] },
    
    // RRHH — solo owner y staff
    { type: 'group', label: 'RRHH', roles: ['owner', 'staff'] },
    { type: 'item', label: 'Colaboradores', icon: 'bi-person-badge', internalSection: 'colaboradores', roles: ['owner', 'staff'] },
    { type: 'item', label: 'Remuneraciones', icon: 'bi-cash-coin', internalSection: 'remuneraciones', roles: ['owner'] },
    { type: 'item', label: 'Evaluación', icon: 'bi-clipboard-check', internalSection: 'evaluacion', roles: ['owner', 'staff'] },
    { type: 'item', label: 'Documentos', icon: 'bi-file-earmark-text', internalSection: 'documentos', roles: ['owner', 'staff'] },
    { type: 'item', label: 'Reclutamiento', icon: 'bi-person-plus', internalSection: 'reclutamiento', roles: ['owner'] },
    { type: 'item', label: 'Distribución', icon: 'bi-diagram-3', internalSection: 'distribucion', roles: ['owner', 'staff'] },
    
    // Inventario — owner y staff
    { type: 'group', label: 'INVENTARIO', roles: ['owner', 'staff'] },
    { type: 'item', label: 'Productos', icon: 'bi-box', internalSection: 'productos', roles: ['owner', 'staff'] },
    { type: 'item', label: 'Stock', icon: 'bi-boxes', internalSection: 'stock', roles: ['owner', 'staff'] },
    { type: 'item', label: 'Proveedores', icon: 'bi-truck', internalSection: 'proveedores', roles: ['owner', 'staff'] },
    { type: 'item', label: 'Entregas', icon: 'bi-box-seam', internalSection: 'entregas', roles: ['owner', 'staff'] },
    { type: 'item', label: 'Compras', icon: 'bi-cart', internalSection: 'compras', roles: ['owner'] },
    
    // Formación — todos
    { type: 'group', label: 'FORMACIÓN', roles: ['owner', 'staff', 'viewer'] },
    { type: 'item', label: 'Shark Academy', icon: 'bi-mortarboard', internalSection: 'academy', roles: ['owner', 'staff', 'viewer'] },
    
    // Sistema — solo owner
    { type: 'group', label: 'SISTEMA', roles: ['owner'] },
    { type: 'item', label: 'Automatizaciones', icon: 'bi-gear-wide-connected', internalSection: 'automatizaciones', roles: ['owner'] },
    { type: 'item', label: 'Importar Excel', icon: 'bi-file-earmark-excel', internalSection: 'importar', roles: ['owner'] },
    { type: 'item', label: 'Migración BD', icon: 'bi-database-up', internalSection: 'migracion-bd', roles: ['owner'] },
    { type: 'item', label: 'Importación API', icon: 'bi-cloud-download', internalSection: 'api-import', roles: ['owner'] },
    { type: 'item', label: 'Exportar datos', icon: 'bi-download', internalSection: 'exportar', roles: ['owner', 'staff'] },
  ]

  // Función para renderizar el contenido según la sección activa
  const renderContent = () => {
    switch (activeSection) {
      // Principal
      case 'overview':
        return (
          <OverviewBI
            user={user}
            onNavigate={seccion => setActiveSection(seccion)}
          />
        );
      case 'clients':
        return <Clientes />;
      case 'ventas':
        return <VentasSection />;
      case 'alerts':
        return <AlertasSection />;
      case 'aprobaciones':
        return <AprobacionesSection />;
      // Inventario
      case 'productos':
        return <ProductosSection />;
      case 'stock':
        return <InventarioSection />;
      case 'proveedores':
        return <ProveedoresSection />;
      case 'entregas':
        return <EntregasSection />;
      case 'compras':
        return <ComprasSection />;
      // RRHH
      case 'colaboradores':
        return <ColaboradoresSection />;
      case 'remuneraciones':
        return <RemuneracionesSection />;
      case 'evaluacion':
        return <EvaluacionSection />;
      case 'reclutamiento':
        return <ReclutamientoSection />;
      // Sistema
      case 'importar':
        return <ImportarExcelSection />;
      case 'migracion-bd':
        return <MigracionBDSection />;
      case 'api-import':
        return <ApiImportSection />;
      case 'exportar':
        return <ExportarDatos />;
      case 'distribucion':
        return <DistribucionSection />;
      case 'academy':
        return <AcademySection />;
      case 'documentos':
        return <DocumentosSection />;
      // Secciones pendientes (placeholder)
      case 'automatizaciones':
        return (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <i className="bi bi-gear" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
            <h2 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              {navItems.find(item => item.internalSection === activeSection)?.label || 'Sección'}
            </h2>
            <p>Esta sección estará disponible próximamente.</p>
          </div>
        );
      default:
        return (
          <OverviewBI
            user={user}
            onNavigate={seccion => setActiveSection(seccion)}
          />
        );
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><p>Cargando...</p></div>
  }

  return (
    <div className="dashboard-container">
      <SessionWarning
        onExtend={extendSession}
        onLogout={logout}
      />
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Sharcknegocios Dashboard</h1>
          <p>Bienvenido, {user?.firstName || user?.username || 'Usuario'}</p>
        </div>
        <div className="header-actions">
          <NotificationsDropdown
            onNavigateToAlertas={() => { setActiveSection('alerts') }}
          />
          <button
            className="btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={{ fontSize: '1.1rem' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
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
        <aside className="dashboard-sidebar sidebar">
          <nav className="sidebar-nav">
            {navItems.filter(item => !item.roles || item.roles.includes(user?.role || 'viewer')).map((item, idx) => {
              if (item.type === 'group') {
                return <div key={`group-${idx}`} className="nav-group-title">{item.label}</div>
              }
              
              const isActive = item.internalSection && activeSection === item.internalSection
              
              return (
                <button
                  key={`nav-${idx}`}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.internalSection)}
                  title={item.label}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </button>
              )
            })}
            <div className="sidebar-separator"></div>
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
                      {/* Botón de viewMode eliminado */}
              Salir
            </button>
          </div>
        </aside>
        <main className="dashboard-content">
          <div className="content-body">
            <SectionErrorBoundary><Suspense fallback={<div style={{padding:"40px",textAlign:"center",color:"var(--color-text-secondary,#94a3b8)"}}>Cargando...</div>}>{renderContent()}</Suspense></SectionErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard





