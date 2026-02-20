const mongoose = require('mongoose');

const exportRunSchema = new mongoose.Schema({
  runId: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  sourceType: { type: String, enum: ['universal','evo','excel'], required: true },
  config: { type: mongoose.Schema.Types.Mixed }, // sanitized config without secrets
  status: { type: String, enum: ['running','done','failed'], default: 'running', index: true },
  logs: [ {
    ts: { type: Date, default: Date.now },
    level: { type: String },
    message: { type: String },
    meta: mongoose.Schema.Types.Mixed
  } ],
  rawPreview: { type: Array, default: [] },
  availableMetrics: { type: [String], default: [] },
  counts: { type: mongoose.Schema.Types.Mixed, default: {} },
  metricsConfirmed: { type: [String], default: [] },
  datasetActivated: { type: Boolean, default: false }
}, {
  collection: 'export_runs',
  timestamps: true
});

exportRunSchema.methods.log = function(level, message, meta) {
  this.logs.push({ level, message, meta });
  return this.save();
};

exportRunSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('ExportRun', exportRunSchema);