// Intenta cargar SQLite (puede fallar por permisos en OneDrive)
let db = null;
try {
  const sqlite = require('../db/sqlite');
  db = sqlite.db;
} catch (error) {
  console.warn('⚠️  SQLite no disponible, usando fallback');
}


function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildRange(column, desde, hasta) {
  const clauses = [];
  const params = [];

  if (desde) {
    clauses.push(`${column} >= ?`);
    params.push(toIso(desde));
  }

  if (hasta) {
    clauses.push(`${column} <= ?`);
    params.push(toIso(hasta));
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

class StatsService {
  async obtenerResumen(desde, hasta) {
    const rangeClientes = buildRange('created_at', desde, hasta);
    const rangeVentas = buildRange('fecha', desde, hasta);
    const rangeLeads = buildRange('created_at', desde, hasta);

    const clientes = db
      .prepare(`SELECT COUNT(*) as total FROM clientes ${rangeClientes.where}`)
      .get(...rangeClientes.params);

    const ventas = db
      .prepare(`SELECT COUNT(*) as total, COALESCE(SUM(monto), 0) as totalMonto FROM ventas ${rangeVentas.where}`)
      .get(...rangeVentas.params);

    const leads = db
      .prepare(`SELECT COUNT(*) as total FROM leads ${rangeLeads.where}`)
      .get(...rangeLeads.params);

    return {
      clientes: clientes?.total || 0,
      ventas: ventas?.total || 0,
      leads: leads?.total || 0,
      totalVentas: ventas?.totalMonto || 0
    };
  }

  async obtenerVentasSemanales(desde, hasta) {
    const range = buildRange('fecha', desde, hasta);
    const rows = db
      .prepare(`
        SELECT
          strftime('%Y-%W', COALESCE(fecha, created_at)) as semana,
          COUNT(*) as cantidad,
          COALESCE(SUM(monto), 0) as total
        FROM ventas
        ${range.where}
        GROUP BY semana
        ORDER BY semana ASC
      `)
      .all(...range.params);

    return rows.map((row) => ({
      semana: row.semana,
      cantidad: row.cantidad,
      total: row.total
    }));
  }

  async obtenerClientesPorEstado() {
    const rows = db
      .prepare('SELECT estado, COUNT(*) as cantidad FROM clientes GROUP BY estado')
      .all();

    return rows.map((row) => ({
      estado: row.estado || 'Sin estado',
      cantidad: row.cantidad
    }));
  }

  async obtenerMembresiasProximasVencer(dias, estado) {
    const hoy = new Date();
    const limite = new Date(hoy.getTime() + dias * 24 * 60 * 60 * 1000);

    const rows = db
      .prepare(`
        SELECT * FROM clientes
        WHERE membresia_fecha_vencimiento IS NOT NULL
          AND membresia_fecha_vencimiento BETWEEN ? AND ?
          AND (membresia_estado = ? OR ? IS NULL)
        ORDER BY membresia_fecha_vencimiento ASC
      `)
      .all(toIso(hoy), toIso(limite), estado || null, estado || null);

    return rows.map((row) => ({
      clienteId: row.cliente_id,
      nombre: row.nombre,
      email: row.email,
      estado: row.membresia_estado,
      fechaVencimiento: row.membresia_fecha_vencimiento
    }));
  }

  async obtenerAnalisisChurn(periodo) {
    const desde = new Date(Date.now() - periodo * 24 * 60 * 60 * 1000);

    const rows = db
      .prepare(`
        SELECT estado, COUNT(*) as cantidad
        FROM clientes
        WHERE updated_at >= ?
        GROUP BY estado
      `)
      .all(toIso(desde));

    return rows.map((row) => ({
      estado: row.estado || 'Sin estado',
      cantidad: row.cantidad
    }));
  }
}

module.exports = new StatsService();
