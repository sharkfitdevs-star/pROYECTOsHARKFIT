import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// default widgets currently present in the Overview
// NOTE: the dashboard component filters by widget id (`visibleWidgets.includes('kpi_block')`),
// therefore each default must specify a stable `id` string.  We also store
// additional metadata on the defaults so they can be used directly when
// initialising or resetting the layout without further mapping.
const DEFAULT_WIDGETS = [
  { id: 'kpi_block',        type: 'kpi_block',       title: 'KPIs Principales',      dataSource: '/api/dashboard/overview',   dataKey: '',               visible: true, order: 0, size: 'full', color: '#00d4ff', isDefault: true },
  { id: 'chart_evolucion',  type: 'area',             title: 'Evolución de Ventas',   dataSource: '/api/dashboard/historico',  dataKey: 'ventas',         visible: true, order: 1, size: 'full', color: '#00d4ff', isDefault: false },
  { id: 'panel_ventas',     type: 'ventas_panel',     title: 'Panel de Ventas',       dataSource: '/api/dashboard/ventas',     dataKey: 'totalMes',       visible: true, order: 2, size: 'full', color: '#7c3aed', isDefault: false },
  { id: 'panel_clientes',   type: 'clientes_panel',   title: 'Panel de Clientes',     dataSource: '/api/dashboard/clientes',   dataKey: 'clientesActivos', visible: true, order: 3, size: 'full', color: '#10b981', isDefault: false },
  { id: 'panel_prospectos', type: 'prospectos_panel', title: 'Prospectos',            dataSource: '/api/dashboard/prospectos', dataKey: 'contactos',      visible: false, order: 4, size: 'full', color: '#f59e0b', isDefault: false },
];

/**
 * @typedef {Object} WidgetConfig
 * @property {string} id
 * @property {string} type
 * @property {string} title
 * @property {string} dataSource
 * @property {string} dataKey
 * @property {boolean} visible
 * @property {number} order
 * @property {string} size
 * @property {string} color
 * @property {string} createdAt
 * @property {boolean} isDefault
 */

const STORAGE_KEY = 'sharkfit_overview_layout';

export function useOverviewLayout() {
  const [widgets, setWidgets] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse overview layout from localStorage', e);
    }
    // no stored layout, return copies of the default configuration
    // including a fresh timestamp
    return DEFAULT_WIDGETS.map(w => ({ ...w, createdAt: new Date().toISOString() }));
  });

  // derive visibleWidgets
  // return an array of widget ids that are currently visible. callers rely
  // on this being a list of strings (ids) so they can do
  // `visibleWidgets.includes('chart_evolucion')` etc.
  const visibleWidgets = widgets.filter(w => w.visible).map(w => w.id);

  // persist whenever widgets change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.warn('Failed to save overview layout to localStorage', e);
    }
  }, [widgets]);

  const removeWidget = (id) => {
    setWidgets(ws =>
      ws.map(w => (w.id === id ? { ...w, visible: false } : w))
    );
  };

  const restoreWidget = (id) => {
    setWidgets(ws =>
      ws.map(w => (w.id === id ? { ...w, visible: true } : w))
    );
  };

  const reorderWidgets = (orderedIds) => {
    setWidgets(ws => {
      const map = new Map(ws.map(w => [w.id, w]));
      return orderedIds
        .map((id, idx) => {
          const w = map.get(id);
          if (w) return { ...w, order: idx };
          return null;
        })
        .filter(Boolean);
    });
  };

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

  const resetLayout = () => {
    localStorage.removeItem(STORAGE_KEY);
    // reload the defaults directly (with new timestamps)
    setWidgets(DEFAULT_WIDGETS.map(w => ({ ...w, createdAt: new Date().toISOString() })));
  };

  return {
    widgets,
    visibleWidgets,
    removeWidget,
    restoreWidget,
    reorderWidgets,
    addWidget,
    resetLayout,
  };
}

export { DEFAULT_WIDGETS };



