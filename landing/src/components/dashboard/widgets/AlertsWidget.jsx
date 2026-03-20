import React from 'react';
import { useNavigate } from 'react-router-dom';
import './WidgetStyles.css';

const AlertsWidget = ({ data, config, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="widget-alerts widget-loading">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton skeleton-alert"></div>
        ))}
      </div>
    );
  }

  const alertas = data?.items || [];

  const getPrioridadInfo = (prioridad) => {
    const info = {
      'critical': { icon: 'bi-exclamation-octagon-fill', clase: 'alert-critical', label: 'Crítica' },
      'high': { icon: 'bi-exclamation-triangle-fill', clase: 'alert-high', label: 'Alta' },
      'medium': { icon: 'bi-exclamation-circle-fill', clase: 'alert-medium', label: 'Media' },
      'low': { icon: 'bi-info-circle-fill', clase: 'alert-low', label: 'Baja' }
    };
    return info[prioridad] || info['medium'];
  };

  const formatTimeAgo = (fecha) => {
    const ahora = new Date();
    const fechaAlerta = new Date(fecha);
    const diff = Math.floor((ahora - fechaAlerta) / 1000);

    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} hrs`;
    return `Hace ${Math.floor(diff / 86400)} días`;
  };

  return (
    <div className="widget-alerts">
      {alertas.length === 0 ? (
        <div className="widget-empty">
          <i className="bi bi-check-circle"></i>
          <p>Sin alertas pendientes</p>
        </div>
      ) : (
        <>
          <div className="alerts-header">
            <span className="alerts-count">
              <i className="bi bi-bell-fill"></i>
              {alertas.length} alertas
            </span>
          </div>
          
          <div className="alerts-list">
            {alertas.slice(0, 5).map((alerta, index) => {
              const prioridadInfo = getPrioridadInfo(alerta.prioridad);
              
              return (
                <div 
                  key={alerta.id || index}
                  className={`alert-item ${prioridadInfo.clase}`}
                  onClick={() => navigate(`/dashboard/alertas/${alerta.id}`)}
                >
                  <div className="alert-icon">
                    <i className={`bi ${prioridadInfo.icon}`}></i>
                  </div>
                  
                  <div className="alert-content">
                    <div className="alert-title">{alerta.titulo}</div>
                    <div className="alert-meta">
                      <span className="alert-priority">{prioridadInfo.label}</span>
                      <span className="alert-time">{formatTimeAgo(alerta.fecha)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {alertas.length > 5 && (
            <div className="alerts-footer">
              <button 
                className="btn-ver-todas"
                onClick={() => navigate('/dashboard/alertas')}
              >
                Ver todas las alertas
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AlertsWidget;