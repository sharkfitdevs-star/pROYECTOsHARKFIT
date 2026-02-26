const { connectDB } = require('./mongodb');

async function connectToDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI no está definido en .env');
    process.exit(1);
  }

  try {
    await connectDB();
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB Atlas:');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
}

module.exports = { connectToDB };