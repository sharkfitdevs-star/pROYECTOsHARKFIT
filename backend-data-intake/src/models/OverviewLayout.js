const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema({
  id:         { type: String, required: true },
  type:       { type: String, required: true },
  title:      { type: String, default: '' },
  dataSource: { type: String, default: '' },
  dataKey:    { type: String, default: '' },
  visible:    { type: Boolean, default: true },
  order:      { type: Number, default: 0 },
  size:       { type: String, default: 'medium' },
  color:      { type: String, default: '#a78bfa' },
  isDefault:  { type: Boolean, default: false },
  createdAt:  { type: String, default: '' },
}, { _id: false });

const overviewLayoutSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
  widgets:   { type: [widgetSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false, collection: 'overview_layouts' });

module.exports = mongoose.model('OverviewLayout', overviewLayoutSchema);