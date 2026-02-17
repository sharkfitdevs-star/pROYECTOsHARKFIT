/**
 * Calcula métricas de clientes únicos desde Ventas
 * @param {Object} filtros - Filtros opcionales { fecha_inicio, fecha_fin, sede }
 * @returns {Object} Métricas de clientes y clientes nuevos por mes
 */

// Datos de ejemplo para demo
const generarDatosVentas = () => [
  {
    id: 1,
    fecha_venta: '2025-02-01',
    monto: 5000,
    sede: { nombre_sede: 'Sede Principal' },
    prospecto: { nombre: 'Cliente 1', whatsapp: '+34612345678' },
    plan: { nombre_plan: 'Plan Premium', tipo_item: 'Plan' },
    fecha_fin_plan: '2025-08-01'
  },
  {
    id: 2,
    fecha_venta: '2025-02-02',
    monto: 3000,
    sede: { nombre_sede: 'Sede Secundaria' },
    prospecto: { nombre: 'Cliente 2', whatsapp: '+34687654321' },
    plan: { nombre_plan: 'Plan Basic', tipo_item: 'Plan' },
    fecha_fin_plan: '2025-05-02'
  },
  {
    id: 3,
    fecha_venta: '2025-01-15',
    monto: 4500,
    sede: { nombre_sede: 'Sede Principal' },
    prospecto: { nombre: 'Cliente 1', whatsapp: '+34612345678' },
    plan: { nombre_plan: 'Plan Premium', tipo_item: 'Plan' },
    fecha_fin_plan: '2024-12-15'
  }
];

export async function obtenerMetricasClientes(filtros = {}) {
  try {
    const { fecha_inicio, fecha_fin, sede } = filtros;

    // Obtener todas las ventas
    const todasVentas = generarDatosVentas();
    
    // Filtrar solo ventas de Plan/Programa
    const ventasPlanPrograma = todasVentas.filter(v => {
      const tipo = v.plan?.tipo_item || '';
      return tipo === 'Plan' || tipo === 'Programa';
    });

    // Agrupar por whatsapp único
    const clientesMap = new Map();
    
    for (const venta of ventasPlanPrograma) {
      const whatsapp = venta.prospecto?.whatsapp;
      if (!whatsapp) continue;

      // Aplicar filtro de sede si existe
      if (sede && venta.sede?.nombre_sede !== sede) continue;

      if (!clientesMap.has(whatsapp)) {
        clientesMap.set(whatsapp, {
          whatsapp,
          nombre: venta.prospecto?.nombre || 'Sin nombre',
          sede: venta.sede?.nombre_sede || 'Sin sede',
          primera_compra: venta.fecha_venta,
          ultima_compra: venta.fecha_venta,
          total_compras: 1,
          monto_total: venta.monto || 0,
          plan_actual: venta.plan?.nombre_plan,
          fecha_fin_plan: venta.fecha_fin_plan,
          activo: venta.fecha_fin_plan ? new Date(venta.fecha_fin_plan) >= new Date() : false
        });
      } else {
        const cliente = clientesMap.get(whatsapp);
        cliente.total_compras++;
        cliente.monto_total += venta.monto || 0;
        
        // Actualizar primera y última compra
        if (new Date(venta.fecha_venta) < new Date(cliente.primera_compra)) {
          cliente.primera_compra = venta.fecha_venta;
        }
        if (new Date(venta.fecha_venta) > new Date(cliente.ultima_compra)) {
          cliente.ultima_compra = venta.fecha_venta;
          cliente.plan_actual = venta.plan?.nombre_plan;
          cliente.fecha_fin_plan = venta.fecha_fin_plan;
          cliente.activo = venta.fecha_fin_plan ? new Date(venta.fecha_fin_plan) >= new Date() : false;
        }
      }
    }

    let clientes = Array.from(clientesMap.values());

    // Aplicar filtro de fecha si existe (basado en primera_compra)
    if (fecha_inicio) {
      clientes = clientes.filter(c => new Date(c.primera_compra) >= new Date(fecha_inicio));
    }
    if (fecha_fin) {
      clientes = clientes.filter(c => new Date(c.primera_compra) <= new Date(fecha_fin));
    }

    // Calcular métricas
    const totalClientes = clientes.length;
    const clientesActivos = clientes.filter(c => c.activo).length;
    const clientesInactivos = totalClientes - clientesActivos;
    const clientesConRenovacion = clientes.filter(c => c.total_compras > 1).length;
    const tasaRenovacion = totalClientes > 0 ? ((clientesConRenovacion / totalClientes) * 100).toFixed(2) : 0;
    const montoTotal = clientes.reduce((sum, c) => sum + c.monto_total, 0);
    const ticketPromedio = totalClientes > 0 ? (montoTotal / totalClientes).toFixed(0) : 0;

    // Clientes nuevos por mes (últimos 6 meses)
    const clientesPorMes = {};
    const hoy = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mesKey = fecha.toISOString().slice(0, 7); // YYYY-MM
      clientesPorMes[mesKey] = 0;
    }

    clientes.forEach(cliente => {
      const mesKey = cliente.primera_compra.slice(0, 7);
      if (clientesPorMes.hasOwnProperty(mesKey)) {
        clientesPorMes[mesKey]++;
      }
    });

    return {
      success: true,
      filtros_aplicados: {
        fecha_inicio: fecha_inicio || 'Sin filtro',
        fecha_fin: fecha_fin || 'Sin filtro',
        sede: sede || 'Todas las sedes'
      },
      metricas: {
        total_clientes: totalClientes,
        clientes_activos: clientesActivos,
        clientes_inactivos: clientesInactivos,
        clientes_con_renovacion: clientesConRenovacion,
        tasa_renovacion_porcentaje: parseFloat(tasaRenovacion),
        monto_total_ventas: montoTotal,
        ticket_promedio: parseFloat(ticketPromedio)
      },
      clientes_nuevos_por_mes: clientesPorMes,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error en obtenerMetricasClientes:', error);
    return {
      success: false,
      error: 'Error al obtener métricas de clientes',
      detalle: error.message
    };
  }
}