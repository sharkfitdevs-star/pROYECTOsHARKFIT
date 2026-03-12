require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Venta = require('./src/models/Venta');

  const desde = new Date('2025-01-01');
  const hasta = new Date('2026-12-31');

  const conRango = await Venta.countDocuments({ 
    saleDate: { $gte: desde, $lte: hasta } 
  });
  
  const rango = await Venta.aggregate([{ 
    $group: {
      _id: null,
      min: { $min: '$saleDate' },
      max: { $max: '$saleDate' }
    }
  }]);

  const estadosReales = await Venta.aggregate([{
    $group: { _id: '$paymentStatus', count: { $sum: 1 } }
  }]);

  const tiposReales = await Venta.aggregate([{
    $group: { _id: '$saleType', count: { $sum: 1 } }
  }]);

  console.log('Con rango 2025-2026:', conRango);
  console.log('Rango real:', JSON.stringify(rango));
  console.log('paymentStatus counts:', JSON.stringify(estadosReales));
  console.log('saleType counts:', JSON.stringify(tiposReales));

  await mongoose.disconnect();
}
main().catch(console.error);
