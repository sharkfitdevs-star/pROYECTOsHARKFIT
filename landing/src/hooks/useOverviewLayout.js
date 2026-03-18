import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { fetchAuth } from '../api/fetchAuth';

const BASE = import.meta.env.VITE_API_URL || '/api';

const DEFAULT_WIDGETS = [
  { id: 'kpi_block',        type: 'kpi_block',       title: 'KPIs Principales',    dataSource: '/api/dashboard/overview',   dataKey: '',                visible: true,  order: 0, size: 'full', color: '#00d4ff', isDefault: true  },
  { id: 'chart_evolucion',  type: 'area',            title: 'Evolución de Ventas', dataSource: '/api/dashboard/historico',  dataKey: 'ventas',          visible: true,  order: 1, size: 'full', color: '#00d4ff', isDefault: false },
  { id: 'panel_ventas',     type: 'ventas_panel',    title: 'Panel de Ventas',     dataSource: '/api/dashboard/ventas',     dataKey: 'totalMes',        visible: true,  order: 2, size: 'full', color: '#7c3aed', isDefault: false },
  { id: 'panel_clientes',   type: 'clientes_panel',  title: 'Panel de Clientes',   dataSource: '/api/dashboard/clientes',   dataKey: 'clientesActivos', visible: true,  order: 3, size: 'full', color: '#10b981', isDefault: false },
  { id: 'panel_prospectos', type: 'prospectos_panel', title: 'Prospectos',         dataSource: '/api/dashboard/prospectos', dataKey: 'contactos',       visible: false, order: 4, size: 'full', color: '#f59e0b', isDefault: false },
];

export function useOverviewLayout() {
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS.map(w => ({ ...w, createdAt: new Date().toISOString() })));
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // Cargar layout del servidor al montar
  useEffect(() => {
    fetchAuth(`${BASE}/dashboard/layout`)
      .then(res => {
        const remote = res?.widgets;
        if (Array.isArray(remote) && remote.length > 0) {
          setWidgets(remote);
        }
        // Si no hay layout guardado, usar defaults (ya esta en el estado inicial)
      })
      .catch(() => {
        // Sin conexion o error: usar defaults silenciosamente
      })
      .finally(() => setLoaded(true));
  }, []);

  // Guardar en DB cada vez que cambian los widgets (debounced 800ms)
  useEffect(() => {
    if (!loaded) return; // no guardar hasta haber cargado
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetchAuth(`${BASE}/dashboard/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets }),
      }).catch(() => {
        // Guardar fallo silenciosamente - no interrumpir UX
      });
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [widgets, loaded]);

  const visibleWidgets = widgets
    .filter(w => w.visible)
    .sort((a, b) => a.order - b.order)
    .map(w => w.id);

  const removeWidget = (id) =>
    setWidgets(ws => ws.map(w => w.id === id ? { ...w, visible: false } : w));

  const restoreWidget = (id) =>
    setWidgets(ws => ws.map(w => w.id === id ? { ...w, visible: true } : w));

  const reorderWidgets = (orderedIds) =>
    setWidgets(ws => {
      const map = new Map(ws.map(w => [w.id, w]));
      return orderedIds.map((id, idx) => {
        const w = map.get(id);
        return w ? { ...w, order: idx } : null;
      }).filter(Boolean);
    });

  const addWidget = (config) => {
    const newWidget = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      visible: true,
      order: widgets.length,
      isDefault: false,
      ...config,
    };
    setWidgets(ws => [...ws, newWidget]);
    return newWidget;
  };

  const deleteWidget = (id) =>
    setWidgets(ws => ws.filter(w => w.id !== id));

  const resetLayout = () =>
    setWidgets(DEFAULT_WIDGETS.map(w => ({ ...w, createdAt: new Date().toISOString() })));

  return {
    widgets,
    visibleWidgets,
    loaded,
    removeWidget,
    restoreWidget,
    reorderWidgets,
    addWidget,
    deleteWidget,
    resetLayout,
  };
}

export { DEFAULT_WIDGETS };



