

import React, { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../../../config/authStorage';
import KPIWidget from './KPIWidget';
import ChartWidget from './ChartWidget';
import ListWidget from './ListWidget';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const WidgetGrid = ({ config }) => {
  const [widgetsData, setWidgetsData] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  const fetchWidgetData = useCallback(async (widgetCodigo) => {
    setLoading(prev => ({ ...prev, [widgetCodigo]: true }));
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/dashboard/widgets/data/${widgetCodigo}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setWidgetsData(prev => ({ ...prev, [widgetCodigo]: data.data }));
    } catch (err) {
      console.error(`Error cargando widget ${widgetCodigo}:`, err.message);
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
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/dashboard/widgets/data/batch`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ widgets: codigos })
      });
      const data = await response.json();
      setWidgetsData(data.data || {});
      setError(null);
    } catch (err) {
      console.error('Error cargando widgets:', err.message);
      setError(err.message);
    }
  }, [config]);

  useEffect(() => {
    fetchAllWidgetsData();
    if (config?.auto_refresh) {
      const interval = setInterval(fetchAllWidgetsData, config.refresh_interval || 300000);
      return () => clearInterval(interval);
    }
  }, [fetchAllWidgetsData, config]);

  if (!config?.widgets) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
        <p>Configura tu dashboard para ver widgets</p>
      </div>
    );
  }

  const visibleWidgets = config.widgets.filter(w => w.visible !== false);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${config.layout?.columns || 4}, 1fr)`,
      gap: `${config.layout?.gap || 16}px`,
      gridAutoRows: `minmax(${config.layout?.row_height || 150}px, auto)`
    }}>
      {visibleWidgets.map((widgetInstance, index) => {
        const widget = widgetInstance.widget || {};
        const codigo = widgetInstance.widget_codigo || widget.codigo;
        const isLoading = loading[codigo];
        const data = widgetsData[codigo];

        // Renderizado visual según tipo de widget
        let content = null;
        const tipo = widget.tipo;

        if (isLoading) {
          content = <p style={{ color: '#888', fontSize: '0.85rem' }}>Cargando...</p>;
        } else if (data) {
          switch (tipo) {
            case 'kpi':
              content = <KPIWidget data={data} config={widget} loading={isLoading} />;
              break;
            case 'chart':
              content = <ChartWidget data={data} config={widget} loading={isLoading} />;
              break;
            case 'list':
              content = <ListWidget data={data} config={widget} loading={isLoading} />;
              break;
            case 'quick_actions':
              content = Array.isArray(data.acciones) && data.acciones.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {data.acciones.map((accion, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      <button
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => accion.onClick?.()}
                        title={accion.descripcion || accion.label}
                      >
                        {accion.icono && <i className={`bi ${accion.icono}`} style={{ marginRight: 6 }}></i>}
                        {accion.label || accion.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p style={{ color: '#888', fontSize: '0.85rem' }}>Sin acciones</p>;
              break;
            default:
              if (data.valor !== undefined && data.valor !== null) {
                content = (
                  <div style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, color: '#10b981', margin: '2rem 0' }}>
                    {data.valor}
                  </div>
                );
              } else if (Array.isArray(data.items) && data.items.length > 0) {
                content = (
                  <ul style={{ paddingLeft: 16 }}>
                    {data.items.map((item, i) => (
                      <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
                    ))}
                  </ul>
                );
              } else if (Array.isArray(data.labels) && Array.isArray(data.values) && data.labels.length === data.values.length) {
                // Render gráfico simple de barras
                content = (
                  <div style={{ width: '100%', height: 120, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                    {data.values.map((v, i) => (
                      <div key={i} style={{
                        background: '#3b82f6',
                        width: 24,
                        height: `${Math.max(10, v)}px`,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        borderRadius: 4,
                        position: 'relative',
                      }}>
                        <span style={{ position: 'absolute', top: -18, fontSize: 12, color: '#555' }}>{data.labels[i]}</span>
                        <span style={{ fontSize: 12, color: '#fff', marginBottom: 2 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                );
              } else {
                content = <p style={{ color: '#888', fontSize: '0.85rem' }}>Sin datos</p>;
              }
              break;
          }
        } else {
          content = <p style={{ color: '#888', fontSize: '0.85rem' }}>Sin datos</p>;
        }

        return (
          <div key={widgetInstance._id || index} style={{
            background: 'var(--color-background-secondary)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid var(--color-border-tertiary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>{widget.nombre || 'Widget'}</strong>
              <button onClick={() => fetchWidgetData(codigo)} title="Actualizar"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                ↻
              </button>
            </div>
            {content}
          </div>
        );
      })}
    </div>
  );
};

export default WidgetGrid;
