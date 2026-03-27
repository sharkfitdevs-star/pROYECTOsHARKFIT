const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { listImportHistory } = require('../src/db/repositories');
(async()=>{
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // create simple sync_logs collection manually
  const col = mongoose.connection.collection('sync_logs');
  console.log('type col', typeof col, col);
  console.log('type find', typeof col.find);
  // test call
  try{
    const rows = await col.find({}).sort({iniciado:-1}).limit(10).toArray();
    console.log('rows', rows);
  } catch(e){
    console.error('error find', e);
  }
  // call repository function
  try{
    const hist = await listImportHistory(10);
    console.log('hist result', hist);
  } catch(e){
    console.error('error listImportHistory', e);
  }
  await mongoose.disconnect();
  await mongod.stop();
})();