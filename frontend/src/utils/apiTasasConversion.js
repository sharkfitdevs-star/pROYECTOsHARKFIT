/**
 * Calcula tasas de conversión del embudo comercial
 * @param {Object} filtros - Filtros opcionales { fecha_inicio, fecha_fin, sede }
 * @returns {Object} Tasas de agendamiento, asistencia y conversión
 */

// Datos de ejemplo para demo
const generarDatosEjemplo = () => ({
  leads: [
    { id: 1, fecha: '2025-02-01', sede: { nombre_sede: 'Sede Principal' }, leads_totales: 150 },
    { id: 2, fecha: '2025-02-02', sede: { nombre_sede: 'Sede Secundaria' }, leads_totales: 120 },
    { id: 3, fecha: '2025-02-03', sede: { nombre_sede: 'Sede Principal' }, leads_totales: 180 }
  ],
  prospectos: [
    { id: 1, fecha_ingreso: '2025-02-01', sede: { nombre_sede: 'Sede Principal' }, nombre: 'Prospecto 1' },
    { id: 2, fecha_ingreso: '2025-02-02', sede: { nombre_sede: 'Sede Secundaria' }, nombre: 'Prospecto 2' },
    { id: 3, fecha_ingreso: '2025-02-03', sede: { nombre_sede: 'Sede Principal' }, nombre: 'Prospecto 3' }
  ],
  agendamientos: [
    { id: 1, fecha_hora: '2025-02-01', sede: { nombre_sede: 'Sede Principal' }, resultado_asistencia: 'Asistió' },
    { id: 2, fecha_hora: '2025-02-02', sede: { nombre_sede: 'Sede Secundaria' }, resultado_asistencia: 'No asistió' },
    { id: 3, fecha_hora: '2025-02-03', sede: { nombre_sede: 'Sede Principal' }, resultado_asistencia: 'Asistió' }
  ],
  ventas: [
    { id: 1, fecha_venta: '2025-02-01', sede: { nombre_sede: 'Sede Principal' } },
    { id: 2, fecha_venta: '2025-02-03', sede: { nombre_sede: 'Sede Principal' } }
  ]
});

export async function obtenerTasasConversion(filtros = {}) {
  try {
    const { fecha_inicio, fecha_fin, sede } = filtros;
    const datos = generarDatosEjemplo();

    // 1. Obtener total de leads
    let leads = datos.leads;
    
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

    // 2. Obtener prospectos agendados (usando fecha_ingreso)
    let prospectos = datos.prospectos;
    
    if (sede) {
      prospectos = prospectos.filter(p => p.sede?.nombre_sede === sede);
    }
    if (fecha_inicio) {
      prospectos = prospectos.filter(p => new Date(p.fecha_ingreso) >= new Date(fecha_inicio));
    }
    if (fecha_fin) {
      prospectos = prospectos.filter(p => new Date(p.fecha_ingreso) <= new Date(fecha_fin));
    }

    const totalAgendados = prospectos.length;

    // 3. Obtener agendamientos que asistieron
    let agendamientos = datos.agendamientos;
    
    if (sede) {
      agendamientos = agendamientos.filter(a => a.sede?.nombre_sede === sede);
    }
    if (fecha_inicio) {
      agendamientos = agendamientos.filter(a => new Date(a.fecha_hora) >= new Date(fecha_inicio));
    }
    if (fecha_fin) {
      agendamientos = agendamientos.filter(a => new Date(a.fecha_hora) <= new Date(fecha_fin));
    }

    const totalAsistieron = agendamientos.filter(a => a.resultado_asistencia === 'Asistió').length;

    // 4. Obtener ventas cerradas
    let ventas = datos.ventas;
    
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

    // Calcular tasas
    const tasaAgendamiento = totalLeads > 0 ? ((totalAgendados / totalLeads) * 100).toFixed(2) : 0;
    const tasaAsistencia = totalAgendados > 0 ? ((totalAsistieron / totalAgendados) * 100).toFixed(2) : 0;
    const tasaConversion = totalAsistieron > 0 ? ((totalVentas / totalAsistieron) * 100).toFixed(2) : 0;
    const tasaGlobal = totalLeads > 0 ? ((totalVentas / totalLeads) * 100).toFixed(2) : 0;

    return {
      success: true,
      filtros_aplicados: {
        fecha_inicio: fecha_inicio || 'Sin filtro',
        fecha_fin: fecha_fin || 'Sin filtro',
        sede: sede || 'Todas las sedes'
      },
      embudo: {
        total_leads: totalLeads,
        total_agendados: totalAgendados,
        total_asistieron: totalAsistieron,
        total_ventas: totalVentas
      },
      tasas: {
        tasa_agendamiento_porcentaje: parseFloat(tasaAgendamiento),
        tasa_asistencia_porcentaje: parseFloat(tasaAsistencia),
        tasa_conversion_porcentaje: parseFloat(tasaConversion),
        tasa_global_porcentaje: parseFloat(tasaGlobal)
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error en obtenerTasasConversion:', error);
    return {
      success: false,
      error: 'Error al obtener tasas de conversión',
      detalle: error.message
    };
  }
}