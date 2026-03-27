const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ExportRun = require('../models/ExportRun');
const ExportRunner = require('../services/ExportRunner');
const { logger } = require('../utils/logger');

/**
 * @swagger
 * /dashboard/bi-query:
 *   get:
 *     summary: Consulta BI flexible sobre ventas, clientes o colaboradores
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *           enum: [ventas, clientes, colaboradores]
 *         required: true
 *         description: Entidad a consultar
 *       - in: query
 *         name: fieldX
 *         schema:
 *           type: string
 *         required: true
 *         description: Campo X para agrupación
 *       - in: query
 *         name: fieldY
 *         schema:
 *           type: string
 *         required: false
 *         description: Campo Y para agregación (opcional)
 *       - in: query
 *         name: aggregation
 *         schema:
 *           type: string
 *           enum: [count, sum, avg, min, max]
 *         required: false
 *         description: Tipo de agregación (default: count)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *         required: false
 *         description: Agrupación temporal (si aplica)
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Fecha inicial (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Fecha final (YYYY-MM-DD)
 *       - in: query
 *         name: filterField
 *         schema:
 *           type: string
 *         required: false
 *         description: Campo para filtrar
 *       - in: query
 *         name: filterValue
 *         schema:
 *           type: string
 *         required: false
 *         description: Valor para filtrar
 *     responses:
 *       200:
 *         description: Resultados de la consulta BI
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     labels:
 *                       type: array
 *                       items: { type: string }
 *                     values:
 *                       type: array
 *                       items: { type: number }
 *                     meta:
 *                       type: object
 *       400:
 *         description: Parámetros inválidos
 *       403:
 *         description: No autorizado
 *       500:
 *         description: Error interno
 */
// ── GET /api/dashboard/bi-query ─────────────────────────────────────────────
router.get('/bi-query', requireAuth, async (req, res) => {
  try {
    const { entity, fieldX, fieldY, aggregation = 'count', groupBy = 'month', dateFrom, dateTo, filterField, filterValue } = req.query;
    const role = (req.user?.role || '').toLowerCase();
    if (!['owner', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    let Model, whitelist;
    if (entity === 'ventas') {
      Model = require('../models/Venta');
      whitelist = ['saleDate','totalAmount','amount','saleType','paymentStatus','branchName','planName','productName','source','dueDate','paidDate'];
    } else if (entity === 'clientes') {
      Model = require('../models/Cliente');
      whitelist = ['registrationDate','status','sex','membershipStatus','planName','branchName','source','planValue','membershipStartDate','membershipEndDate','active'];
    } else if (entity === 'colaboradores') {
      try {
        Model = require('../models/Colaborador');
        whitelist = ['sueldo','departamento','cargo','estado','sede'];
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Modelo Colaborador no implementado' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Entidad no soportada' });
    }

    if (!fieldX || !whitelist.includes(fieldX)) {
      return res.status(400).json({ success: false, error: 'Campo X no permitido' });
    }
    if (fieldY && fieldY !== '_count' && !whitelist.includes(fieldY)) {
      return res.status(400).json({ success: false, error: 'Campo Y no permitido' });
    }

    const match = {};
    if (dateFrom || dateTo) {
      let dateField = fieldX;
      if (!/date/i.test(fieldX)) dateField = whitelist.find(f => /date/i.test(f));
      if (dateField) {
        match[dateField] = {};
        if (dateFrom) match[dateField].$gte = new Date(dateFrom);
        if (dateTo) match[dateField].$lte = new Date(dateTo);
      }
    }
    if (filterField && filterValue && whitelist.includes(filterField)) {
      match[filterField] = filterValue;
    }

    let groupId = null;
    let isDateGroup = false;
    if (['day','week','month','quarter','year'].includes(groupBy) && /date/i.test(fieldX)) {
      isDateGroup = true;
      const dateExpr = '$' + fieldX;
      if (groupBy === 'day') {
        groupId = { year: { $year: dateExpr }, month: { $month: dateExpr }, day: { $dayOfMonth: dateExpr } };
      } else if (groupBy === 'week') {
        groupId = { year: { $year: dateExpr }, week: { $isoWeek: dateExpr } };
      } else if (groupBy === 'month') {
        groupId = { year: { $year: dateExpr }, month: { $month: dateExpr } };
      } else if (groupBy === 'quarter') {
        groupId = { year: { $year: dateExpr }, quarter: { $ceil: { $divide: [{ $month: dateExpr }, 3] } } };
      } else if (groupBy === 'year') {
        groupId = { year: { $year: dateExpr } };
      }
    } else {
      groupId = '$' + fieldX;
    }

    const groupStage = { _id: groupId };
    if (fieldY === '_count' || aggregation === 'count') {
      groupStage.value = { $sum: 1 };
    } else {
      const aggOps = { sum: { $sum: '$' + fieldY }, avg: { $avg: '$' + fieldY }, min: { $min: '$' + fieldY }, max: { $max: '$' + fieldY } };
      groupStage.value = aggOps[aggregation] || { $sum: 1 };
    }

    const pipeline = [];
    if (Object.keys(match).length) pipeline.push({ $match: match });
    pipeline.push({ $group: groupStage });
    pipeline.push({ $sort: { _id: 1 } });

    const results = await Model.aggregate(pipeline);

    const labels = [];
    const values = [];
    let totalValue = 0;
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    for (const r of results) {
      let label;
      if (isDateGroup && r._id) {
        if (groupBy === 'month') label = meses[(r._id.month||1)-1] + ' ' + String(r._id.year).slice(2);
        else if (groupBy === 'year') label = String(r._id.year);
        else if (groupBy === 'day') label = r._id.day + '/' + r._id.month + '/' + r._id.year;
        else if (groupBy === 'week') label = 'Sem ' + r._id.week + ' ' + String(r._id.year).slice(2);
        else if (groupBy === 'quarter') label = 'Q' + r._id.quarter + ' ' + String(r._id.year).slice(2);
        else label = JSON.stringify(r._id);
      } else {
        label = r._id == null ? 'Sin categoría' : String(r._id);
      }
      labels.push(label);
      values.push(r.value);
      totalValue += typeof r.value === 'number' ? r.value : 0;
    }

    res.json({ success: true, data: { labels, values, meta: { entity, fieldX, fieldY, aggregation, groupBy, totalRecords: results.length, totalValue } } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /dashboard/overview-bi:
 *   get:
 *     summary: KPIs y métricas principales del dashboard BI
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar por sede (opcional)
 *     responses:
 *       200:
 *         description: KPIs y métricas principales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno
 */
// ── GET /api/dashboard/overview-bi ──────────────────────────────────────────
router.get('/overview-bi', requireAuth, async (req, res) => {
  try {
    const Venta = require('../models/Venta');
    const Cliente = require('../models/Cliente');
    let Alerta;
    try { Alerta = require('../models/Alerta'); } catch(e) { Alerta = null; }
    let Colaborador;
    try { Colaborador = require('../models/Colaborador'); } catch(e) { Colaborador = null; }

    const ahora = new Date();
    const role = (req.user?.role || '').toLowerCase();
    const sedeParam = req.query.sede;
    const filtroSede = (sedeParam && sedeParam !== 'Global') ? { branchName: sedeParam } : {};

    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMesActual = ahora;
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      ventasMesAgg, ventasMesAntAgg, ventasMesCount, ventasMesAntCount,
      clientesActivos, clientesTotal, clientesInactivos,
      clientesNuevosMes, clientesNuevosAnt, clientesBajasMes,
      alertasActivasCount, alertasCriticasCount,
      colaboradoresActivosTotal, colaboradoresActivosAnt,
      ingresosMesAgg, ingresosMesAntAgg,
      clientesProspecto, clientesAgendados,
      clientesPorStatusAgg, clientesPorPlanAgg, ventasPorTipoAgg,
      ventasDiariosAgg, clientesDiariosAgg, ingresosDiariosAgg,
      sedesAgg, tendenciaAgg, ultimasAlertasAgg, pagadosMesCount
    ] = await Promise.all([
      Venta.aggregate([{$match:{...filtroSede, saleDate:{$gte:inicioMesActual}}},{$group:{_id:null,monto:{$sum:'$totalAmount'}}}]).catch(()=>[]),
      Venta.aggregate([{$match:{...filtroSede, saleDate:{$gte:inicioMesAnterior,$lte:finMesAnterior}}},{$group:{_id:null,monto:{$sum:'$totalAmount'}}}]).catch(()=>[]),
      Venta.countDocuments({...filtroSede, saleDate:{$gte:inicioMesActual}}).catch(()=>0),
      Venta.countDocuments({...filtroSede, saleDate:{$gte:inicioMesAnterior,$lte:finMesAnterior}}).catch(()=>0),
      Cliente.countDocuments({...filtroSede, status:{$regex:'^activo$',$options:'i'}}).catch(()=>0),
      Cliente.countDocuments({...filtroSede}).catch(()=>0),
      Cliente.countDocuments({...filtroSede, status:{$in:['inactivo','suspendido']}}).catch(()=>0),
      Cliente.countDocuments({...filtroSede, createdAt:{$gte:inicioMesActual}}).catch(()=>0),
      Cliente.countDocuments({...filtroSede, createdAt:{$gte:inicioMesAnterior,$lte:finMesAnterior}}).catch(()=>0),
      Cliente.countDocuments({...filtroSede, status:{$in:['inactivo','suspendido']}, updatedAt:{$gte:inicioMesActual}}).catch(()=>0),
      Alerta ? Alerta.countDocuments({status:{$in:['pendiente','en_proceso']}}).catch(()=>0) : 0,
      Alerta ? Alerta.countDocuments({priority:{$in:['urgente','critica']},status:{$in:['pendiente','en_proceso']}}).catch(()=>0) : 0,
      Colaborador ? Colaborador.countDocuments({estado:{$regex:'^activo$',$options:'i'}}).catch(()=>0) : 0,
      Colaborador ? Colaborador.countDocuments({estado:{$regex:'^activo$',$options:'i'},createdAt:{$gte:inicioMesAnterior,$lte:finMesAnterior}}).catch(()=>0) : 0,
      Venta.aggregate([{$match:{...filtroSede,saleDate:{$gte:inicioMesActual},$or:[{paymentStatus:{$regex:/pagad/i}},{paymentStatus:{$regex:/complet/i}}]}},{$group:{_id:null,monto:{$sum:'$totalAmount'}}}]).catch(()=>[]),
      Venta.aggregate([{$match:{...filtroSede,saleDate:{$gte:inicioMesAnterior,$lte:finMesAnterior},$or:[{paymentStatus:{$regex:/pagad/i}},{paymentStatus:{$regex:/complet/i}}]}},{$group:{_id:null,monto:{$sum:'$totalAmount'}}}]).catch(()=>[]),
      Cliente.countDocuments({...filtroSede, status:'prospecto'}).catch(()=>0),
      Cliente.countDocuments({...filtroSede, membershipStatus:{$regex:/agend/i}}).catch(()=>0),
      Cliente.aggregate([{$match:{...filtroSede}},{$group:{_id:'$status',value:{$sum:1}}}]).catch(()=>[]),
      Cliente.aggregate([{$match:{...filtroSede,planName:{$exists:true,$ne:null,$ne:''}}},{$group:{_id:'$planName',value:{$sum:1}}}]).catch(()=>[]),
      Venta.aggregate([{$match:{...filtroSede}},{$group:{_id:'$saleType',value:{$sum:1}}}]).catch(()=>[]),
      Venta.aggregate([{$match:{...filtroSede,saleDate:{$gte:hace30Dias}}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$saleDate'}},value:{$sum:1}}},{$sort:{_id:1}}]).catch(()=>[]),
      Cliente.aggregate([{$match:{...filtroSede,createdAt:{$gte:hace30Dias}}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt'}},value:{$sum:1}}},{$sort:{_id:1}}]).catch(()=>[]),
      Venta.aggregate([{$match:{...filtroSede,saleDate:{$gte:hace30Dias},$or:[{paymentStatus:{$regex:/pagad/i}},{paymentStatus:{$regex:/complet/i}}]}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$saleDate'}},value:{$sum:'$totalAmount'}}},{$sort:{_id:1}}]).catch(()=>[]),
      Venta.aggregate([{$match:{...filtroSede,branchName:{$exists:true,$ne:''}}},{$group:{_id:'$branchName'}},{$sort:{_id:1}}]).catch(()=>[]),
      Venta.aggregate([{$match:{...filtroSede,saleDate:{$gte:new Date(ahora.getFullYear(),ahora.getMonth()-5,1)}}},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$saleDate'}},monto:{$sum:'$totalAmount'},cantidad:{$sum:1}}},{$sort:{_id:1}}]).catch(()=>[]),
      Alerta ? Alerta.find({}).sort({createdAt:-1}).limit(5).lean().catch(()=>[]) : [],
      Venta.countDocuments({...filtroSede,saleDate:{$gte:inicioMesActual},$or:[{paymentStatus:{$regex:/pagad/i}},{paymentStatus:{$regex:/complet/i}}]}).catch(()=>0)
    ]);

    const montoMes = ventasMesAgg[0]?.monto || 0;
    const montoMesAnt = ventasMesAntAgg[0]?.monto || 0;
    const varMonto = montoMesAnt > 0 ? Math.round((montoMes - montoMesAnt) / montoMesAnt * 1000) / 10 : null;
    const varClientes = clientesNuevosAnt > 0 ? Math.round((clientesNuevosMes - clientesNuevosAnt) / clientesNuevosAnt * 1000) / 10 : null;
    const ingresosMesVal = ingresosMesAgg[0]?.monto || 0;
    const ingresosMesAntVal = ingresosMesAntAgg[0]?.monto || 0;
    const totalLeadsMes = clientesProspecto + ventasMesCount;
    const sedesDisponibles = sedesAgg.map(s => s._id).filter(Boolean);

    const semaforos = [
      { id: 'cobros', nombre: 'Cobros al día', estado: 'verde', valor: 'Al día', detalle: 'Sin cobros pendientes > 30 días' },
      { id: 'membresias', nombre: 'Membresías por vencer', estado: 'verde', valor: 'OK', detalle: 'Sin membresías próximas a vencer' },
      { id: 'inactivos', nombre: 'Clientes inactivos', estado: clientesTotal > 0 && (clientesInactivos/clientesTotal) > 0.15 ? 'rojo' : (clientesInactivos/clientesTotal) > 0.05 ? 'amarillo' : 'verde', valor: clientesTotal > 0 ? Math.round(clientesInactivos/clientesTotal*100) + '%' : '0%', detalle: 'Proporción de inactivos/total' },
      { id: 'contratos', nombre: 'Contratos vigentes', estado: clientesTotal > 0 && (clientesActivos/clientesTotal) > 0.8 ? 'verde' : (clientesActivos/clientesTotal) > 0.6 ? 'amarillo' : 'rojo', valor: clientesTotal > 0 ? Math.round(clientesActivos/clientesTotal*100) + '%' : '100%', detalle: 'Clientes activos/total' },
      { id: 'stock', nombre: 'Stock productos', estado: 'verde', valor: 'OK', detalle: 'Placeholder' }
    ];

    const areasSemaforo = [
      { nombre: 'COMERCIAL', estado: montoMes === 0 ? 'critico' : 'normal', indicadores: [{nombre:'Ventas mes',valor:ventasMesCount},{nombre:'Conversión',valor:(totalLeadsMes>0?Math.round(ventasMesCount/totalLeadsMes*100):0)+'%'},{nombre:'Ticket prom.',valor:ventasMesCount>0?Math.round(montoMes/ventasMesCount):0}] },
      { nombre: 'OPERACIONES', estado: 'normal', indicadores: [{nombre:'Cobros pend.',valor:0},{nombre:'Membr. x vencer',valor:0},{nombre:'Alertas activas',valor:alertasActivasCount}] },
      { nombre: 'RECURSOS HUMANOS', estado: 'normal', indicadores: [{nombre:'Colaboradores',valor:colaboradoresActivosTotal},{nombre:'Eval. pendientes',valor:'—'},{nombre:'Docs pendientes',valor:'—'}] },
      { nombre: 'FORMACIÓN', estado: 'normal', indicadores: [{nombre:'Cursos activos',valor:'—'},{nombre:'Certificaciones',valor:'—'},{nombre:'Alumnos',valor:'—'}] }
    ];

    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const tendencia6Meses = tendenciaAgg.map(t => {
      const parts = (t._id||'').split('-');
      return { mes: MESES[parseInt(parts[1])-1]+' '+String(parts[0]).slice(2), monto: t.monto, cantidad: t.cantidad };
    });

    const movimientos = { incorporaciones: clientesNuevosMes, bajas: clientesBajasMes };

    const buildSparkline = (aggData) => {
      const arr = Array(30).fill(0);
      (aggData||[]).forEach(v => {
        const d1 = new Date(ahora); d1.setHours(0,0,0,0);
        const d2 = new Date(v._id); d2.setHours(0,0,0,0);
        const diff = Math.floor((d1-d2)/(1000*60*60*24));
        if(diff>=0 && diff<30) arr[29-diff] = v.value;
      });
      return arr;
    };

    const isAdmin = ['owner','admin'].includes(role);
    const isStaff = ['owner','admin','staff'].includes(role);

    const accionesMap = {
      owner:[{label:'Registrar venta',icon:'bi-plus-circle',seccion:'ventas'},{label:'Nuevo cliente',icon:'bi-person-plus',seccion:'clients'},{label:'Importar datos',icon:'bi-cloud-upload',seccion:'importar'},{label:'Exportar reporte',icon:'bi-file-earmark-arrow-down',seccion:'exportar'},{label:'Ver alertas',icon:'bi-bell',seccion:'alerts'},{label:'Colaboradores',icon:'bi-people',seccion:'colaboradores'}],
      admin:[{label:'Registrar venta',icon:'bi-plus-circle',seccion:'ventas'},{label:'Nuevo cliente',icon:'bi-person-plus',seccion:'clients'},{label:'Importar datos',icon:'bi-cloud-upload',seccion:'importar'},{label:'Exportar reporte',icon:'bi-file-earmark-arrow-down',seccion:'exportar'}],
      staff:[{label:'Registrar venta',icon:'bi-plus-circle',seccion:'ventas'},{label:'Nuevo cliente',icon:'bi-person-plus',seccion:'clients'}],
      viewer:[{label:'Exportar reporte',icon:'bi-file-earmark-arrow-down',seccion:'exportar'}]
    };

    const data = {
      sedeActiva: sedeParam || 'Global',
      sedes: ['Global', ...sedesDisponibles],
      timestamp: ahora.toISOString(),
      kpis: {
        ventaTotal: { monto: montoMes, cantidad: ventasMesCount, variacion: varMonto },
        clientesActivos: { total: clientesActivos, nuevosEsteMes: clientesNuevosMes, variacion: varClientes },
        clientesNuevos: { total: clientesNuevosMes, detalle: clientesNuevosMes + ' programas vendidos' },
        bajasMes: { total: clientesBajasMes, detalle: clientesBajasMes + ' deserciones' },
        colaboradoresActivos: { total: colaboradoresActivosTotal, variacion: colaboradoresActivosAnt > 0 ? Math.round((colaboradoresActivosTotal-colaboradoresActivosAnt)/colaboradoresActivosAnt*1000)/10 : null },
        ingresosMes: { monto: ingresosMesVal, variacion: ingresosMesAntVal > 0 ? Math.round((ingresosMesVal-ingresosMesAntVal)/ingresosMesAntVal*1000)/10 : null }
      },
      indicadores: isStaff ? [{nombre:'% Agendamiento',valor:0,estado:'rojo'},{nombre:'% Asistencia',valor:100,estado:'verde'},{nombre:'% Conversión',valor:totalLeadsMes>0?Math.round(ventasMesCount/totalLeadsMes*100):0,estado:totalLeadsMes>0&&ventasMesCount/totalLeadsMes>0.3?'verde':'rojo'},{nombre:'% Retención',valor:clientesTotal>0?Math.round(clientesActivos/clientesTotal*100):100,estado:clientesTotal>0&&clientesActivos/clientesTotal>0.85?'verde':'amarillo'}] : [],
      funnel: isStaff ? {leads:0,agendados:0,asistentes:0,conversiones:ventasMesCount,pagados:pagadosMesCount} : null,
      areasSemaforo: isStaff ? areasSemaforo : [],
      semaforos: isStaff ? semaforos : [],
      movimientos: isAdmin ? movimientos : null,
      pendientesUrgentes: isStaff ? {total:alertasActivasCount,criticas:alertasCriticasCount,desglose:[]} : null,
      ultimasAlertas: isStaff ? (ultimasAlertasAgg||[]).map(a=>({_id:a._id,tipo:a.type||a.tipo,severidad:a.priority||a.severidad,mensaje:a.mensaje||a.title||a.titulo,createdAt:a.createdAt})) : [],
      ventasPorSede: isAdmin ? [] : [],
      tendencia6Meses,
      accionesRapidas: accionesMap[role] || accionesMap.viewer,
      porcentajes: {
        agendamiento: { valor: clientesTotal > 0 ? Math.round(clientesActivos/clientesTotal*1000)/10 : 0, meta: 80 },
        asistencia: { valor: 100, meta: 90 },
        conversion: { valor: totalLeadsMes > 0 ? Math.round(ventasMesCount/totalLeadsMes*1000)/10 : 0, meta: 30 },
        retencion: { valor: clientesTotal > 0 ? Math.round(clientesActivos/clientesTotal*1000)/10 : 0, meta: 85 }
      },
      funnelComercial: { leads: clientesProspecto, agendados: clientesAgendados, asistentes: 0, conversiones: ventasMesCount, pagados: pagadosMesCount },
      distribucion: {
        clientesPorStatus: (clientesPorStatusAgg||[]).map(s=>({label:s._id||'Sin status',value:s.value})),
        clientesPorPlan: (clientesPorPlanAgg||[]).map(p=>({label:p._id||'Sin plan',value:p.value})),
        ventasPorTipo: (ventasPorTipoAgg||[]).map(v=>({label:v._id||'Sin tipo',value:v.value}))
      },
      sparklines: {
        ventasDiarias: buildSparkline(ventasDiariosAgg),
        clientesDiarios: buildSparkline(clientesDiariosAgg),
        ingresosDiarios: buildSparkline(ingresosDiariosAgg)
      }
    };

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error en overview-bi: ' + error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Obtiene el snapshot resumido del dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Fecha inicial para recalcular snapshot
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Fecha final para recalcular snapshot
 *     responses:
 *       200:
 *         description: Snapshot del dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: No hay dataset activo
 *       500:
 *         description: Error interno
 */
// ── GET /api/dashboard/summary ───────────────────────────────────────────────
router.get('/summary', requireAuth, async (req, res) => {
  try {
    let { from, to } = req.query;
    const run = await ExportRun.findOne({ datasetActivated: true }).sort({ updatedAt: -1 });
    if (!run) return res.status(404).json({ error: 'No active dataset available' });
    let snapshot = run.dashboardSnapshot || {};
    const validFrom = from ? new Date(from) : null;
    const validTo = to ? new Date(to) : null;
    if ((validFrom || validTo) && !(isNaN(validFrom) || isNaN(validTo))) {
      try {
        const recalculated = await ExportRunner.buildDashboardSnapshot({ from: validFrom, to: validTo });
        snapshot = Object.assign({}, snapshot, {
          kpis: Object.assign({}, snapshot.kpis || {}, { total_sales: recalculated.kpis.total_sales, sales_count: recalculated.kpis.sales_count, total_payables: recalculated.kpis.total_payables }),
          trends: Object.assign({}, snapshot.trends || {}, { salesByDay: recalculated.trends.salesByDay }),
          tables: Object.assign({}, snapshot.tables || {}, { lastSales: recalculated.tables.lastSales })
        });
      } catch (error) { logger.warn('Error recalculando snapshot con rango', { message: error.message }); }
    }
    return res.json(snapshot);
  } catch (error) {
    logger.error('Error en /api/dashboard/summary', { message: error.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: KPIs y métricas resumidas del mes actual
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPIs y métricas del mes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Error interno
 */
// ── GET /api/dashboard/overview ──────────────────────────────────────────────
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const Venta = require('../models/Venta');
    const Cliente = require('../models/Cliente');
    let Alerta;
    try { Alerta = require('../models/Alerta'); } catch(e) { Alerta = null; }

    const ahora = new Date();
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMesActual = ahora;
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    const TIPOS_COMPRA = ['Promesa de compra', 'Venta Online', 'Venta online'];

    const [
      ventasActual, montoActual, clientesActivos, clientesNuevosActual,
      tareasPendientes, totalLeadsActual, totalComprasActual,
      ventasAnterior, montoAnterior, clientesNuevosAnterior,
      totalLeadsAnterior, totalComprasAnterior
    ] = await Promise.all([
      Venta.countDocuments({ saleDate: { $gte: inicioMesActual, $lte: finMesActual }, saleType: { $in: TIPOS_COMPRA } }).catch(()=>0),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesActual, $lte: finMesActual }, saleType: { $in: TIPOS_COMPRA } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).catch(()=>[]),
      Cliente.countDocuments({ status: { $regex: '^activo$', $options: 'i' } }).catch(()=>0),
      Cliente.countDocuments({ createdAt: { $gte: inicioMesActual, $lte: finMesActual } }).catch(()=>0),
      Alerta ? Alerta.countDocuments({ status: { $in: ['pendiente', 'en_proceso'] } }).catch(()=>0) : 0,
      Venta.countDocuments({ saleDate: { $gte: inicioMesActual, $lte: finMesActual } }).catch(()=>0),
      Venta.countDocuments({ saleDate: { $gte: inicioMesActual, $lte: finMesActual }, saleType: { $in: TIPOS_COMPRA } }).catch(()=>0),
      Venta.countDocuments({ saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior }, saleType: { $in: TIPOS_COMPRA } }).catch(()=>0),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior }, saleType: { $in: TIPOS_COMPRA } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).catch(()=>[]),
      Cliente.countDocuments({ createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior } }).catch(()=>0),
      Venta.countDocuments({ saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior } }).catch(()=>0),
      Venta.countDocuments({ saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior }, saleType: { $in: TIPOS_COMPRA } }).catch(()=>0)
    ]);

    const montoActualVal = montoActual[0]?.total || 0;
    const montoAnteriorVal = montoAnterior[0]?.total || 0;
    const varMonto = montoAnteriorVal > 0 ? ((montoActualVal - montoAnteriorVal) / montoAnteriorVal * 100).toFixed(1) : null;
    const varVentas = ventasAnterior > 0 ? ((ventasActual - ventasAnterior) / ventasAnterior * 100).toFixed(1) : null;
    const varClientes = clientesNuevosAnterior > 0 ? ((clientesNuevosActual - clientesNuevosAnterior) / clientesNuevosAnterior * 100).toFixed(1) : null;
    const tasaConversionActual = totalLeadsActual > 0 ? (totalComprasActual / totalLeadsActual * 100).toFixed(1) : 0;
    const tasaConversionAnterior = totalLeadsAnterior > 0 ? (totalComprasAnterior / totalLeadsAnterior * 100).toFixed(1) : 0;
    const varConversion = tasaConversionAnterior > 0 ? (tasaConversionActual - tasaConversionAnterior).toFixed(1) : null;

    res.json({
      success: true,
      data: {
        ventasEsteMes: { cantidad: ventasActual, monto: montoActualVal, variacion: varMonto, variacionCantidad: varVentas },
        clientesActivos: { total: clientesActivos, nuevosEsteMes: clientesNuevosActual, variacion: varClientes },
        tareasPendientes: { total: tareasPendientes, requiereAtencion: tareasPendientes > 10 },
        tasaConversion: { porcentaje: parseFloat(tasaConversionActual), variacion: varConversion }
      }
    });
  } catch (error) {
    logger.error('Error en /api/dashboard/overview', { message: error.message });
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /dashboard/ventas:
 *   get:
 *     summary: KPIs y ranking de ventas del mes actual
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPIs y ranking de ventas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Error interno
 */
// ── GET /api/dashboard/ventas ────────────────────────────────────────────────
router.get('/ventas', requireAuth, async (req, res) => {
  try {
    const Venta = require('../models/Venta');
    const ahora = new Date();
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);
    const [ventasActual, ventasAnterior, composicion, rankingSedes, rankingSedesAnt] = await Promise.all([
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesActual } } }, { $group: { _id: null, monto: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior } } }, { $group: { _id: null, monto: { $sum: '$totalAmount' } } }]),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesActual } } }, { $group: { _id: '$saleType', monto: { $sum: '$totalAmount' }, cantidad: { $sum: 1 } } }, { $sort: { monto: -1 } }]),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesActual }, branchName: { $exists: true, $ne: '' } } }, { $group: { _id: '$branchName', montoActual: { $sum: '$totalAmount' } } }, { $sort: { montoActual: -1 } }, { $limit: 6 }]),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior }, branchName: { $exists: true, $ne: '' } } }, { $group: { _id: '$branchName', montoAnterior: { $sum: '$totalAmount' } } }])
    ]);
    const montoActual2 = ventasActual[0]?.monto || 0;
    const montoAnterior2 = ventasAnterior[0]?.monto || 0;
    const variacion = montoAnterior2 > 0 ? parseFloat(((montoActual2 - montoAnterior2) / montoAnterior2 * 100).toFixed(1)) : null;
    const antMap = {};
    rankingSedesAnt.forEach(s => { antMap[s._id] = s.montoAnterior; });
    const ranking = rankingSedes.map((s, idx) => {
      const ant = antMap[s._id] || 0;
      const v = ant > 0 ? parseFloat(((s.montoActual - ant) / ant * 100).toFixed(1)) : null;
      return { posicion: idx + 1, nombre: s._id, montoActual: s.montoActual, montoAnterior: ant, variacion: v };
    });
    res.json({ success: true, data: { totalMes: { monto: montoActual2, cantidad: ventasActual[0]?.count || 0, variacion, montoAnterior: montoAnterior2, periodo: inicioMesActual.toLocaleDateString('es-CL') + ' - ' + ahora.toLocaleDateString('es-CL') }, composicion, ranking }});
  } catch (error) {
    logger.error('Error en /api/dashboard/ventas', { message: error.message });
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /dashboard/clientes:
 *   get:
 *     summary: KPIs y ranking de clientes activos e inactivos
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPIs y ranking de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Error interno
 */
// ── GET /api/dashboard/clientes ──────────────────────────────────────────────
router.get('/clientes', requireAuth, async (req, res) => {
  try {
    const Cliente = require('../models/Cliente');
    let Membership;
    try { Membership = require('../models/Membership'); } catch(e) { Membership = null; }
    const Venta = require('../models/Venta');
    const ahora = new Date();
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);
    const [totalActivos, totalInactivos, nuevosEsteMes, nuevosMesAnterior, activosMesAnterior, planesActivos, planesCancelados, planesActivosMesAnterior, planesCanceladosMesAnterior, ventasMes, rankingSedesVentas, rankingSedesAnt] = await Promise.all([
      Cliente.countDocuments({ status: { $regex: '^activo$', $options: 'i' } }).catch(()=>0),
      Cliente.countDocuments({ status: { $in: ['inactivo', 'suspendido'] } }).catch(()=>0),
      Cliente.countDocuments({ createdAt: { $gte: inicioMesActual } }).catch(()=>0),
      Cliente.countDocuments({ createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior } }).catch(()=>0),
      Cliente.countDocuments({ status: { $regex: '^activo$', $options: 'i' }, createdAt: { $lte: finMesAnterior } }).catch(()=>0),
      Membership ? Membership.countDocuments({ status: 'active' }).catch(()=>0) : 0,
      Membership ? Membership.countDocuments({ status: 'cancelled' }).catch(()=>0) : 0,
      Membership ? Membership.countDocuments({ status: 'active', createdAt: { $lte: finMesAnterior } }).catch(()=>0) : 0,
      Membership ? Membership.countDocuments({ status: 'cancelled', updatedAt: { $gte: inicioMesAnterior, $lte: finMesAnterior } }).catch(()=>0) : 0,
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesActual } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]).catch(()=>[]),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesActual }, branchName: { $exists: true, $ne: '' } } }, { $group: { _id: '$branchName', clientes: { $addToSet: '$idMember' } } }, { $project: { _id: 1, total: { $size: '$clientes' } } }, { $sort: { total: -1 } }, { $limit: 6 }]).catch(()=>[]),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior }, branchName: { $exists: true, $ne: '' } } }, { $group: { _id: '$branchName', clientes: { $addToSet: '$idMember' } } }, { $project: { _id: 1, total: { $size: '$clientes' } } }]).catch(()=>[])
    ]);
    const varActivos = activosMesAnterior > 0 ? parseFloat(((totalActivos - activosMesAnterior) / activosMesAnterior * 100).toFixed(1)) : null;
    const varNuevos = nuevosMesAnterior > 0 ? parseFloat(((nuevosEsteMes - nuevosMesAnterior) / nuevosMesAnterior * 100).toFixed(1)) : null;
    const varPlanesActivos = planesActivosMesAnterior > 0 ? parseFloat(((planesActivos - planesActivosMesAnterior) / planesActivosMesAnterior * 100).toFixed(1)) : null;
    const montoMes2 = ventasMes[0]?.total || 0;
    const ticketMedio = totalActivos > 0 ? Math.round(montoMes2 / totalActivos) : 0;
    const antMap2 = {};
    rankingSedesAnt.forEach(s => { antMap2[s._id] = s.total; });
    const rankingActivos = rankingSedesVentas.map((s, idx) => {
      const ant = antMap2[s._id] || 0;
      const varSede = ant > 0 ? parseFloat(((s.total - ant) / ant * 100).toFixed(1)) : null;
      return { posicion: idx + 1, nombre: s._id, actual: s.total, anterior: ant, variacion: varSede };
    });
    res.json({ success: true, data: {
      clientesActivos: { total: totalActivos, inactivos: totalInactivos, nuevosEsteMes, variacion: varActivos, variacionNuevos: varNuevos, periodo: inicioMesActual.toLocaleDateString('es-CL') + ' - ' + ahora.toLocaleDateString('es-CL') },
      planes: { activos: planesActivos, cancelados: planesCancelados, variacionActivos: varPlanesActivos, variacionCancelados: planesCanceladosMesAnterior > 0 ? parseFloat(((planesCancelados - planesCanceladosMesAnterior) / planesCanceladosMesAnterior * 100).toFixed(1)) : null },
      ticketMedio, rankingActivos, rankingCancelados: []
    }});
  } catch (error) {
    logger.error('Error en /api/dashboard/clientes', { message: error.message });
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /dashboard/prospectos:
 *   get:
 *     summary: KPIs y métricas de prospectos y conversiones
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPIs y métricas de prospectos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Error interno
 */
// ── GET /api/dashboard/prospectos ────────────────────────────────────────────
router.get('/prospectos', requireAuth, async (req, res) => {
  try {
    let Lead, Agendamiento;
    try { Lead = require('../models/Lead'); } catch(e) { return res.json({ success: true, data: { contactos: { total: 0 }, conversiones: { total: 0 }, tasaConversion: { actual: 0 }, rankContactos: [], rankConversiones: [] } }); }
    try { Agendamiento = require('../models/Agendamiento'); } catch(e) { Agendamiento = null; }
    const ahora = new Date();
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

    const [contactosActual, contactosAnterior, conversionesActual, conversionesAnterior] = await Promise.all([
      Lead.countDocuments({ createdAt: { $gte: inicioMesActual } }).catch(()=>0),
      Lead.countDocuments({ createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior } }).catch(()=>0),
      Lead.countDocuments({ createdAt: { $gte: inicioMesActual }, estatus: { $in: ['Convertido', 'Ganado', 'convertido', 'ganado'] } }).catch(()=>0),
      Lead.countDocuments({ createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior }, estatus: { $in: ['Convertido', 'Ganado', 'convertido', 'ganado'] } }).catch(()=>0)
    ]);

    const varContactos = contactosAnterior > 0 ? parseFloat(((contactosActual - contactosAnterior) / contactosAnterior * 100).toFixed(2)) : null;
    const varConversiones = conversionesAnterior > 0 ? parseFloat(((conversionesActual - conversionesAnterior) / conversionesAnterior * 100).toFixed(2)) : null;
    const tasaActual = contactosActual > 0 ? parseFloat((conversionesActual / contactosActual * 100).toFixed(2)) : 0;
    const tasaAnterior = contactosAnterior > 0 ? parseFloat((conversionesAnterior / contactosAnterior * 100).toFixed(2)) : 0;

    res.json({ success: true, data: {
      contactos: { total: contactosActual, anterior: contactosAnterior, variacion: varContactos, periodo: inicioMesActual.toLocaleDateString('es-CL') + ' - ' + ahora.toLocaleDateString('es-CL') },
      conversiones: { total: conversionesActual, anterior: conversionesAnterior, variacion: varConversiones },
      tasaConversion: { actual: tasaActual, anterior: tasaAnterior },
      rankContactos: [], rankConversiones: []
    }});
  } catch (error) {
    logger.error('Error en /api/dashboard/prospectos', { message: error.message });
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /dashboard/historico:
 *   get:
 *     summary: Histórico de ventas y clientes por mes
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: meses
 *         schema:
 *           type: integer
 *         required: false
 *         description: Número de meses a consultar (default: 6)
 *     responses:
 *       200:
 *         description: Histórico de ventas y clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Error interno
 */
// ── GET /api/dashboard/historico ─────────────────────────────────────────────
router.get('/historico', requireAuth, async (req, res) => {
  try {
    const Venta = require('../models/Venta');
    const Cliente = require('../models/Cliente');
    const meses = parseInt(req.query.meses) || 6;
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1), 1);
    const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    const [ventasHist, clientesNuevosHist, clientesAnteriores] = await Promise.all([
      Venta.aggregate([{ $match: { saleDate: { $gte: inicio } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } }, total: { $sum: '$totalAmount' } } }, { $sort: { _id: 1 } }]).catch(()=>[]),
      Cliente.aggregate([{ $match: { createdAt: { $gte: inicio } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, nuevos: { $sum: 1 } } }, { $sort: { _id: 1 } }]).catch(()=>[]),
      Cliente.countDocuments({ createdAt: { $lt: inicio } }).catch(()=>0)
    ]);

    const mesesLista = [];
    for (let i = 0; i < meses; i++) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1) + i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      mesesLista.push({ key, label: MESES_ES[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) });
    }

    const ventasMap = {};
    ventasHist.forEach(v => { ventasMap[v._id] = v; });
    const nuevosMap = {};
    clientesNuevosHist.forEach(c => { nuevosMap[c._id] = c.nuevos; });

    let acum = clientesAnteriores;
    const ventasFinal = mesesLista.map(({ key, label }) => ({ mes: label, total: ventasMap[key]?.total || 0 }));
    const clientesFinal = mesesLista.map(({ key, label }) => {
      const nuevos = nuevosMap[key] || 0;
      acum += nuevos;
      return { mes: label, activos: acum, nuevos };
    });

    res.json({ success: true, data: { ventas: ventasFinal, clientes: clientesFinal } });
  } catch (error) {
    logger.error('Error en /api/dashboard/historico', { message: error.message });
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /dashboard/layout:
 *   get:
 *     summary: Obtiene el layout de widgets del usuario
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Layout de widgets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Error interno
 *   post:
 *     summary: Guarda el layout de widgets del usuario
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               widgets:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       200:
 *         description: Layout guardado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: widgets debe ser un array
 *       500:
 *         description: Error interno
 */
// ── GET /api/dashboard/layout ────────────────────────────────────────────────
router.get('/layout', requireAuth, async (req, res) => {
  try {
    const OverviewLayout = require('../models/OverviewLayout');
    const usuarioId = req.user?.id || req.user?._id;
    const layout = await OverviewLayout.findOne({ usuario: usuarioId });
    res.json({ success: true, widgets: layout?.widgets || [] });
  } catch (err) {
    logger.error('Error en GET /api/dashboard/layout', { message: err.message });
    res.status(500).json({ success: false, error: 'Error interno' });
  }
});

// ── POST /api/dashboard/layout ───────────────────────────────────────────────
router.post('/layout', requireAuth, async (req, res) => {
  try {
    const OverviewLayout = require('../models/OverviewLayout');
    const usuarioId = req.user?.id || req.user?._id;
    const rol = req.user?.role || 'staff';
    const { widgets } = req.body || {};
    if (!Array.isArray(widgets)) {
      return res.status(400).json({ success: false, error: 'widgets debe ser un array' });
    }
    const layout = await OverviewLayout.findOneAndUpdate(
      { usuario: usuarioId },
      { usuario: usuarioId, rol, widgets, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, widgets: layout.widgets });
  } catch (err) {
    logger.error('Error en POST /api/dashboard/layout', { message: err.message });
    res.status(500).json({ success: false, error: 'Error interno' });
  }
});

module.exports = router;