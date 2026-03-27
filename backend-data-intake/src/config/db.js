// Lightweight wrapper around the existing DB connector used in the project.
// Uses the robust implementation in ../db/mongodb.js to avoid duplication.

const { connectDB } = require('../db/mongodb');

async function connectToDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI no está definido en el .env');
    process.exit(1);
  }

  try {
    await connectDB();
    console.log('✅ Conectado a MongoDB (via src/config/db.js)');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB Atlas:');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
}

module.exports = { connectToDB };