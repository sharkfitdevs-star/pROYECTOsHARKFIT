const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('📦 Ya conectado a MongoDB');
    return;
  }

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sharkfit';
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true;
    console.log('✅ MongoDB conectado exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
};

const disconnectDB = async () => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 MongoDB desconectado');
  } catch (error) {
    console.error('❌ Error desconectando MongoDB:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
