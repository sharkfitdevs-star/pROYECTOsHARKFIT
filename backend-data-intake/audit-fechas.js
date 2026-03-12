require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Venta = require('./src/models/Venta');

  // Contar cuántas tienen saleDate poblado
  const conSaleDate = await Venta.countDocuments({ saleDate: { $exists: true, $ne: null } });
  const conFechaCompra = await Venta.countDocuments({ fechaCompra: { $exists: true, $ne: null } });
  const conDueDate = await Venta.countDocuments({ dueDate: { $exists: true, $ne: null } });

  // Ver un ejemplo real
  const ejemplo = await Venta.findOne({}).lean();
  const camposFecha = Object.entries(ejemplo)
    .filter(([k,v]) => v instanceof Date || (typeof v === 'string' && v.match(/^\d{4}/)))
    .map(([k,v]) => ({ campo: k, valor: v }));

  console.log('Con saleDate:', conSaleDate);
  console.log('Con fechaCompra:', conFechaCompra);
  console.log('Con dueDate:', conDueDate);
  console.log('Campos de fecha en ejemplo:', JSON.stringify(camposFecha, null, 2));

  await mongoose.disconnect();
}
main().catch(console.error);
