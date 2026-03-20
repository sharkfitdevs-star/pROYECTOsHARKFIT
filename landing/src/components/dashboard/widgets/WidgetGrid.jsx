import React, { useState, useEffect, useCallback } from 'react';
import KPIWidget from './KPIWidget';
import ChartWidget from './ChartWidget';
import ListWidget from './ListWidget';
import QuickActionsWidget from './QuickActionsWidget';
import AlertsWidget from './AlertsWidget';
import './WidgetStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const WidgetGrid = ({ config, onConfigChange }) => {
  const [widgetsData, setWidgetsData] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  const fetchWidgetData = useCallback(async (widgetCodigo) => {
    setLoading(prev => ({ ...prev, [widgetCodigo]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/dashboard/widgets/data/${widgetCodigo}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar datos');
      
      const result = await response.json();
      
      setWidgetsData(prev => ({
        ...prev,
        [widgetCodigo]: result.data
      }));
    } catch (err) {
      console.error(`Error cargando widget ${widgetCodigo}:`, err);
    } finally {
      setLoading(prev => ({ ...prev, [widgetCodigo]: false }));
    }
  }, []);

  const fetchAllWidgetsData = useCallback(async () => {
    if (!config?.widgets?.length) return;
    
    const codigos = config.widgets
      .filter(w => w.visible !== false)
      .map(w => w.widget_codigo || w.widget?.codigo)
      .filter(Boolean);
    
    if (codigos.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/dashboard/widgets/data/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ widgets: codigos })
      });
      
      if (!response.ok) throw new Error('Error al cargar datos');
      
      const result = await response.json();
      setWidgetsData(result.data);
    } catch (err) {
      console.error('Error cargando widgets:', err);
      setError(err.message);
    }
  }, [config]);

  useEffect(() => {
    fetchAllWidgetsData();
    
    if (config?.auto_refresh) {
      const interval = setInterval(fetchAllWidgetsData, config.refresh_interval || 300000);
      return () => clearInterval(interval);
    }
  }, [fetchAllWidgetsData, config?.auto_refresh, config?.refresh_interval]);

  const renderWidget = (widgetInstance) => {
    const widget = widgetInstance.widget || {};
    const codigo = widgetInstance.widget_codigo || widget.codigo;
    const tipo = widget.tipo;
    const data = widgetsData[codigo];
    const isLoading = loading[codigo];

    const widgetConfig = {
      ...widget,
      ...widgetInstance.config_personalizada
    };

    const commonProps = {
      data,
      config: widgetConfig,
      loading: isLoading,
      onRefresh: () => fetchWidgetData(codigo)
    };

    switch (tipo) {
      case 'kpi':
        return <KPIWidget {...commonProps} />;
      case 'chart':
        return <ChartWidget {...commonProps} />;
      case 'list':
        return <ListWidget {...commonProps} />;
      case 'quick_actions':
        return <QuickActionsWidget {...commonProps} />;
      case 'alerts':
        return <AlertsWidget {...commonProps} />;
      case 'table':
        return <ListWidget {...commonProps} />;
      case 'progress':
        return <KPIWidget {...commonProps} />;
      default:
        return (
          <div className="widget-empty">
            <i className="bi bi-question-circle"></i>
            <p>Widget no soportado: {tipo}</p>
          </div>
        );
    }
  };

  const getGridStyle = (posicion) => {
    return {
      gridColumn: `span ${posicion?.w || 1}`,
      gridRow: `span ${posicion?.h || 1}`
    };
  };

  if (!config || !config.widgets) {
    return (
      <div className="widget-grid-empty">
        <i className="bi bi-grid-3x3-gap"></i>
        <h3>Configura tu dashboard</h3>
        <p>Agrega widgets para personalizar tu vista</p>
      </div>
    );
  }

  const visibleWidgets = config.widgets.filter(w => w.visible !== false);

  return (
    <div 
      className="widget-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${config.layout?.columns || 4}, 1fr)`,
        gap: `${config.layout?.gap || 16}px`,
        gridAutoRows: `minmax(${config.layout?.row_height || 150}px, auto)`
      }}
    >
      {visibleWidgets.map((widgetInstance, index) => {
        const widget = widgetInstance.widget || {};
        
        return (
          <div
            key={widgetInstance._id || index}
            className="widget-container"
            style={{
              ...getGridStyle(widgetInstance.posicion),
              '--widget-color': widget.color || '#10b981'
            }}
          >
            <div className="widget-header">
              <div className="widget-title">
                <i className={`bi ${widget.icono || 'bi-grid'}`}></i>
                {widget.nombre || 'Widget'}
              </div>
              <div className="widget-actions-menu">
                <button 
                  onClick={() => fetchWidgetData(widgetInstance.widget_codigo || widget.codigo)}
                  title="Actualizar"
                >
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>
            
            <div className="widget-body">
              {renderWidget(widgetInstance)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WidgetGrid;
