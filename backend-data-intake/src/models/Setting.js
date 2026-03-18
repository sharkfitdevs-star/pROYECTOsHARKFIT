const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: null }
}, {
  collection: 'app_settings'
});

module.exports = mongoose.model('Setting', settingSchema);
