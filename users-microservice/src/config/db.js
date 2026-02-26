const mongoose = require('mongoose');

// connectDB reads the URI from process.env.MONGODB_URI.  The caller
// (typically app.js) is responsible for running dotenv.config() first.
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI no está definida en el .env de users-microservice');
    return; // no connect attempt
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ [users-microservice] MongoDB connected:', uri);
  } catch (err) {
    console.error('❌ [users-microservice] MongoDB connection error:', err);
    // process.exit(1); // descomenta si quieres terminar el proceso en producción
  }
};

module.exports = connectDB;
