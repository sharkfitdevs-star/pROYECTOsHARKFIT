const { connectDB } = require('./mongodb');

async function connectToDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI no está definido en .env');
    return false; // fail but do not exit, caller can handle
  }

  // show which URI is being used (sanitized credentials)
  const sanitize = (u) => u.replace(/:(?:[^@]+)@/, ':***@');
  console.log('🔍 Usando MONGODB_URI:', sanitize(uri));

  try {
    await connectDB();
    console.log('✅ Conectado a MongoDB Atlas');
    return true;
  } catch (err) {
    console.error('❌ Error conectando a MongoDB Atlas:');
    console.error(err && err.message ? err.message : err);
    return false;
  }
}

function getDbStatus() {
  const mongoose = require('mongoose');
  const state = mongoose.connection.readyState;
  return { readyState: state, ok: state === 1 };
}

module.exports = { connectToDB, getDbStatus };