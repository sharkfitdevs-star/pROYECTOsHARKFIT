/* ──────────────────────────────────────────────────────────────
   kpiAlertasService.js — Motor KPI Sharkfit
   Calcula 4 KPIs por SEDE × MES × AÑO
   Triggers: EventBus (auto) + Cron 07:00 (diario) + manual
────────────────────────────────────────────────────────────── */
'use strict';

const UMBRALES = {
  tasa_agendamiento:     { alto: 30, normal: 20, label: 'Tasa de Agendamiento' },
  conversion_venta:      { alto: 25, normal: 15, label: 'Conversión de Venta' },
  tasa_asistencia:       { alto: 70, normal: 60, label: 'Tasa de Asistencia' },
  conversion_asistentes: { alto: 70, normal: 55, label: 'Conversión de Asistentes' },
};

const ESTADOS_ASISTIO = ['Asistió'];
const TIPOS_COMPRA = ['Promesa de compra', 'Venta online', 'Venta Online'];

function clasificar(kpi, valor) {
  const u = UMBRALES[kpi];
  if (valor >= u.alto)   return 'alto';
  if (valor >= u.normal) return 'normal';
  return 'bajo';
}

function getPeriodoActual(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = fecha.getMonth();
  return {
    desde:  new Date(y, m, 1, 0, 0, 0),
    hasta:  new Date(y, m + 1, 0, 23, 59, 59),
    key:    `${y}-${String(m + 1).padStart(2, '0')}`,
    label:  `${fecha.toLocaleString('es-CL', { month: 'long' })} ${y}`,
    year:   y,
    month:  m + 1,
  };
}

function buildMensaje(kpi, valor, clas, branchName, periodo) {
  const pct = valor.toFixed(1);
  const msgs = {
    tasa_agendamiento: {
      title: `Escasez de leads — Agendamiento ${pct}% · ${branchName} · ${periodo.label}`,
      description: `Tasa de agendamiento ${pct}% (${clas}). Umbrales: Alto >30%, Normal 20-29%, Bajo <20%. Sede: ${branchName}.`,
      suggestedActions: ['Revisar campañas de captación de leads','Verificar proceso de contacto inicial','Analizar costo por lead'],
    },
    conversion_venta: {
      title: `Baja conversión de venta: ${pct}% · ${branchName} · ${periodo.label}`,
      description: `Conversión leads→ventas ${pct}% (${clas}). Umbrales: Alto >25%, Normal 15-25%, Bajo <15%. Sede: ${branchName}.`,
      suggestedActions: ['Revisar argumentario de ventas','Analizar objeciones frecuentes','Verificar seguimiento post-contacto'],
    },
    tasa_asistencia: {
      title: `Baja tasa de asistencia: ${pct}% · ${branchName} · ${periodo.label}`,
      description: `Tasa de asistencia ${pct}% (${clas}). Umbrales: Alto >70%, Normal 60-70%, Muy Bajo <60%. Sede: ${branchName}.`,
      suggestedActions: ['Reforzar confirmación por WhatsApp','Revisar recordatorio 24h antes','Analizar no-shows por asesor'],
    },
    conversion_asistentes: {
      title: `Baja conversión de asistentes: ${pct}% · ${branchName} · ${periodo.label}`,
      description: `Conversión asistentes→ventas ${pct}% (${clas}). Umbrales: Alto >70%, Normal 55-70%, Muy Bajo <55%. Sede: ${branchName}.`,
      suggestedActions: ['Revisar presentación de planes en sala','Capacitar asesores en cierre','Verificar disponibilidad de planes'],
    },
  };
  return msgs[kpi] || { title: `KPI ${kpi}: ${pct}%`, description: '', suggestedActions: [] };
}

async function calcularYGenerarAlertas(opts = {}) {
  const Venta  = require('../models/Venta');
  const Cliente = require('../models/Cliente');
  const Alerta = require('../models/Alerta');

  const periodo = getPeriodoActual(opts.desde || new Date());
  const desde   = opts.desde ? new Date(opts.desde) : periodo.desde;
  const hasta   = opts.hasta ? new Date(opts.hasta)  : periodo.hasta;

  const filtroBase = { saleDate: { $gte: desde, $lte: hasta } };
  if (opts.idMember) filtroBase.idMember = opts.idMember;

  const clienteFiltroBase = {};
  if (opts.idMember) clienteFiltroBase.idMember = opts.idMember;

  const sedesFiltro = opts.idBranch
    ? [{ _id: opts.idBranch, branchName: opts.idBranch }]
    : await Venta.aggregate([
        { $match: filtroBase },
        { $group: { _id: { $ifNull: ["$idBranch", "$branchName"] }, branchName: { $first: '$branchName' } } },
        { $sort: { _id: 1 } },
      ]);

  const resumen = {
    periodo: { desde, hasta, key: periodo.key, label: periodo.label },
    sedes: [], alertasCreadas: [], alertasOmitidas: [], errores: [],
  };

  const [ventasBaseCount, clientesBaseCount] = await Promise.all([
    Venta.countDocuments(filtroBase),
    Cliente.countDocuments(clienteFiltroBase),
  ]);

  if (ventasBaseCount === 0 || clientesBaseCount === 0) {
    const cleanupFilter = {
      type: 'kpi_rendimiento',
      status: { $in: ['pendiente', 'en_proceso'] },
    };
    if (opts.idMember) cleanupFilter.idMember = opts.idMember;

    const cleanupResult = await Alerta.deleteMany(cleanupFilter);
    resumen.alertasOmitidas.push({
      razon: 'Sin datos base de ventas/clientes para calcular KPI',
      ventasBaseCount,
      clientesBaseCount,
      eliminadasPorObsoletas: cleanupResult.deletedCount || 0,
    });
    return resumen;
  }

  for (const sede of sedesFiltro) {
    const idBranch   = sede._id;
    const branchName = sede.branchName || idBranch || 'Sede desconocida';
    const filtroSede = { ...filtroBase, idBranch };

    try {
      const [totalLeads, totalAsistieron, totalCompraron] = await Promise.all([
        Venta.countDocuments(filtroSede),
        Venta.countDocuments({ ...filtroSede, paymentStatus: { $in: ESTADOS_ASISTIO } }),
        Venta.countDocuments({ ...filtroSede, saleType: { $in: TIPOS_COMPRA } }),
      ]);

      const kpis = {
        tasa_agendamiento:     totalLeads      > 0 ? (totalAsistieron / totalLeads)      * 100 : null,
        conversion_venta:      totalLeads      > 0 ? (totalCompraron  / totalLeads)      * 100 : null,
        tasa_asistencia:       totalLeads      > 0 ? (totalAsistieron / totalLeads)      * 100 : null,
        conversion_asistentes: totalAsistieron > 0 ? (totalCompraron  / totalAsistieron) * 100 : null,
      };

      const sedeRes = { idBranch, branchName, conteos: { totalLeads, totalAsistieron, totalCompraron }, kpis, alertasCreadas: [], alertasOmitidas: [] };

      for (const [kpi, valor] of Object.entries(kpis)) {
        if (valor === null) { sedeRes.alertasOmitidas.push({ kpi, razon: 'Sin datos' }); continue; }
        const clas = clasificar(kpi, valor);
        if (clas !== 'bajo') { sedeRes.alertasOmitidas.push({ kpi, clas, valor, razon: 'KPI aceptable' }); continue; }

        const idAlert = `kpi_${kpi}_${idBranch}_${periodo.key}`;
        const yaExiste = await Alerta.findOne({ idAlert, status: { $in: ['pendiente', 'en_proceso'] } });

        if (yaExiste && !opts.forzar) {
          await Alerta.updateOne({ idAlert }, { $set: { 'alertData.customData.valorActual': valor, updatedAt: new Date() } });
          sedeRes.alertasOmitidas.push({ kpi, razon: 'Ya existe (valor actualizado)' });
          continue;
        }
        if (yaExiste && opts.forzar) await Alerta.updateOne({ idAlert }, { $set: { status: 'descartada' } });

        const { title, description, suggestedActions } = buildMensaje(kpi, valor, clas, branchName, periodo);
        await new Alerta({
          idAlert, type: 'kpi_rendimiento', priority: 'alta', status: 'pendiente',
          title, description, suggestedActions, idBranch, branchName,
          ...(opts.idMember ? { idMember: opts.idMember } : {}),
          automatic: true, source: 'kpi_engine',
          alertData: {
            customData: { kpi, kpiLabel: UMBRALES[kpi].label, valorActual: valor, clasificacion: clas, umbrales: UMBRALES[kpi], conteos: sedeRes.conteos, periodo: { desde, hasta, label: periodo.label } },
          },
          expiresAt: new Date(periodo.year, periodo.month, 15),
        }).save();

        sedeRes.alertasCreadas.push({ kpi, valor, clas, idAlert, branchName });
        resumen.alertasCreadas.push({ kpi, valor, clas, idAlert, branchName });
      }

      resumen.sedes.push(sedeRes);
      sedeRes.alertasOmitidas.forEach(o => resumen.alertasOmitidas.push({ ...o, branchName }));
    } catch (err) {
      resumen.errores.push({ idBranch, branchName, error: err.message });
    }
  }
  return resumen;
}

let _eventosRegistrados = false;
function registrarEventListeners() {
  if (_eventosRegistrados) return;
  try {
    const EventBus = require('../events/EventBus');
    const trigger = async (event) => {
      try {
        const r = await calcularYGenerarAlertas();
        console.log(`[KPI-Engine] Trigger ${event.type} → ${r.alertasCreadas.length} alertas creadas`);
      } catch (err) {
        console.error('[KPI-Engine] Error trigger:', err.message);
      }
    };
    EventBus.subscribe('sync.completed', trigger);
    EventBus.subscribe('file.processed', trigger);
    _eventosRegistrados = true;
    console.log('[KPI-Engine] EventBus listeners registrados.');
  } catch (err) {
    console.warn('[KPI-Engine] EventBus no disponible:', err.message);
  }
}

let _cronIniciado = false;
function initCron() {
  registrarEventListeners();
  if (_cronIniciado) return;
  try {
    const cron = require('node-cron');
    cron.schedule('0 7 * * *', async () => {
      console.log('[KPI-Cron] Cálculo automático iniciando…');
      try {
        const r = await calcularYGenerarAlertas();
        console.log(`[KPI-Cron] OK — ${r.alertasCreadas.length} alertas en ${r.sedes.length} sede(s)`);
      } catch (err) {
        console.error('[KPI-Cron] Error:', err.message);
      }
    });
    _cronIniciado = true;
    console.log('[KPI-Cron] Cron diario 07:00 registrado.');
  } catch (err) {
    console.warn('[KPI-Cron] node-cron no disponible. Ejecutar: npm install node-cron');
  }
}

module.exports = { calcularYGenerarAlertas, initCron, registrarEventListeners, UMBRALES, clasificar, getPeriodoActual };
