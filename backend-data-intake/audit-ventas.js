require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Venta = require('./src/models/Venta');

  const saleTypes = await Venta.distinct('saleType');
  const statuses = await Venta.distinct('paymentStatus');
  const total = await Venta.countDocuments();

  console.log('Total ventas:', total);
  console.log('saleType valores:', JSON.stringify(saleTypes));
  console.log('paymentStatus valores:', JSON.stringify(statuses));

  await mongoose.disconnect();
}
main();
