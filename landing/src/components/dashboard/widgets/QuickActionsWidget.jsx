import React from 'react';
import { useNavigate } from 'react-router-dom';
import './WidgetStyles.css';

const QuickActionsWidget = ({ data, config, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="widget-actions widget-loading">
        <div className="skeleton skeleton-actions"></div>
      </div>
    );
  }

  const acciones = data?.items || [];

  if (acciones.length === 0) {
    return (
      <div className="widget-actions widget-empty">
        <i className="bi bi-lightning"></i>
        <p>Sin acciones disponibles</p>
      </div>
    );
  }

  const handleClick = (accion) => {
    if (accion.onClick) {
      accion.onClick();
    } else if (accion.path) {
      navigate(accion.path);
    }
  };

  return (
    <div className="widget-actions">
      <div className="actions-grid">
        {acciones.map((accion, index) => (
          <button
            key={index}
            className="action-button"
            onClick={() => handleClick(accion)}
            title={accion.label}
          >
            <i className={`bi ${accion.icon || 'bi-arrow-right'}`}></i>
            <span>{accion.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsWidget;