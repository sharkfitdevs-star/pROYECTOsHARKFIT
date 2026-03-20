// Exportar todos los modelos
const Cliente = require('./Cliente');
const Venta = require('./Venta');
const Usuario = require('./Usuario');
const Agendamiento = require('./Agendamiento');
const Alerta = require('./Alerta');
const Reporte = require('./Reporte');
const ApiIntegration = require('./ApiIntegration');
const AccessLog = require('./AccessLog');
const SyncLog         = require('./SyncLog');
const ExtractorConfig = require('./ExtractorConfig');
// Cargar MongoModels primero y usar su SyncLog cuando esté disponible.
// Evita registrar el modelo legacy `SyncLog` que causa conflictos de esquema.
const MongoModels = require('./MongoModels');
let SyncLogModel;
if (MongoModels && MongoModels.SyncLog) {
  SyncLogModel = MongoModels.SyncLog;
} else {
  // Fallback: registrar el modelo legacy sólo si no existe la versión MongoModels
  SyncLogModel = require('./SyncLog');
}
const Session = require('./Session');
const EmailToken = require('./EmailToken');
const AuditLog = require('./AuditLog');
const AccessRequest = require('./AccessRequest');
const ExportRun = require('./ExportRun');
const Membership = require('./Membership');
const Payable = require('./Payable');
const OverviewLayout = require('./OverviewLayout');

module.exports = {
  Cliente,
  Venta,
  Usuario,
  Agendamiento,
  Alerta,
  Reporte,
  SyncLog: SyncLogModel,
  Session,
  EmailToken,
  AuditLog,
  AccessRequest,
  ExportRun,
  Membership,
  Payable,
  SyncLog,
  ExtractorConfig,
  OverviewLayout,

  // Mongo utility models/queries
  Webhook: MongoModels.Webhook,
  HealthCheck: MongoModels.HealthCheck,
  ApiCallLog: MongoModels.ApiCallLog,
  WorkerState: MongoModels.WorkerState,
  createOptimizedIndexes: MongoModels.createOptimizedIndexes,
  mongoQueries: MongoModels.queries
};
