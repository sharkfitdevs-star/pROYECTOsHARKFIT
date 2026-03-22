const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const DashboardWidget = require('../models/DashboardWidget');
const UserDashboardConfig = require('../models/UserDashboardConfig');
const DashboardService = require('../services/DashboardService');

// ============================================================================
// CATÁLOGOS
// ============================================================================

router.get('/catalogos', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: DashboardWidget.getCatalogo()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// WIDGETS DISPONIBLES
// ============================================================================

router.get('/disponibles', requireAuth, async (req, res) => {
  try {
    const { rol } = req.query;
    const rolUsuario = rol || req.user.role;
    
    const widgets = await DashboardWidget.getWidgetsPorRol(rolUsuario);
    
    res.json({
      success: true,
      data: widgets,
      total: widgets.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/todos', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { categoria, tipo, activo } = req.query;
    const query = {};
    
    if (categoria) query.categoria = categoria;
    if (tipo) query.tipo = tipo;
    if (activo !== undefined) query.activo = activo === 'true';
    
    const widgets = await DashboardWidget.find(query).sort({ categoria: 1, orden_default: 1 });
    
    res.json({
      success: true,
      data: widgets,
      total: widgets.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CRUD WIDGETS (Solo admin)
// ============================================================================

router.post('/', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const widget = new DashboardWidget(req.body);
    await widget.save();
    
    res.status(201).json({
      success: true,
      data: widget,
      message: 'Widget creado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const widget = await DashboardWidget.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!widget) {
      return res.status(404).json({ success: false, error: 'Widget no encontrado' });
    }
    
    res.json({
      success: true,
      data: widget,
      message: 'Widget actualizado'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    await DashboardWidget.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Widget eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CONFIGURACIÓN DE USUARIO
// ============================================================================

router.get('/mi-config', requireAuth, async (req, res) => {
  try {
    const config = await UserDashboardConfig.getOrCreateDefault(
      req.user.id,
      req.user.role,
      req.user.sede
    );
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/mi-config', requireAuth, async (req, res) => {
  try {
    let config = await UserDashboardConfig.findOne({
      usuario: req.user.id,
      activo: true,
      es_default: true
    });
    
    if (!config) {
      config = await UserDashboardConfig.getOrCreateDefault(
        req.user.id,
        req.user.role,
        req.user.sede
      );
    }
    
    const camposActualizables = ['nombre_dashboard', 'layout', 'tema', 'auto_refresh', 'refresh_interval', 'filtros_globales'];
    
    camposActualizables.forEach(campo => {
      if (req.body[campo] !== undefined) {
        config[campo] = req.body[campo];
      }
    });
    
    config.ultima_modificacion = new Date();
    await config.save();
    
    res.json({
      success: true,
      data: config,
      message: 'Configuración actualizada'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/mi-config/layout', requireAuth, async (req, res) => {
  try {
    const { layout } = req.body;
    
    let config = await UserDashboardConfig.findOne({
      usuario: req.user.id,
      activo: true,
      es_default: true
    });
    
    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    }
    
    await config.actualizarLayout(layout);
    
    res.json({
      success: true,
      data: config,
      message: 'Layout actualizado'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/mi-config/widget', requireAuth, async (req, res) => {
  try {
    const { widgetId, posicion } = req.body;
    
    let config = await UserDashboardConfig.findOne({
      usuario: req.user.id,
      activo: true,
      es_default: true
    });
    
    if (!config) {
      config = await UserDashboardConfig.getOrCreateDefault(
        req.user.id,
        req.user.role,
        req.user.sede
      );
    }
    
    await config.agregarWidget(widgetId, posicion);
    
    res.json({
      success: true,
      data: config,
      message: 'Widget agregado al dashboard'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/mi-config/widget/:instanceId', requireAuth, async (req, res) => {
  try {
    const config = await UserDashboardConfig.findOne({
      usuario: req.user.id,
      activo: true,
      es_default: true
    });
    
    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    }
    
    await config.quitarWidget(req.params.instanceId);
    
    res.json({
      success: true,
      message: 'Widget removido del dashboard'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/mi-config/reset', requireAuth, async (req, res) => {
  try {
    await UserDashboardConfig.deleteMany({
      usuario: req.user.id
    });
    
    const config = await UserDashboardConfig.getOrCreateDefault(
      req.user.id,
      req.user.role,
      req.user.sede
    );
    
    res.json({
      success: true,
      data: config,
      message: 'Dashboard reseteado a configuración por defecto'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DATOS DE WIDGETS
// ============================================================================

router.get('/data/:codigo', requireAuth, async (req, res) => {
  try {
    const { codigo } = req.params;
    const { sede, fechaInicio, fechaFin } = req.query;
    
    const data = await DashboardService.getWidgetData(
      codigo,
      { sede, fechaInicio, fechaFin },
      req.user
    );
    
    res.json({
      success: true,
      data,
      widget: codigo,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/data/batch', requireAuth, async (req, res) => {
  try {
    const { widgets, sede, fechaInicio, fechaFin } = req.body;
    
    const results = await Promise.all(
      widgets.map(async (codigo) => {
        const data = await DashboardService.getWidgetData(
          codigo,
          { sede, fechaInicio, fechaFin },
          req.user
        );
        return { codigo, data };
      })
    );
    
    const dataMap = {};
    results.forEach(r => { dataMap[r.codigo] = r.data; });
    
    res.json({
      success: true,
      data: dataMap,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RUTA BATCH AGREGADA ====================
router.post('/batch', requireAuth, async (req, res) => {
  try {
    const { widgets, sede, fechaInicio, fechaFin } = req.body;
    const results = await Promise.all(
      widgets.map(async (codigo) => {
        const data = await DashboardService.getWidgetData(
          codigo,
          { sede, fechaInicio, fechaFin },
          req.user
        );
        return { codigo, data };
      })
    );
    const dataMap = {};
    results.forEach(r => { dataMap[r.codigo] = r.data; });
    res.json({
      success: true,
      data: dataMap,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SEED WIDGETS INICIALES
// ============================================================================

router.post('/seed', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const widgetsExistentes = await DashboardWidget.countDocuments();
    
    if (widgetsExistentes > 0 && !req.query.force) {
      return res.json({
        success: false,
        message: 'Ya existen widgets. Usa ?force=true para sobrescribir'
      });
    }
    
    if (req.query.force) {
      await DashboardWidget.deleteMany({});
    }
    
    const widgetsBase = [
      {
        codigo: 'VENTAS_HOY',
        nombre: 'Ventas de Hoy',
        descripcion: 'Total de ventas del día actual',
        tipo: 'kpi',
        categoria: 'ventas',
        icono: 'bi-cash-stack',
        color: '#10b981',
        roles_permitidos: ['owner', 'admin', 'manager', 'vendedor'],
        config_default: { width: 1, height: 1 },
        orden_default: 1
      },
      {
        codigo: 'VENTAS_MES',
        nombre: 'Ventas del Mes',
        descripcion: 'Total de ventas del mes actual',
        tipo: 'kpi',
        categoria: 'ventas',
        icono: 'bi-graph-up-arrow',
        color: '#10b981',
        roles_permitidos: ['owner', 'admin', 'manager'],
        config_default: { width: 1, height: 1 },
        orden_default: 2
      },
      {
        codigo: 'CLIENTES_ACTIVOS',
        nombre: 'Clientes Activos',
        descripcion: 'Total de clientes con membresía activa',
        tipo: 'kpi',
        categoria: 'clientes',
        icono: 'bi-people',
        color: '#3b82f6',
        roles_permitidos: ['owner', 'admin', 'manager', 'vendedor', 'recepcionista'],
        config_default: { width: 1, height: 1 },
        orden_default: 3
      },
      {
        codigo: 'CLIENTES_NUEVOS',
        nombre: 'Clientes Nuevos',
        descripcion: 'Clientes registrados en el período',
        tipo: 'kpi',
        categoria: 'clientes',
        icono: 'bi-person-plus',
        color: '#8b5cf6',
        roles_permitidos: ['owner', 'admin', 'manager', 'vendedor'],
        config_default: { width: 1, height: 1 },
        orden_default: 4
      },
      {
        codigo: 'TASA_CONVERSION',
        nombre: 'Tasa de Conversión',
        descripcion: 'Porcentaje de prospectos convertidos',
        tipo: 'kpi',
        categoria: 'ventas',
        icono: 'bi-percent',
        color: '#f59e0b',
        roles_permitidos: ['owner', 'admin', 'manager'],
        config_default: { width: 1, height: 1 },
        orden_default: 5
      },
      {
        codigo: 'ALERTAS_ACTIVAS',
        nombre: 'Alertas Activas',
        descripcion: 'Alertas pendientes de atención',
        tipo: 'alerts',
        categoria: 'sistema',
        icono: 'bi-bell',
        color: '#ef4444',
        roles_permitidos: ['owner', 'admin', 'manager', 'recepcionista'],
        config_default: { width: 1, height: 2 },
        orden_default: 6
      },
      {
        codigo: 'TAREAS_PENDIENTES',
        nombre: 'Tareas Pendientes',
        descripcion: 'Tareas asignadas sin completar',
        tipo: 'list',
        categoria: 'operaciones',
        icono: 'bi-list-check',
        color: '#6366f1',
        roles_permitidos: ['owner', 'admin', 'manager', 'staff'],
        config_default: { width: 1, height: 2 },
        orden_default: 7
      },
      {
        codigo: 'CHECKINS_HOY',
        nombre: 'Check-ins de Hoy',
        descripcion: 'Asistencias registradas hoy',
        tipo: 'kpi',
        categoria: 'operaciones',
        icono: 'bi-box-arrow-in-right',
        color: '#14b8a6',
        roles_permitidos: ['owner', 'admin', 'manager', 'recepcionista'],
        config_default: { width: 1, height: 1 },
        orden_default: 8
      },
      {
        codigo: 'MEMBRESIAS_POR_VENCER',
        nombre: 'Membresías por Vencer',
        descripcion: 'Membresías próximas a vencer',
        tipo: 'list',
        categoria: 'clientes',
        icono: 'bi-calendar-x',
        color: '#f97316',
        roles_permitidos: ['owner', 'admin', 'manager', 'recepcionista', 'vendedor'],
        config_default: { width: 1, height: 2 },
        orden_default: 9
      },
      {
        codigo: 'STOCK_BAJO',
        nombre: 'Stock Bajo',
        descripcion: 'Productos con inventario bajo',
        tipo: 'list',
        categoria: 'inventario',
        icono: 'bi-exclamation-triangle',
        color: '#ef4444',
        roles_permitidos: ['owner', 'admin', 'manager'],
        config_default: { width: 1, height: 2 },
        orden_default: 10
      },
      {
        codigo: 'GRAFICO_VENTAS',
        nombre: 'Gráfico de Ventas',
        descripcion: 'Tendencia de ventas en el tiempo',
        tipo: 'chart',
        categoria: 'ventas',
        icono: 'bi-graph-up',
        color: '#10b981',
        roles_permitidos: ['owner', 'admin', 'manager', 'viewer'],
        config_default: { width: 2, height: 2 },
        orden_default: 11
      },
      {
        codigo: 'RANKING_SEDES',
        nombre: 'Ranking de Sedes',
        descripcion: 'Comparativa de rendimiento por sede',
        tipo: 'table',
        categoria: 'ventas',
        icono: 'bi-trophy',
        color: '#f59e0b',
        roles_permitidos: ['owner', 'admin'],
        config_default: { width: 2, height: 2 },
        orden_default: 12
      },
      {
        codigo: 'RANKING_VENDEDORES',
        nombre: 'Top Vendedores',
        descripcion: 'Mejores vendedores del período',
        tipo: 'table',
        categoria: 'ventas',
        icono: 'bi-award',
        color: '#8b5cf6',
        roles_permitidos: ['owner', 'admin', 'manager'],
        config_default: { width: 2, height: 2 },
        orden_default: 13
      },
      {
        codigo: 'COLABORADORES_ACTIVOS',
        nombre: 'Colaboradores Activos',
        descripcion: 'Personal activo actualmente',
        tipo: 'kpi',
        categoria: 'rrhh',
        icono: 'bi-person-badge',
        color: '#06b6d4',
        roles_permitidos: ['owner', 'admin', 'manager'],
        config_default: { width: 1, height: 1 },
        orden_default: 14
      },
      {
        codigo: 'MIS_CLASES_HOY',
        nombre: 'Mis Clases de Hoy',
        descripcion: 'Clases programadas para hoy',
        tipo: 'list',
        categoria: 'operaciones',
        icono: 'bi-calendar-event',
        color: '#ec4899',
        roles_permitidos: ['instructor'],
        config_default: { width: 2, height: 2 },
        orden_default: 15
      },
      {
        codigo: 'MI_RENDIMIENTO',
        nombre: 'Mi Rendimiento',
        descripcion: 'Progreso hacia metas personales',
        tipo: 'progress',
        categoria: 'ventas',
        icono: 'bi-speedometer',
        color: '#10b981',
        roles_permitidos: ['vendedor', 'instructor'],
        config_default: { width: 2, height: 1 },
        orden_default: 16
      },
      {
        codigo: 'ACCIONES_RAPIDAS',
        nombre: 'Acciones Rápidas',
        descripcion: 'Accesos directos según tu rol',
        tipo: 'quick_actions',
        categoria: 'sistema',
        icono: 'bi-lightning',
        color: '#6366f1',
        roles_permitidos: ['owner', 'admin', 'manager', 'vendedor', 'recepcionista', 'instructor', 'staff'],
        config_default: { width: 1, height: 1 },
        orden_default: 17
      },
      {
        codigo: 'INGRESOS_TOTALES',
        nombre: 'Ingresos Totales',
        descripcion: 'Ingresos del período seleccionado',
        tipo: 'kpi',
        categoria: 'finanzas',
        icono: 'bi-currency-dollar',
        color: '#10b981',
        roles_permitidos: ['owner', 'admin'],
        config_default: { width: 1, height: 1 },
        orden_default: 18
      },
      {
        codigo: 'RESUMEN_INVENTARIO',
        nombre: 'Resumen Inventario',
        descripcion: 'Estado general del inventario',
        tipo: 'kpi',
        categoria: 'inventario',
        icono: 'bi-boxes',
        color: '#8b5cf6',
        roles_permitidos: ['owner', 'admin', 'manager'],
        config_default: { width: 1, height: 1 },
        orden_default: 19
      }
    ];
    
    await DashboardWidget.insertMany(widgetsBase);
    
    res.json({
      success: true,
      message: `${widgetsBase.length} widgets creados exitosamente`,
      data: { total: widgetsBase.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
