const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH =
  process.env.DATABASE_PATH ||
  path.join(__dirname, '../../data-intake.sqlite3');

const db = new Database(DB_PATH, {
  fileMustExist: false
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      cliente_id TEXT UNIQUE,
      evento_id TEXT,
      nombre TEXT,
      email TEXT,
      telefono TEXT,
      empresa TEXT,
      rfc TEXT,
      estado TEXT,
      fuente TEXT,
      membresia_estado TEXT,
      membresia_fecha_vencimiento TEXT,
      data_json TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_clientes_email
      ON clientes(email);

    CREATE INDEX IF NOT EXISTS idx_clientes_estado_updated
      ON clientes(estado, updated_at);

    CREATE INDEX IF NOT EXISTS idx_clientes_membresia_fecha
      ON clientes(membresia_fecha_vencimiento);

    CREATE TABLE IF NOT EXISTS ventas (
      id TEXT PRIMARY KEY,
      venta_id TEXT UNIQUE,
      evento_venta_id TEXT,
      cliente_id TEXT,
      concepto TEXT,
      monto REAL,
      moneda TEXT,
      estatus TEXT,
      fecha TEXT,
      fuente TEXT,
      data_json TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced_at TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_ventas_cliente_fecha
      ON ventas(cliente_id, fecha);

    CREATE INDEX IF NOT EXISTS idx_ventas_fecha_estatus
      ON ventas(fecha, estatus);

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      lead_id TEXT UNIQUE,
      evento_id TEXT,
      cliente_id TEXT,
      nombre TEXT,
      email TEXT,
      telefono TEXT,
      empresa TEXT,
      estatus TEXT,
      probabilidad INTEGER,
      lead_score INTEGER,
      fuente TEXT,
      data_json TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced_at TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_leads_estatus
      ON leads(estatus);

    CREATE INDEX IF NOT EXISTS idx_leads_score
      ON leads(lead_score);

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      sync_id TEXT UNIQUE,
      fuente TEXT,
      estatus TEXT,
      registos_procesados INTEGER,
      registos_inseridos INTEGER,
      registos_actualizados INTEGER,
      registos_fallidos INTEGER,
      errores TEXT,
      iniciado TEXT,
      finalizado TEXT,
      duracion_ms INTEGER,
      cambios TEXT,
      proximo_intento TEXT,
      reintento_count INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sync_logs_fuente_inicio
      ON sync_logs(fuente, iniciado);

    CREATE INDEX IF NOT EXISTS idx_sync_logs_estatus_inicio
      ON sync_logs(estatus, iniciado);
  `);
}

initSchema();

module.exports = { db };
