import React from 'react';
import './WidgetStyles.css';

const KPIWidget = ({ data, config, loading }) => {
  const formatValue = (valor, formato) => {
    if (valor === null || valor === undefined) return '-';
    
    switch (formato) {
      case 'currency':
        return new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP',
          minimumFractionDigits: 0
        }).format(valor);
      case 'percentage':
        return `${valor}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('es-CL').format(valor);
    }
  };

  const getTendenciaIcon = (tendencia) => {
    if (!tendencia) return null;
    return tendencia.direccion === 'up' ? 'bi-arrow-up' : 'bi-arrow-down';
  };

  const getTendenciaColor = (tendencia) => {
    if (!tendencia) return '';
    return tendencia.direccion === 'up' ? 'tendencia-up' : 'tendencia-down';
  };

  if (loading) {
    return (
      <div className="widget-kpi widget-loading">
        <div className="skeleton skeleton-value"></div>
        <div className="skeleton skeleton-label"></div>
      </div>
    );
  }

  return (
    <div className="widget-kpi" style={{ '--widget-color': config?.color || '#10b981' }}>
      <div className="kpi-icon">
        <i className={`bi ${config?.icono || 'bi-graph-up'}`}></i>
      </div>
      
      <div className="kpi-content">
        <div className="kpi-value">
          {formatValue(data?.valor, data?.formato)}
          
          {data?.tendencia && (
            <span className={`kpi-tendencia ${getTendenciaColor(data.tendencia)}`}>
              <i className={`bi ${getTendenciaIcon(data.tendencia)}`}></i>
              {data.tendencia.porcentaje}%
            </span>
          )}
        </div>
        
        <div className="kpi-label">
          {config?.nombre || 'KPI'}
        </div>
        
        {data?.comparacion && (
          <div className="kpi-comparacion">
            <span className={data.comparacion.porcentaje >= 0 ? 'positive' : 'negative'}>
              {data.comparacion.porcentaje >= 0 ? '+' : ''}{data.comparacion.porcentaje}%
            </span>
            vs período anterior
          </div>
        )}
        
        {data?.label && (
          <div className="kpi-sublabel">{data.label}</div>
        )}
      </div>
    </div>
  );
};

export default KPIWidget;