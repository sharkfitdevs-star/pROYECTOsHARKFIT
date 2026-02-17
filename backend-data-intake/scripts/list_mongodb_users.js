// Script para listar usuarios en MongoDB Atlas
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://sharkfit:Sh4rkfit907$@cluster0.kxa73ub.mongodb.net/sharkfit?retryWrites=true&w=majority'; // Cadena de conexión corregida
const dbName = 'sharkfit'; // Nombre real de la base de datos

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    // Usar la colección real 'usuarios'
    const users = await db.collection('usuarios').find({}).toArray();
    console.log('Usuarios en MongoDB:', users.length);
    users.forEach(u => console.log(u));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

main();
