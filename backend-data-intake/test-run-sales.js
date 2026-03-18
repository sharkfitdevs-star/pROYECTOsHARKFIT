// simple script to exercise /api/ventas endpoint
const request = require('supertest');
const { connectDB } = require('./src/db/mongodb');
const { Venta } = require('./src/models');
const app = require('./src/app');

(async () => {
  await connectDB();
  await Venta.deleteMany({});
  const now = new Date();
  await Venta.create({ idSale: 's1', idMember: 'm1', amount: 100, totalAmount: 100, saleDate: new Date(now.getTime() - 2 * 24 * 3600 * 1000), saleType: 'plan' });
  await Venta.create({ idSale: 's2', idMember: 'm2', amount: 200, totalAmount: 200, saleDate: new Date(now.getTime() - 1 * 24 * 3600 * 1000), saleType: 'plan' });
  await Venta.create({ idSale: 's3', idMember: 'm3', amount: 300, totalAmount: 300, saleDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000), saleType: 'plan' });

  const from = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString().substring(0, 10);
  const to = new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString().substring(0, 10);

  const res = await request(app).get('/api/ventas').query({ from, to, page: 1, limit: 1 });
  console.log('status', res.status);
  console.log('body', JSON.stringify(res.body, null, 2));
  process.exit(0);
})();