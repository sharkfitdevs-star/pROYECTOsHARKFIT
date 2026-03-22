import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axios';

const WidgetGrid = ({ config }) => {
  const [widgetsData, setWidgetsData] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  const fetchWidgetData = useCallback(async (widgetCodigo) => {
    setLoading(prev => ({ ...prev, [widgetCodigo]: true }));
    try {
      const response = await api.get(`/dashboard/widgets/data/${widgetCodigo}`);
      setWidgetsData(prev => ({ ...prev, [widgetCodigo]: response.data.data }));
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
      const response = await api.post('/dashboard/widgets/data/batch', { widgets: codigos });
      setWidgetsData(response.data.data || {});
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
            {isLoading ? (
              <p style={{ color: '#888', fontSize: '0.85rem' }}>Cargando...</p>
            ) : data ? (
              <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            ) : (
              <p style={{ color: '#888', fontSize: '0.85rem' }}>Sin datos</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WidgetGrid;
