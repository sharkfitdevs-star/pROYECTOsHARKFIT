// backend-data-intake/src/db/db.js

const mongoose = require('mongoose');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/sharkfit'; // cambia el nombre de la BD si quieres

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });

    console.log('✅ MongoDB conectado exitosamente');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    // si no quieres que el servidor muera, comenta la siguiente línea
    process.exit(1);
  }
}

// alias para compatibilidad con server.js que pide connectToDB
async function connectToDB() {
  return connectDB();
}

module.exports = {
  connectDB,
  connectToDB,
  mongoose,
};