const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');
const Lead = require('../models/Lead');
const AccessLog = require('../models/AccessLog');

function _toDate(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

class StatsService {
  async obtenerResumen(desde, hasta) {
    const filterCliente = {};
    const filterVenta = {};
    const filterLead = {};

    const dDesde = _toDate(desde);
    const dHasta = _toDate(hasta);

    if (dDesde || dHasta) {
      filterCliente.registrationDate = {};
      filterVenta.saleDate = {};
      filterLead.createdAt = {};
      if (dDesde) {
        filterCliente.registrationDate.$gte = dDesde;
        filterVenta.saleDate.$gte = dDesde;
        filterLead.createdAt.$gte = dDesde;
      }
      if (dHasta) {
        filterCliente.registrationDate.$lte = dHasta;
        filterVenta.saleDate.$lte = dHasta;
        filterLead.createdAt.$lte = dHasta;
      }
    }

    const [clientesCount, ventasAgg, leadsCount] = await Promise.all([
      Cliente.countDocuments(filterCliente),
      Venta.aggregate([
        { $match: filterVenta },
        { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
      ]),
      Lead.countDocuments(filterLead)
    ]);

    const ventasCount = (ventasAgg[0] && ventasAgg[0].count) || 0;
    const ventasTotal = (ventasAgg[0] && ventasAgg[0].totalAmount) || 0;

    return {
      clientes: clientesCount || 0,
      ventas: ventasCount || 0,
      leads: leadsCount || 0,
      totalVentas: ventasTotal || 0
    };
  }

  async obtenerVentasSemanales(desde, hasta) {
    const match = {};
    const dDesde = _toDate(desde) || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const dHasta = _toDate(hasta) || new Date();
    match.saleDate = { $gte: dDesde, $lte: dHasta };

    const rows = await Venta.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $isoWeekYear: '$saleDate' }, week: { $isoWeek: '$saleDate' } },
          cantidad: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      { $project: { semana: { $concat: [ { $toString: '$_id.year' }, '-', { $toString: '$_id.week' } ] }, cantidad: 1, total: 1, _id: 0 } }
    ]);

    return rows.map(r => ({ semana: r.semana, cantidad: r.cantidad, total: r.total }));
  }

  async obtenerClientesPorEstado() {
    const rows = await Cliente.aggregate([
      { $group: { _id: '$status', cantidad: { $sum: 1 } } },
      { $project: { estado: '$_id', cantidad: 1, _id: 0 } }
    ]);

    return rows.map(r => ({ estado: r.estado || 'Sin estado', cantidad: r.cantidad }));
  }

  async obtenerMembresiasProximasVencer(dias = 7, estado) {
    const hoy = new Date();
    const limite = new Date(hoy.getTime() + dias * 24 * 60 * 60 * 1000);
    const q = { membershipEndDate: { $gte: hoy, $lte: limite } };
    if (estado) q.membershipStatus = estado;

    const rows = await Cliente.find(q).sort({ membershipEndDate: 1 }).limit(100).lean();
    return rows.map(r => ({ clienteId: r.idMember, nombre: r.name, email: r.email, estado: r.membershipStatus, fechaVencimiento: r.membershipEndDate }));
  }

  async obtenerAnalisisChurn(periodoDays = 30) {
    const desde = new Date(Date.now() - periodoDays * 24 * 60 * 60 * 1000);
    const rows = await Cliente.aggregate([
      { $match: { lastUpdate: { $gte: desde } } },
      { $group: { _id: '$status', cantidad: { $sum: 1 } } },
      { $project: { estado: '$_id', cantidad: 1, _id: 0 } }
    ]);

    return rows.map(r => ({ estado: r.estado || 'Sin estado', cantidad: r.cantidad }));
  }
}

module.exports = new StatsService();
