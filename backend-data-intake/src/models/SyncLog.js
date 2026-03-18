/**
 * SyncLog.js
 * Registro de cada ejecución del extractor API.
 * Alimenta el historial visible en ApiImportSection.jsx.
 */
const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  jobId:            { type: String, required: true, unique: true, index: true },
  source:           { type: String, enum: ['evo', 'w12', 'custom', 'excel', 'api', 'manual'], required: true },
  connectionName:   { type: String, required: true },
  dataset:          {
    type: String,
    enum: ['ventas', 'clientes', 'ambos', 'prospectos', 'entradas', 'membresias', 'pagos', 'todo'],
    required: true,
  },
  status: {
    type:    String,
    enum:    ['queued', 'running', 'completed', 'failed', 'cancelled_by_user', 'conflict_pending'],
    default: 'queued',
    index:   true,
  },
  conflictStrategy: {
    type: String,
    enum: ['replace', 'overwrite', 'complement', 'cancel'],
    default: null,
  },
  conflictDetected:   { type: Boolean, default: false },
  excelRecordCount:   { type: Number, default: 0 },
  recordsReceived:    { type: Number, default: 0 },
  recordsInserted:    { type: Number, default: 0 },
  recordsUpdated:     { type: Number, default: 0 },
  recordsSkipped:     { type: Number, default: 0 },
  errors:             [{ field: String, message: String, record: mongoose.Schema.Types.Mixed }],
  dateRange: {
    from: Date,
    to:   Date,
  },
  startedAt:   Date,
  finishedAt:  Date,
}, {
  timestamps: true,
  collection: 'synclogs',
});

syncLogSchema.index({ source: 1, createdAt: -1 });
syncLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SyncLog', syncLogSchema);

