const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
(async()=>{
  try {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log('memory mongo uri', uri);
    await mongoose.connect(uri);
    const ImportService = require('../src/services/ImportService');
    const Cliente = require('../src/models/Cliente');
    // create temp csv file
    const upload = path.join(process.cwd(),'uploads');
    if(!fs.existsSync(upload)) fs.mkdirSync(upload,{recursive:true});
    const filepath = path.join(upload,'test.csv');
    fs.writeFileSync(filepath,'email,nombre,apellido\njuan@ejemplo.com,Juan,Perez');
    console.log('file written', filepath);
    const mapeo = { email:'email', nombre:'nombre', apellido:'apellido' };
    const result = await ImportService.processCSVFile({path:filepath, originalname:'test.csv'}, mapeo, 'clientes', ',');
    console.log('import result', result);
    const clientes= await Cliente.find().lean();
    console.log('clientes in db', clientes);
    // now second scenario: simulate failure in create
    const filepath2 = path.join(upload,'test2.csv');
    fs.writeFileSync(filepath2,'nombre,apellido,email\nFoo,Bar,foo@x.com');
    const origCreate = Cliente.create;
    let thrown = false;
    Cliente.create = async function(data){ if(!thrown){ thrown=true; throw new Error('simulated insert failure'); } return origCreate.call(this,data); };
    console.log('patched create for failure');
    const result2 = await ImportService.processCSVFile({path:filepath2, originalname:'test2.csv'}, mapeo, 'clientes', ',');
    console.log('import result 2', result2);
    const clientes2 = await Cliente.find().lean();
    console.log('clientes in db after failure', clientes2);
    await mongoose.disconnect();
    await mongod.stop();
  } catch(e) {
    console.error('error', e);
    process.exit(1);
  }
})();
