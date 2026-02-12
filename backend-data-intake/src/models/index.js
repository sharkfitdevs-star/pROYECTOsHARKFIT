// Exportar todos los modelos
const Cliente = require('./Cliente');
const Venta = require('./Venta');
const Usuario = require('./Usuario');
const Agendamiento = require('./Agendamiento');
const Alerta = require('./Alerta');
const Reporte = require('./Reporte');
const SyncLog = require('./SyncLog');
const Session = require('./Session');
const EmailToken = require('./EmailToken');
const AuditLog = require('./AuditLog');

module.exports = {
  Cliente,
  Venta,
  Usuario,
  Agendamiento,
  Alerta,
  Reporte,
  SyncLog,
  Session,
  EmailToken,
  AuditLog
};
