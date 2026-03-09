const express = require('express');
const ExportRun = require('../models/ExportRun');
const ExportRunner = require('../services/ExportRunner');
const { logger } = require('../utils/logger');
const router = express.Router();

router.get('/summary', async (req, res) => {
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
      } catch (err) { logger.warn('Error recalculando snapshot con rango', { error: err, from, to }); }
    }
    return res.json(snapshot);
  } catch (error) {
    logger.error('Error en /api/dashboard/summary', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const Venta = require('../models/Venta');
    const Cliente = require('../models/Cliente');
    const Alerta = require('../models/Alerta');

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
      Venta.countDocuments({ saleDate: { $gte: inicioMesActual, $lte: finMesActual }, saleType: { $in: TIPOS_COMPRA } }),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesActual, $lte: finMesActual }, saleType: { $in: TIPOS_COMPRA } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Cliente.countDocuments({ status: { $regex: '^activo$', $options: 'i' } }),
      Cliente.countDocuments({ createdAt: { $gte: inicioMesActual, $lte: finMesActual } }),
      Alerta.countDocuments({ status: { $in: ['pendiente', 'en_proceso'] } }),
      Venta.countDocuments({ saleDate: { $gte: inicioMesActual, $lte: finMesActual } }),
      Venta.countDocuments({ saleDate: { $gte: inicioMesActual, $lte: finMesActual }, saleType: { $in: TIPOS_COMPRA } }),
      Venta.countDocuments({ saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior }, saleType: { $in: TIPOS_COMPRA } }),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior }, saleType: { $in: TIPOS_COMPRA } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Cliente.countDocuments({ createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior } }),
      Venta.countDocuments({ saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior } }),
      Venta.countDocuments({ saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior }, saleType: { $in: TIPOS_COMPRA } })
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
    require('../utils/logger').logger.error('Error en /api/dashboard/overview', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ventas', async (req, res) => {
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
    const montoActual = ventasActual[0]?.monto || 0;
    const montoAnterior = ventasAnterior[0]?.monto || 0;
    const variacion = montoAnterior > 0 ? parseFloat(((montoActual - montoAnterior) / montoAnterior * 100).toFixed(1)) : null;
    const antMap = {};
    rankingSedesAnt.forEach(s => { antMap[s._id] = s.montoAnterior; });
    const ranking = rankingSedes.map((s, idx) => {
      const ant = antMap[s._id] || 0;
      const v = ant > 0 ? parseFloat(((s.montoActual - ant) / ant * 100).toFixed(1)) : null;
      return { posicion: idx + 1, nombre: s._id, montoActual: s.montoActual, montoAnterior: ant, variacion: v };
    });
    res.json({ success: true, data: { totalMes: { monto: montoActual, cantidad: ventasActual[0]?.count || 0, variacion, montoAnterior, periodo: inicioMesActual.toLocaleDateString('es-CL') + ' - ' + ahora.toLocaleDateString('es-CL') }, composicion, ranking }});
  } catch (error) {
    require('../utils/logger').logger.error('Error en /api/dashboard/ventas', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/clientes', async (req, res) => {
  try {
    const Cliente = require('../models/Cliente');
    const Membership = require('../models/Membership');
    const Venta = require('../models/Venta');
    const ahora = new Date();
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);
    const [totalActivos, totalInactivos, nuevosEsteMes, nuevosMesAnterior, activosMesAnterior, planesActivos, planesCancelados, planesActivosMesAnterior, planesCanceladosMesAnterior, ventasMes, rankingSedesVentas, rankingSedesAnt] = await Promise.all([
      Cliente.countDocuments({ status: { $regex: '^activo$', $options: 'i' } }),
      Cliente.countDocuments({ status: { $in: ['inactivo', 'suspendido'] } }),
      Cliente.countDocuments({ createdAt: { $gte: inicioMesActual } }),
      Cliente.countDocuments({ createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior } }),
      Cliente.countDocuments({ status: { $regex: '^activo$', $options: 'i' }, createdAt: { $lte: finMesAnterior } }),
      Membership.countDocuments({ status: 'active' }),
      Membership.countDocuments({ status: 'cancelled' }),
      Membership.countDocuments({ status: 'active', createdAt: { $lte: finMesAnterior } }),
      Membership.countDocuments({ status: 'cancelled', updatedAt: { $gte: inicioMesAnterior, $lte: finMesAnterior } }),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesActual } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesActual }, branchName: { $exists: true, $ne: '' } } }, { $group: { _id: '$branchName', clientes: { $addToSet: '$idMember' } } }, { $project: { _id: 1, total: { $size: '$clientes' } } }, { $sort: { total: -1 } }, { $limit: 6 }]),
      Venta.aggregate([{ $match: { saleDate: { $gte: inicioMesAnterior, $lte: finMesAnterior }, branchName: { $exists: true, $ne: '' } } }, { $group: { _id: '$branchName', clientes: { $addToSet: '$idMember' } } }, { $project: { _id: 1, total: { $size: '$clientes' } } }])
    ]);
    const varActivos = activosMesAnterior > 0 ? parseFloat(((totalActivos - activosMesAnterior) / activosMesAnterior * 100).toFixed(1)) : null;
    const varNuevos = nuevosMesAnterior > 0 ? parseFloat(((nuevosEsteMes - nuevosMesAnterior) / nuevosMesAnterior * 100).toFixed(1)) : null;
    const varPlanesActivos = planesActivosMesAnterior > 0 ? parseFloat(((planesActivos - planesActivosMesAnterior) / planesActivosMesAnterior * 100).toFixed(1)) : null;
    const montoMes = ventasMes[0]?.total || 0;
    const ticketMedio = totalActivos > 0 ? Math.round(montoMes / totalActivos) : 0;
    const antMap = {};
    rankingSedesAnt.forEach(s => { antMap[s._id] = s.total; });
    const rankingActivos = rankingSedesVentas.map((s, idx) => {
      const ant = antMap[s._id] || 0;
      const varSede = ant > 0 ? parseFloat(((s.total - ant) / ant * 100).toFixed(1)) : null;
      return { posicion: idx + 1, nombre: s._id, actual: s.total, anterior: ant, variacion: varSede };
    });
    res.json({ success: true, data: {
      clientesActivos: { total: totalActivos, inactivos: totalInactivos, nuevosEsteMes, variacion: varActivos, variacionNuevos: varNuevos, periodo: inicioMesActual.toLocaleDateString('es-CL') + ' - ' + ahora.toLocaleDateString('es-CL') },
      planes: { activos: planesActivos, cancelados: planesCancelados, variacionActivos: varPlanesActivos, variacionCancelados: planesCanceladosMesAnterior > 0 ? parseFloat(((planesCancelados - planesCanceladosMesAnterior) / planesCanceladosMesAnterior * 100).toFixed(1)) : null },
      ticketMedio, rankingActivos, rankingCancelados: []
    }});
  } catch (error) {
    require('../utils/logger').logger.error('Error en /api/dashboard/clientes', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/prospectos', async (req, res) => {
  try {
    const Lead = require('../models/Lead');
    const Agendamiento = require('../models/Agendamiento');
    const ahora = new Date();
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

    const [
      contactosActual, contactosAnterior,
      conversionesActual, conversionesAnterior,
      rankingContactos, rankingContactosAnt,
      rankingConversiones, rankingConversionesAnt
    ] = await Promise.all([
      Lead.countDocuments({ createdAt: { $gte: inicioMesActual } }),
      Lead.countDocuments({ createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior } }),
      Lead.countDocuments({ createdAt: { $gte: inicioMesActual }, estatus: { $in: ['Convertido', 'Ganado', 'convertido', 'ganado'] } }),
      Lead.countDocuments({ createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior }, estatus: { $in: ['Convertido', 'Ganado', 'convertido', 'ganado'] } }),
      Lead.aggregate([{ $match: { createdAt: { $gte: inicioMesActual }, 'data.branchName': { $exists: true } } }, { $group: { _id: '$data.branchName', total: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 6 }]),
      Lead.aggregate([{ $match: { createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior }, 'data.branchName': { $exists: true } } }, { $group: { _id: '$data.branchName', total: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: { createdAt: { $gte: inicioMesActual }, estatus: { $in: ['Convertido','Ganado','convertido','ganado'] }, 'data.branchName': { $exists: true } } }, { $group: { _id: '$data.branchName', total: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 6 }]),
      Lead.aggregate([{ $match: { createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior }, estatus: { $in: ['Convertido','Ganado','convertido','ganado'] }, 'data.branchName': { $exists: true } } }, { $group: { _id: '$data.branchName', total: { $sum: 1 } } }])
    ]);

    const varContactos = contactosAnterior > 0 ? parseFloat(((contactosActual - contactosAnterior) / contactosAnterior * 100).toFixed(2)) : null;
    const varConversiones = conversionesAnterior > 0 ? parseFloat(((conversionesActual - conversionesAnterior) / conversionesAnterior * 100).toFixed(2)) : null;
    const tasaActual = contactosActual > 0 ? parseFloat((conversionesActual / contactosActual * 100).toFixed(2)) : 0;
    const tasaAnterior = contactosAnterior > 0 ? parseFloat((conversionesAnterior / contactosAnterior * 100).toFixed(2)) : 0;

    const antMapC = {}; rankingContactosAnt.forEach(s => { antMapC[s._id] = s.total; });
    const antMapV = {}; rankingConversionesAnt.forEach(s => { antMapV[s._id] = s.total; });

    const rankContactos = rankingContactos.map((s, i) => {
      const ant = antMapC[s._id] || 0;
      return { posicion: i+1, nombre: s._id, actual: s.total, anterior: ant, variacion: ant > 0 ? parseFloat(((s.total - ant)/ant*100).toFixed(2)) : null };
    });
    const rankConversiones = rankingConversiones.map((s, i) => {
      const ant = antMapV[s._id] || 0;
      return { posicion: i+1, nombre: s._id, actual: s.total, anterior: ant, variacion: ant > 0 ? parseFloat(((s.total - ant)/ant*100).toFixed(2)) : null };
    });

    res.json({ success: true, data: {
      contactos: { total: contactosActual, anterior: contactosAnterior, variacion: varContactos, periodo: inicioMesActual.toLocaleDateString('es-CL') + ' - ' + ahora.toLocaleDateString('es-CL') },
      conversiones: { total: conversionesActual, anterior: conversionesAnterior, variacion: varConversiones },
      tasaConversion: { actual: tasaActual, anterior: tasaAnterior },
      rankContactos, rankConversiones
    }});
  } catch (error) {
    require('../utils/logger').logger.error('Error en /api/dashboard/prospectos', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
