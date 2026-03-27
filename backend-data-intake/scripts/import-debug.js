const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const ImportService = require('../src/services/ImportService');
const Cliente = require('../src/models/Cliente');
(async()=>{
  try {
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    const registros=[{nombre:'Foo',apellido:'Bar',email:'foo@x.com'}];
    // patch create
    const orig=Cliente.create;
    let thrown=false;
    Cliente.create=async function(data){
      if(!thrown){
        thrown=true;
        throw new Error('simulated');
      }
      return orig.call(this,data);
    };

    const result = await ImportService._importarClientes(registros,'sync');
    console.log('resultado _importarClientes', result);

    await mongoose.disconnect();
    await mongod.stop();
  } catch(e) {
    console.error('debug error', e);
  }
})();