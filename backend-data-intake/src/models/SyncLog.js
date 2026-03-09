const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  sync_id:               { type: String, unique: true, sparse: true },
  entidad:               { type: String, default: null },
  fuente:                { type: String, default: 'API' },
  estatus:               { type: String, default: 'Procesando' },
  registos_procesados:   { type: Number, default: 0 },
  registos_inseridos:    { type: Number, default: 0 },
  registos_actualizados: { type: Number, default: 0 },
  registos_fallidos:     { type: Number, default: 0 },
  errores:               { type: String, default: '[]' },
  total_rows:            { type: Number, default: 0 },
  inserted_count:        { type: Number, default: 0 },
  updated_count:         { type: Number, default: 0 },
  skipped_count:         { type: Number, default: 0 },
  invalid_count:         { type: Number, default: 0 },
  warnings:              { type: String, default: '[]' },
  mapping_used:          { type: String, default: '{}' },
  detected_headers:      { type: String, default: '[]' },
  sheet_name:            { type: String, default: null },
  file_meta:             { type: String, default: '{}' },
  error_message:         { type: String, default: null },
  error_code:            { type: String, default: null },
  error_stack:           { type: String, default: null },
  iniciado:              { type: Date,   default: null },
  finalizado:            { type: Date,   default: null },
  duracion_ms:           { type: Number, default: null },
  cambios:               { type: String, default: '{}' },
  proximo_intento:       { type: Date,   default: null },
  reintento_count:       { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'sync_logs'
});

syncLogSchema.index({ sync_id: 1 }, { unique: true, sparse: true });
syncLogSchema.index({ estatus: 1, createdAt: -1 });
syncLogSchema.index({ entidad: 1, createdAt: -1 });

module.exports = mongoose.models.SyncLog || 
  mongoose.model('SyncLog', syncLogSchema);
