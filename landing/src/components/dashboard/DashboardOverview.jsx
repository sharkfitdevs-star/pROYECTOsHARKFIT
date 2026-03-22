import React, { useState, useEffect, useCallback } from 'react';
import { WidgetGrid } from './widgets'; // La ruta se actualiza en el index.js
import DashboardWidgetsService from '../../api/services/DashboardWidgetsService';
import './DashboardOverview.css';

const DashboardOverview = ({ user }) => {
  const [config, setConfig] = useState(null);
  const [widgetsDisponibles, setWidgetsDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfigurador, setShowConfigurador] = useState(false);

  const cargarConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await DashboardWidgetsService.getMiConfig();
      setConfig(response.data);
    } catch (err) {
      console.error('Error cargando config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarWidgetsDisponibles = useCallback(async () => {
    try {
      const response = await DashboardWidgetsService.getWidgetsDisponibles();
      setWidgetsDisponibles(response.data || []);
    } catch (err) {
      console.error('Error cargando widgets disponibles:', err);
    }
  }, []);

  useEffect(() => {
    cargarConfig();
    cargarWidgetsDisponibles();
  }, [cargarConfig, cargarWidgetsDisponibles]);

  const handleAgregarWidget = async (widgetId) => {
    try {
      const response = await DashboardWidgetsService.agregarWidget(widgetId);
      setConfig(response.data);
    } catch (err) {
      console.error('Error agregando widget:', err);
    }
  };

  const handleQuitarWidget = async (instanceId) => {
    try {
      await DashboardWidgetsService.quitarWidget(instanceId);
      await cargarConfig();
    } catch (err) {
      console.error('Error quitando widget:', err);
    }
  };

  const handleResetear = async () => {
    if (!window.confirm('¿Estás seguro de resetear tu dashboard a la configuración por defecto?')) {
      return;
    }
    
    try {
      const response = await DashboardWidgetsService.resetearDashboard();
      setConfig(response.data);
    } catch (err) {
      console.error('Error reseteando dashboard:', err);
    }
  };

  const handleSeedWidgets = async () => {
    try {
      await DashboardWidgetsService.seedWidgets();
      await cargarConfig();
      alert('Widgets base creados exitosamente');
    } catch (err) {
      console.error('Error creando widgets:', err);
    }
  };

  const widgetsNoAgregados = widgetsDisponibles.filter(w => {
    if (!config?.widgets) return true;
    return !config.widgets.some(cw => 
      cw.widget?._id === w._id || cw.widget === w._id
    );
  });

  if (loading) {
    return (
      <div className="dashboard-overview loading">
        <div className="loading-spinner">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-overview error">
        <div className="error-message">
          <i className="bi bi-exclamation-triangle"></i>
          <h3>Error al cargar el dashboard</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={cargarConfig} className="btn-retry">
              <i className="bi bi-arrow-clockwise"></i> Reintentar
            </button>
            <button onClick={handleSeedWidgets} className="btn-seed">
              <i className="bi bi-plus-circle"></i> Crear widgets base
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      <div className="overview-header">
        <div className="header-info">
          <h1>Dashboard</h1>
          <p className="welcome-message">
            Bienvenido, {user?.name || 'Usuario'} 
            <span className="user-role">({user?.role || 'staff'})</span>
          </p>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn-configurar"
            onClick={() => setShowConfigurador(!showConfigurador)}
          >
            <i className="bi bi-gear"></i>
            {showConfigurador ? 'Cerrar' : 'Personalizar'}
          </button>
          
          <button 
            className="btn-refresh"
            onClick={cargarConfig}
            title="Actualizar todo"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {showConfigurador && (
        <div className="configurador-panel">
          <div className="configurador-header">
            <h3>Personaliza tu Dashboard</h3>
            <button 
              className="btn-reset"
              onClick={handleResetear}
            >
              <i className="bi bi-arrow-counterclockwise"></i>
              Resetear
            </button>
          </div>
          
          <div className="widgets-disponibles">
            <h4>Widgets disponibles para agregar:</h4>
            {widgetsNoAgregados.length === 0 ? (
              <p className="no-widgets">Ya tienes todos los widgets disponibles</p>
            ) : (
              <div className="widgets-lista">
                {widgetsNoAgregados.map(widget => (
                  <div 
                    key={widget._id}
                    className="widget-item-disponible"
                    onClick={() => handleAgregarWidget(widget._id)}
                  >
                    <i className={`bi ${widget.icono || 'bi-grid'}`} style={{ color: widget.color }}></i>
                    <div className="widget-info">
                      <span className="widget-nombre">{widget.nombre}</span>
                      <span className="widget-categoria">{widget.categoria}</span>
                    </div>
                    <button className="btn-agregar">
                      <i className="bi bi-plus"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overview-content">
        {config?.widgets?.length > 0 ? (
          <WidgetGrid 
            config={config}
            onConfigChange={setConfig}
            token={user?.accessToken || user?.token || localStorage.getItem('accessToken') || localStorage.getItem('token') || ''}
          />
        ) : (
          <div className="no-widgets-message">
            <i className="bi bi-grid-3x3-gap"></i>
            <h3>Tu dashboard está vacío</h3>
            <p>Haz clic en "Personalizar" para agregar widgets</p>
            <button onClick={handleSeedWidgets} className="btn-crear-widgets">
              <i className="bi bi-magic"></i>
              Crear widgets automáticamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
