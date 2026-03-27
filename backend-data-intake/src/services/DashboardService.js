const mongoose = require('mongoose');

class DashboardService {
  
  // ============================================================================
  // OBTENER DATOS POR WIDGET
  // ============================================================================

  static async getWidgetData(widgetCodigo, params = {}, usuario = {}) {
    const { sede, fechaInicio, fechaFin } = params;
    
    const dataHandlers = {
      'VENTAS_HOY': () => this.getVentasHoy(sede),
      'VENTAS_MES': () => this.getVentasMes(sede, fechaInicio, fechaFin),
      'CLIENTES_ACTIVOS': () => this.getClientesActivos(sede),
      'CLIENTES_NUEVOS': () => this.getClientesNuevos(sede, fechaInicio, fechaFin),
      'TASA_CONVERSION': () => this.getTasaConversion(sede, fechaInicio, fechaFin),
      'TAREAS_PENDIENTES': () => this.getTareasPendientes(usuario.id, sede),
      'ALERTAS_ACTIVAS': () => this.getAlertasActivas(usuario.id, sede),
      'CHECKINS_HOY': () => this.getCheckinsHoy(sede),
      'MEMBRESIAS_POR_VENCER': () => this.getMembresiasPorVencer(sede),
      'STOCK_BAJO': () => this.getStockBajo(sede),
      'RANKING_SEDES': () => this.getRankingSedes(fechaInicio, fechaFin),
      'RANKING_VENDEDORES': () => this.getRankingVendedores(sede, fechaInicio, fechaFin),
      'GRAFICO_VENTAS': () => this.getGraficoVentas(sede, fechaInicio, fechaFin),
      'GRAFICO_CLIENTES': () => this.getGraficoClientes(sede, fechaInicio, fechaFin),
      'COLABORADORES_ACTIVOS': () => this.getColaboradoresActivos(sede),
      'MIS_CLASES_HOY': () => this.getMisClasesHoy(usuario.id),
      'MI_RENDIMIENTO': () => this.getMiRendimiento(usuario.id, fechaInicio, fechaFin),
      'ACCIONES_RAPIDAS': () => this.getAccionesRapidas(usuario.role),
      'RESUMEN_INVENTARIO': () => this.getResumenInventario(sede),
      'INGRESOS_TOTALES': () => this.getIngresosTotales(fechaInicio, fechaFin)
    };

    const handler = dataHandlers[widgetCodigo];
    if (!handler) {
      return { error: 'Widget no soportado', codigo: widgetCodigo };
    }

    try {
      return await handler();
    } catch (error) {
      console.error(`Error en widget ${widgetCodigo}:`, error);
      return { error: error.message, codigo: widgetCodigo };
    }
  }

  // ============================================================================
  // HANDLERS DE DATOS
  // ============================================================================

  static async getVentasHoy(sedeId) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const Venta = mongoose.model('Venta');
    const query = { saleDate: { $gte: hoy } };
    if (sedeId) query.idBranch = sedeId;

    const ventas = await Venta.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, cantidad: { $sum: 1 } } }
    ]);

    return {
      valor: ventas[0]?.total || 0,
      cantidad: ventas[0]?.cantidad || 0,
      formato: 'currency',
      tendencia: await this.calcularTendencia('ventas', sedeId)
    };
  }

  static async getVentasMes(sedeId, fechaInicio, fechaFin) {
    const inicio = fechaInicio ? new Date(fechaInicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    const Venta = mongoose.model('Venta');
    const query = { saleDate: { $gte: inicio, $lte: fin } };
    if (sedeId) query.idBranch = sedeId;

    const ventas = await Venta.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, cantidad: { $sum: 1 } } }
    ]);

    const mesAnterior = await this.getVentasMesAnterior(sedeId);

    return {
      valor: ventas[0]?.total || 0,
      cantidad: ventas[0]?.cantidad || 0,
      formato: 'currency',
      comparacion: {
        valor_anterior: mesAnterior,
        porcentaje: mesAnterior > 0 ? (((ventas[0]?.total || 0) - mesAnterior) / mesAnterior * 100).toFixed(1) : 0
      }
    };
  }

  static async getVentasMesAnterior(sedeId) {
    const inicioMesAnterior = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const finMesAnterior = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

    const Venta = mongoose.model('Venta');
    const query = { saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior } };
    if (sedeId) query.idBranch = sedeId;

    const ventas = await Venta.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    return ventas[0]?.total || 0;
  }

  static async getClientesActivos(sedeId) {
    const Cliente = mongoose.model('Cliente');
    const query = { active: true };
    if (sedeId) query.idBranch = sedeId;

    const total = await Cliente.countDocuments(query);
    
    return {
      valor: total,
      formato: 'number',
      icono: 'bi-people'
    };
  }

  static async getClientesNuevos(sedeId, fechaInicio, fechaFin) {
    const inicio = fechaInicio ? new Date(fechaInicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    const Cliente = mongoose.model('Cliente');
    const query = { createdAt: { $gte: inicio, $lte: fin } };
    if (sedeId) query.idBranch = sedeId;

    const total = await Cliente.countDocuments(query);

    return {
      valor: total,
      formato: 'number',
      label: 'nuevos este período'
    };
  }

  static async getTasaConversion(sedeId, fechaInicio, fechaFin) {
    return {
      valor: 0,
      formato: 'percentage',
      label: 'tasa de conversión'
    };
  }

  static async getTareasPendientes(usuarioId, sedeId) {
    return {
      valor: 0,
      items: [],
      formato: 'number'
    };
  }

  static async getAlertasActivas(usuarioId, sedeId) {
    const Alerta = mongoose.model('Alerta');
    
    const alertas = await Alerta.find({
      status: { $in: ['pendiente', 'en_proceso'] },
      ...(sedeId && { idBranch: sedeId })
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(10)
    .lean();

    return {
      valor: alertas.length,
      items: alertas.map(a => ({
        id: a._id,
        titulo: a.title,
        prioridad: a.priority,
        fecha: a.createdAt
      })),
      formato: 'number'
    };
  }

  static async getCheckinsHoy(sedeId) {
    return {
      valor: 0,
      formato: 'number',
      label: 'check-ins hoy'
    };
  }

  static async getMembresiasPorVencer(sedeId) {
    return {
      valor: 0,
      items: [],
      formato: 'number'
    };
  }

  static async getStockBajo(sedeId) {
    const Inventario = mongoose.model('Inventario');
    
    const items = await Inventario.find({
      $expr: { $lte: ['$cantidad_actual', '$stock_minimo'] },
      ...(sedeId && { idBranch: sedeId })
    })
    .populate('producto', 'nombre sku')
    .limit(10)
    .lean();

    return {
      valor: items.length,
      items: items.map(i => ({
        producto: i.producto?.nombre,
        actual: i.cantidad_actual,
        minimo: i.stock_minimo
      })),
      formato: 'number',
      alerta: items.length > 0
    };
  }

  static async getRankingSedes(fechaInicio, fechaFin) {
    return {
      items: [],
      formato: 'ranking'
    };
  }

  static async getRankingVendedores(sedeId, fechaInicio, fechaFin) {
    return {
      items: [],
      formato: 'ranking'
    };
  }

  static async getGraficoVentas(sedeId, fechaInicio, fechaFin) {
    const inicio = fechaInicio ? new Date(fechaInicio) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    const Venta = mongoose.model('Venta');
    const query = { saleDate: { $gte: inicio, $lte: fin } };
    if (sedeId) query.idBranch = sedeId;

    const datos = await Venta.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } },
          total: { $sum: '$totalAmount' },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      tipo: 'line',
      labels: datos.map(d => d._id),
      datasets: [{
        label: 'Ventas',
        data: datos.map(d => d.total)
      }]
    };
  }

  static async getGraficoClientes(sedeId, fechaInicio, fechaFin) {
    return {
      tipo: 'bar',
      labels: [],
      datasets: []
    };
  }

  static async getColaboradoresActivos(sedeId) {
    const Colaborador = mongoose.model('Colaborador');
    const query = { estado: 'activo' };
    if (sedeId) query.idBranch = sedeId;

    const total = await Colaborador.countDocuments(query);

    return {
      valor: total,
      formato: 'number',
      icono: 'bi-person-badge'
    };
  }

  static async getMisClasesHoy(instructorId) {
    return {
      valor: 0,
      items: [],
      formato: 'list'
    };
  }

  static async getMiRendimiento(usuarioId, fechaInicio, fechaFin) {
    return {
      metas: [],
      cumplimiento: 0,
      formato: 'progress'
    };
  }

  static async getAccionesRapidas(rol) {
    const accionesPorRol = {
      owner: [
        { label: 'Ver reportes', icon: 'bi-graph-up', path: '/dashboard/reportes' },
        { label: 'Gestionar usuarios', icon: 'bi-people', path: '/dashboard/usuarios' },
        { label: 'Configuración', icon: 'bi-gear', path: '/dashboard/configuracion' }
      ],
      admin: [
        { label: 'Nuevo cliente', icon: 'bi-person-plus', path: '/dashboard/clientes/nuevo' },
        { label: 'Ver alertas', icon: 'bi-bell', path: '/dashboard/alertas' },
        { label: 'Importar datos', icon: 'bi-upload', path: '/dashboard/importar' }
      ],
      manager: [
        { label: 'Mi equipo', icon: 'bi-people', path: '/dashboard/colaboradores' },
        { label: 'Inventario', icon: 'bi-box', path: '/inventario/stock' },
        { label: 'Reportes sede', icon: 'bi-graph-up', path: '/dashboard/reportes' }
      ],
      vendedor: [
        { label: 'Nueva venta', icon: 'bi-cart-plus', path: '/dashboard/ventas/nueva' },
        { label: 'Mis clientes', icon: 'bi-people', path: '/dashboard/clientes' },
        { label: 'Mis metas', icon: 'bi-trophy', path: '/dashboard/metas' }
      ],
      recepcionista: [
        { label: 'Check-in', icon: 'bi-box-arrow-in-right', path: '/dashboard/checkin' },
        { label: 'Agenda', icon: 'bi-calendar', path: '/dashboard/agenda' },
        { label: 'Clientes', icon: 'bi-people', path: '/dashboard/clientes' }
      ],
      instructor: [
        { label: 'Mis clases', icon: 'bi-calendar-event', path: '/dashboard/clases' },
        { label: 'Alumnos', icon: 'bi-people', path: '/dashboard/alumnos' },
        { label: 'Horarios', icon: 'bi-clock', path: '/dashboard/horarios' }
      ]
    };

    return {
      items: accionesPorRol[rol] || accionesPorRol.admin,
      formato: 'actions'
    };
  }

  static async getResumenInventario(sedeId) {
    const Inventario = mongoose.model('Inventario');
    
    const stats = await Inventario.aggregate([
      ...(sedeId ? [{ $match: { sede: mongoose.Types.ObjectId(sedeId) } }] : []),
      {
        $group: {
          _id: null,
          total_productos: { $sum: 1 },
          stock_bajo: {
            $sum: { $cond: [{ $lte: ['$cantidad_actual', '$stock_minimo'] }, 1, 0] }
          },
          valor_total: { $sum: { $multiply: ['$cantidad_actual', '$costo_unitario'] } }
        }
      }
    ]);

    return {
      total_productos: stats[0]?.total_productos || 0,
      stock_bajo: stats[0]?.stock_bajo || 0,
      valor_total: stats[0]?.valor_total || 0,
      formato: 'summary'
    };
  }

  static async getIngresosTotales(fechaInicio, fechaFin) {
    const inicio = fechaInicio ? new Date(fechaInicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    const Venta = mongoose.model('Venta');
    
    const result = await Venta.aggregate([
      { $match: { fecha: { $gte: inicio, $lte: fin } } },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);

    return {
      valor: result[0]?.total || 0,
      formato: 'currency',
      periodo: { inicio, fin }
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  static async calcularTendencia(tipo, sedeId) {
    return { direccion: 'up', porcentaje: 0 };
  }

  // ============================================================================
  // WIDGETS DEFAULT POR ROL
  // ============================================================================

  static getWidgetsDefaultPorRol(rol) {
    const widgetsPorRol = {
      owner: ['VENTAS_MES', 'CLIENTES_ACTIVOS', 'INGRESOS_TOTALES', 'ALERTAS_ACTIVAS', 'RANKING_SEDES', 'GRAFICO_VENTAS', 'RANKING_VENDEDORES', 'ACCIONES_RAPIDAS'],
      admin: ['VENTAS_HOY', 'CLIENTES_ACTIVOS', 'TAREAS_PENDIENTES', 'ALERTAS_ACTIVAS', 'COLABORADORES_ACTIVOS', 'STOCK_BAJO', 'ACCIONES_RAPIDAS'],
      manager: ['VENTAS_HOY', 'CLIENTES_ACTIVOS', 'COLABORADORES_ACTIVOS', 'STOCK_BAJO', 'CHECKINS_HOY', 'ACCIONES_RAPIDAS'],
      vendedor: ['VENTAS_HOY', 'MI_RENDIMIENTO', 'CLIENTES_NUEVOS', 'ACCIONES_RAPIDAS'],
      recepcionista: ['CHECKINS_HOY', 'MEMBRESIAS_POR_VENCER', 'ALERTAS_ACTIVAS', 'ACCIONES_RAPIDAS'],
      instructor: ['MIS_CLASES_HOY', 'ACCIONES_RAPIDAS'],
      staff: ['TAREAS_PENDIENTES', 'ALERTAS_ACTIVAS', 'ACCIONES_RAPIDAS'],
      viewer: ['VENTAS_MES', 'CLIENTES_ACTIVOS', 'GRAFICO_VENTAS']
    };

    return widgetsPorRol[rol] || widgetsPorRol.staff;
  }
}

module.exports = DashboardService;
