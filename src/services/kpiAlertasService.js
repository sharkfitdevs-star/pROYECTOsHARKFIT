/**
 * KPI ALERTAS SERVICE - Motor con datos reales de colección ventas
 */
const { v4: uuidv4 } = require('uuid');

const UMBRALES = {
  tasa_agendamiento:     { alto: 30, normal: 20 },
  conversion_venta:      { alto: 25, normal: 15 },
  tasa_asistencia:       { alto: 70, normal: 60 },
  conversion_asistentes: { alto: 70, normal: 55 },
};

// Valores reales detectados en BD
const ESTADOS_ASISTIO  = ['Asistió', 'Compromiso de compra', 'Gestionado'];
const TIPOS_COMPRA     = ['Promesa de compra', 'Venta Online', 'Venta online'];

function clasificar(kpi, valor) {
  const u = UMBRALES[kpi];
  if (valor >= u.alto)   return 'alto';
  if (valor >= u.normal) return 'normal';
  return 'bajo';
}

function prioridadDesdeClasificacion(clas) {
  if (clas === 'bajo') return 'alta';
  if (clas === 'normal') return 'media';
  return 'baja';
}

function buildMensaje(kpi, valor, clas) {
  const pct = valor.toFixed(1);
  const msgs = {
    tasa_agendamiento: {
      title: `Escasez de leads — Tasa de agendamiento: ${pct}%`,
      description: `Nivel "${clas}" (${pct}%). Umbral: Alto ≥30%, Normal 20-29%, Bajo <20%. Revisar captación de leads.`,
    },
    conversion_venta: {
      title: `Baja conversión de venta: ${pct}%`,
      description: `Nivel "${clas}" (${pct}%). Umbral: Alto ≥25%, Normal 15-25%, Bajo <15%. Revisar proceso de cierre.`,
    },
    tasa_asistencia: {
      title: `Tasa de asistencia: ${pct}%`,
      description: `Nivel "${clas}" (${pct}%). Umbral: Alto ≥70%, Normal 60-70%, Bajo <60%. Reforzar recordatorios.`,
    },
    conversion_asistentes: {
      title: `Baja conversión de asistentes: ${pct}%`,
      description: `Nivel "${clas}" (${pct}%). Umbral: Alto ≥70%, Normal 55-70%, Bajo <55%. Mejorar cierre en sede.`,
    },
  };
  return msgs[kpi] || { title: `KPI ${kpi}: ${pct}%`, description: '' };
}

async function calcularYGenerarAlertas(opts = {}) {
  const Venta  = require('../models/Venta');
  const Alerta = require('../models/Alerta');

  const ahora = new Date();
  // Por defecto: últimos 90 días para capturar datos históricos
  const desde = opts.desde || new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);
  const hasta = opts.hasta || ahora;

  const filtroBase = { saleDate: { $gte: desde, $lte: hasta } };

  const [totalLeads, totalAsistieron, totalCompraron] = await Promise.all([
    Venta.countDocuments(filtroBase),
    Venta.countDocuments({ ...filtroBase, paymentStatus: { $in: ESTADOS_ASISTIO } }),
    Venta.countDocuments({ ...filtroBase, saleType: { $in: TIPOS_COMPRA } }),
  ]);

  // Tasa agendamiento: asistieron / totalLeads
  // Tasa asistencia: misma métrica (todos son leads agendados)
  // Conversión venta: compraron / totalLeads
  // Conversión asistentes: compraron / asistieron
  const kpis = {
    tasa_agendamiento:     totalLeads      > 0 ? (totalAsistieron / totalLeads)      * 100 : null,
    conversion_venta:      totalLeads      > 0 ? (totalCompraron  / totalLeads)      * 100 : null,
    tasa_asistencia:       totalLeads      > 0 ? (totalAsistieron / totalLeads)      * 100 : null,
    conversion_asistentes: totalAsistieron > 0 ? (totalCompraron  / totalAsistieron) * 100 : null,
  };

  const resumen = {
    periodo: { desde, hasta },
    conteos: { totalLeads, totalAsistieron, totalCompraron },
    kpis,
    alertasCreadas: [],
    alertasOmitidas: [],
  };

  const mesKey = `${desde.getFullYear()}-${String(desde.getMonth()+1).padStart(2,'0')}`;

  for (const [kpi, valor] of Object.entries(kpis)) {
    if (valor === null) {
      resumen.alertasOmitidas.push({ kpi, razon: 'Sin datos suficientes' });
      continue;
    }

    const clas = clasificar(kpi, valor);
    if (clas !== 'bajo') {
      resumen.alertasOmitidas.push({ kpi, clas, valor, razon: 'KPI en nivel aceptable' });
      continue;
    }

    const idAlert = `kpi_${kpi}_${mesKey}`;
    const yaExiste = await Alerta.findOne({ idAlert, status: { $in: ['pendiente','en_proceso'] } });

    if (yaExiste) {
      await Alerta.updateOne({ idAlert }, { $set: { 'alertData.customData.valorActual': valor, updatedAt: new Date() } });
      resumen.alertasOmitidas.push({ kpi, razon: 'Alerta activa ya existe (actualizada)' });
      continue;
    }

    const { title, description } = buildMensaje(kpi, valor, clas);
    const prioridad = prioridadDesdeClasificacion(clas);

    await new Alerta({
      idAlert,
      type: 'kpi_rendimiento',
      priority: prioridad,
      status: 'pendiente',
      title,
      description,
      automatic: true,
      source: 'kpi_engine',
      alertData: {
        customData: { kpi, valorActual: valor, clasificacion: clas, periodo: { desde, hasta }, conteos: resumen.conteos }
      },
      suggestedActions: accionesSugeridas(kpi),
      expiresAt: new Date(hasta.getFullYear(), hasta.getMonth() + 2, 1),
    }).save();

    resumen.alertasCreadas.push({ kpi, valor, clas, prioridad, idAlert });
  }

  return resumen;
}

function accionesSugeridas(kpi) {
  return {
    tasa_agendamiento:     ['Revisar campañas publicitarias','Aumentar inversión en leads','Revisar proceso de contacto inicial'],
    conversion_venta:      ['Capacitar equipo de ventas','Revisar propuesta de valor','Analizar objeciones frecuentes'],
    tasa_asistencia:       ['Reforzar recordatorios','Llamar a confirmación 24h antes','Revisar horarios de ausentismo'],
    conversion_asistentes: ['Mejorar experiencia en sede','Revisar presentación de planes','Ofrecer promoción primera visita'],
  }[kpi] || [];
}

module.exports = { calcularYGenerarAlertas, UMBRALES, clasificar };
