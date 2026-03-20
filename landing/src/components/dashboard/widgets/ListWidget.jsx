import React from 'react';
import './WidgetStyles.css';

const ListWidget = ({ data, config, loading, onItemClick }) => {
  if (loading) {
    return (
      <div className="widget-list widget-loading">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton skeleton-item"></div>
        ))}
      </div>
    );
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <div className="widget-list widget-empty">
        <i className={`bi ${config?.icono || 'bi-list'}`}></i>
        <p>No hay elementos</p>
      </div>
    );
  }

  const getPrioridadClass = (prioridad) => {
    const clases = {
      'critical': 'prioridad-critica',
      'high': 'prioridad-alta',
      'medium': 'prioridad-media',
      'low': 'prioridad-baja'
    };
    return clases[prioridad] || '';
  };

  return (
    <div className="widget-list">
      <div className="list-header">
        <span className="list-count">{items.length} elementos</span>
      </div>
      
      <div className="list-items">
        {items.slice(0, 10).map((item, index) => (
          <div 
            key={item.id || index}
            className={`list-item ${getPrioridadClass(item.prioridad)}`}
            onClick={() => onItemClick?.(item)}
          >
            {item.icono && (
              <div className="item-icon">
                <i className={`bi ${item.icono}`}></i>
              </div>
            )}
            
            <div className="item-content">
              <div className="item-title">
                {item.titulo || item.nombre || item.producto || '-'}
              </div>
              {item.subtitulo && (
                <div className="item-subtitle">{item.subtitulo}</div>
              )}
              {item.fecha && (
                <div className="item-date">
                  {new Date(item.fecha).toLocaleDateString('es-CL')}
                </div>
              )}
            </div>
            
            {item.valor !== undefined && (
              <div className="item-value">
                {typeof item.valor === 'number' 
                  ? new Intl.NumberFormat('es-CL').format(item.valor)
                  : item.valor
                }
              </div>
            )}
            
            {item.badge && (
              <span className={`item-badge badge-${item.badge.tipo || 'default'}`}>
                {item.badge.texto || item.badge}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {items.length > 10 && (
        <div className="list-footer">
          <button className="btn-ver-mas">
            Ver todos ({items.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default ListWidget;