import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ExportarDatos from './ExportarDatos'
import { createToast } from '@/components/ui/use-toast'
import ImportarExcelSection from './ImportarExcelSection'
import Clientes from './Clientes'
import VentasSection from './VentasSection'
import AlertasSection from './AlertasSection'
import './Dashboard.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import NotificationsDropdown from './NotificationsDropdown'
import ApiImportSection from './ApiImportSection'
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import SessionWarning from '../../components/SessionWarning';
import ProductosSection from '../../components/inventario/ProductosSection';
import InventarioSection from '../../components/inventario/InventarioSection';
import ProveedoresSection from '../../components/inventario/ProveedoresSection';
import EntregasSection from '../../components/inventario/EntregasSection';
import ComprasSection from '../../components/inventario/ComprasSection';
import RemuneracionesSection from '../../components/rrhh/RemuneracionesSection';
import ColaboradoresSection from '../../components/rrhh/ColaboradoresSection';
import EvaluacionSection from '../../components/rrhh/EvaluacionSection';
import ReclutamientoSection from '../../components/rrhh/ReclutamientoSection';
import DistribucionSection from '../../components/rrhh/DistribucionSection';
import AcademySection from '../../components/formacion/AcademySection';
import DocumentosSection from '../../components/rrhh/DocumentosSection';

function Dashboard() {
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
    { type: 'item', label: 'Overview', icon: 'bi-grid', internalSection: 'overview' },
    { type: 'item', label: 'Clientes', icon: 'bi-people', internalSection: 'clients' },
    { type: 'item', label: 'Ventas', icon: 'bi-cart', internalSection: 'ventas' },
    { type: 'item', label: 'Alertas', icon: 'bi-bell', internalSection: 'alerts' },
    
    // Grupo RRHH
    { type: 'group', label: 'RRHH' },
    { type: 'item', label: 'Colaboradores', icon: 'bi-person-badge', internalSection: 'colaboradores' },
    { type: 'item', label: 'Remuneraciones', icon: 'bi-cash-coin', internalSection: 'remuneraciones' },
    { type: 'item', label: 'Evaluación', icon: 'bi-clipboard-check', internalSection: 'evaluacion' },
    { type: 'item', label: 'Documentos', icon: 'bi-file-earmark-text', internalSection: 'documentos' },
    { type: 'item', label: 'Reclutamiento', icon: 'bi-person-plus', internalSection: 'reclutamiento' },
    { type: 'item', label: 'Distribución', icon: 'bi-diagram-3', internalSection: 'distribucion' },
    
    // Grupo Inventario
    { type: 'group', label: 'INVENTARIO' },
    { type: 'item', label: 'Productos', icon: 'bi-box', internalSection: 'productos' },
    { type: 'item', label: 'Stock', icon: 'bi-boxes', internalSection: 'stock' },
    { type: 'item', label: 'Proveedores', icon: 'bi-truck', internalSection: 'proveedores' },
    { type: 'item', label: 'Entregas', icon: 'bi-box-seam', internalSection: 'entregas' },
    { type: 'item', label: 'Compras', icon: 'bi-cart', internalSection: 'compras' },
    
    // Grupo Formación
    { type: 'group', label: 'FORMACIÓN' },
    { type: 'item', label: 'Shark Academy', icon: 'bi-mortarboard', internalSection: 'academy' },
    
    // Grupo Sistema
    { type: 'group', label: 'SISTEMA' },
    { type: 'item', label: 'Automatizaciones', icon: 'bi-gear-wide-connected', internalSection: 'automatizaciones' },
    { type: 'item', label: 'Importar Excel', icon: 'bi-file-earmark-excel', internalSection: 'importar' },
    { type: 'item', label: 'Importación API', icon: 'bi-cloud-download', internalSection: 'api-import' },
    { type: 'item', label: 'Exportar datos', icon: 'bi-download', internalSection: 'exportar' },
  ]

  // Función para renderizar el contenido según la sección activa
  const renderContent = () => {
    switch (activeSection) {
      // Principal
      case 'overview':
        return <DashboardOverview user={user} />;
      case 'clients':
        return <Clientes />;
      case 'ventas':
        return <VentasSection />;
      case 'alerts':
        return <AlertasSection />;
      
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
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            <i className="bi bi-gear" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
            <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>
              {navItems.find(item => item.internalSection === activeSection)?.label || 'Sección'}
            </h2>
            <p>Esta sección estará disponible próximamente.</p>
          </div>
        );
      
      default:
        return <DashboardOverview user={user} />;
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
        <aside className="dashboard-sidebar sidebar">
          <nav className="sidebar-nav">
            {navItems.map((item, idx) => {
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
              Salir
            </button>
          </div>
        </aside>
        <main className="dashboard-content">
          <div className="content-body">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard



