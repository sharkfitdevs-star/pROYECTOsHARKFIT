import { Leads_Diarios } from '@/entities/Leads_Diarios';
import { Agendamientos } from '@/entities/Agendamientos';
import { Ventas } from '@/entities/Ventas';
import { Prospectos } from '@/entities/Prospectos';

/**
 * Calcula métricas comerciales agregadas del negocio
 * @param {Object} filtros - Filtros opcionales { fecha_inicio, fecha_fin, sede }
 * @returns {Object} Métricas comerciales agregadas y evolución mensual
 */
export async function obtenerMetricasComerciales(filtros = {}) {
  try {
    const { fecha_inicio, fecha_fin, sede } = filtros;

    // 1. Obtener leads
    let leads = await Leads_Diarios.list('-fecha');
    
    if (sede) {
      leads = leads.filter(l => l.sede?.nombre_sede === sede);
    }
    if (fecha_inicio) {
      leads = leads.filter(l => new Date(l.fecha) >= new Date(fecha_inicio));
    }
    if (fecha_fin) {
      leads = leads.filter(l => new Date(l.fecha) <= new Date(fecha_fin));
    }

    const totalLeads = leads.reduce((sum, l) => sum + (l.leads_totales || 0), 0);

    // 2. Obtener agendamientos
    let agendamientos = await Agendamientos.list('-fecha_hora');
    
    if (sede) {
      agendamientos = agendamientos.filter(a => a.sede?.nombre_sede === sede);
    }
    if (fecha_inicio) {
      agendamientos = agendamientos.filter(a => new Date(a.fecha_hora) >= new Date(fecha_inicio));
    }
    if (fecha_fin) {
      agendamientos = agendamientos.filter(a => new Date(a.fecha_hora) <= new Date(fecha_fin));
    }

    const totalAgendamientos = agendamientos.length;
    const totalAsistieron = agendamientos.filter(a => a.resultado_asistencia === 'Asistió').length;
    const totalNoAsistieron = agendamientos.filter(a => a.resultado_asistencia === 'No asistió').length;
    const totalPendientes = agendamientos.filter(a => a.resultado_asistencia === 'Pendiente').length;

    // 3. Obtener ventas
    let ventas = await Ventas.list('-fecha_venta');
    
    if (sede) {
      ventas = ventas.filter(v => v.sede?.nombre_sede === sede);
    }
    if (fecha_inicio) {
      ventas = ventas.filter(v => new Date(v.fecha_venta) >= new Date(fecha_inicio));
    }
    if (fecha_fin) {
      ventas = ventas.filter(v => new Date(v.fecha_venta) <= new Date(fecha_fin));
    }

    const totalVentas = ventas.length;
    const ventasOnline = ventas.filter(v => v.tipo_venta === 'Online').length;
    const ventasEnSede = ventas.filter(v => v.tipo_venta === 'En sede').length;
    const montoTotal = ventas.reduce((sum, v) => sum + (v.monto || 0), 0);
    const ticketPromedio = totalVentas > 0 ? (montoTotal / totalVentas).toFixed(0) : 0;

    // 4. Evolución mensual (últimos 6 meses)
    const evolucionMensual = {};
    const hoy = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mesKey = fecha.toISOString().slice(0, 7); // YYYY-MM
      evolucionMensual[mesKey] = {
        leads: 0,
        agendamientos: 0,
        ventas: 0,
        monto: 0
      };
    }

    // Agrupar leads por mes
    leads.forEach(lead => {
      const mesKey = lead.fecha.slice(0, 7);
      if (evolucionMensual[mesKey]) {
        evolucionMensual[mesKey].leads += lead.leads_totales || 0;
      }
    });

    // Agrupar agendamientos por mes
    agendamientos.forEach(agendamiento => {
      const mesKey = agendamiento.fecha_hora.slice(0, 7);
      if (evolucionMensual[mesKey]) {
        evolucionMensual[mesKey].agendamientos++;
      }
    });

    // Agrupar ventas por mes
    ventas.forEach(venta => {
      const mesKey = venta.fecha_venta.slice(0, 7);
      if (evolucionMensual[mesKey]) {
        evolucionMensual[mesKey].ventas++;
        evolucionMensual[mesKey].monto += venta.monto || 0;
      }
    });

    // 5. Desglose por sede (si no hay filtro de sede)
    let desglosePorSede = null;
    if (!sede) {
      const sedesMap = new Map();
      
      leads.forEach(lead => {
        const nombreSede = lead.sede?.nombre_sede || 'Sin sede';
        if (!sedesMap.has(nombreSede)) {
          sedesMap.set(nombreSede, { leads: 0, agendamientos: 0, ventas: 0, monto: 0 });
        }
        sedesMap.get(nombreSede).leads += lead.leads_totales || 0;
      });

      agendamientos.forEach(agendamiento => {
        const nombreSede = agendamiento.sede?.nombre_sede || 'Sin sede';
        if (!sedesMap.has(nombreSede)) {
          sedesMap.set(nombreSede, { leads: 0, agendamientos: 0, ventas: 0, monto: 0 });
        }
        sedesMap.get(nombreSede).agendamientos++;
      });

      ventas.forEach(venta => {
        const nombreSede = venta.sede?.nombre_sede || 'Sin sede';
        if (!sedesMap.has(nombreSede)) {
          sedesMap.set(nombreSede, { leads: 0, agendamientos: 0, ventas: 0, monto: 0 });
        }
        sedesMap.get(nombreSede).ventas++;
        sedesMap.get(nombreSede).monto += venta.monto || 0;
      });

      desglosePorSede = Object.fromEntries(sedesMap);
    }

    return {
      success: true,
      filtros_aplicados: {
        fecha_inicio: fecha_inicio || 'Sin filtro',
        fecha_fin: fecha_fin || 'Sin filtro',
        sede: sede || 'Todas las sedes'
      },
      metricas_generales: {
        total_leads: totalLeads,
        total_agendamientos: totalAgendamientos,
        total_asistieron: totalAsistieron,
        total_no_asistieron: totalNoAsistieron,
        total_pendientes: totalPendientes,
        total_ventas: totalVentas,
        ventas_online: ventasOnline,
        ventas_en_sede: ventasEnSede,
        monto_total_ventas: montoTotal,
        ticket_promedio: parseFloat(ticketPromedio)
      },
      evolucion_mensual: evolucionMensual,
      desglose_por_sede: desglosePorSede,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error en obtenerMetricasComerciales:', error);
    return {
      success: false,
      error: 'Error al obtener métricas comerciales',
      detalle: error.message
    };
  }
}