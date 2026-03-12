require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
const { MongoClient } = require('mongodb');
(async function(){
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sharkfit';
  console.log('using uri', uri);
  const client = new MongoClient(uri);
  try{
    await client.connect();
    const db=client.db();
    console.log('collections',await db.listCollections().toArray());
    const leads=db.collection('leads');
    const ag=db.collection('agendamientos');
    const ventas=db.collection('ventas');
    console.log('leads count',await leads.countDocuments({}));
    console.log('leads one',await leads.findOne({}));
    console.log('ag count',await ag.countDocuments({}));
    console.log('ag one',await ag.findOne({}));
    const rangoVentas=await ventas.aggregate([
      { $group: { _id: null, minFecha: { $min: '$saleDate' }, maxFecha: { $max: '$saleDate' }, total: { $sum:1 } }}
    ]).toArray();
    console.log('rangoVentas',JSON.stringify(rangoVentas));
    const rangoLeads=await leads.aggregate([
      { $group: { _id:null, minFecha:{ $min:'$createdAt' }, maxFecha:{ $max:'$createdAt' }, total:{ $sum:1 } }}
    ]).toArray();
    console.log('rangoLeads',JSON.stringify(rangoLeads));
  } catch(e){console.error(e);} finally{await client.close();}
})();