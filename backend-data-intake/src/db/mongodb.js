const mongoose = require('mongoose');

let isConnected = false;

const getMongoOptions = () => ({
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: false,
  serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
  connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 10000)
});

const diagnoseMongoError = (error) => {
  const message = error?.message || '';

  if (/IP.*not allowed|not authorized|whitelist/i.test(message)) {
    return 'MongoDB Atlas bloqueo por IP. Agrega tu IP en Atlas (Network Access).';
  }

  if (/Authentication failed|auth/i.test(message)) {
    return 'Credenciales MongoDB invalidas. Revisa usuario/password en MONGODB_URI.';
  }

  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH/i.test(message)) {
    return 'No se puede alcanzar MongoDB. Revisa red, host o si el server esta activo.';
  }

  return 'Error desconocido de conexion MongoDB.';
};

const connectDB = async () => {
  if (isConnected) {
    console.log('📦 Ya conectado a MongoDB');
    return;
  }

  const primaryUri = (process.env.MONGODB_URI || 'mongodb://localhost:27017/sharkfit').trim();
  const fallbackUri = (process.env.MONGODB_URI_FALLBACK || process.env.MONGODB_URI_LOCAL || '').trim();

  try {
    await mongoose.connect(primaryUri, getMongoOptions());

    isConnected = true;
    console.log('✅ MongoDB conectado exitosamente');
    
    // Crear índices manualmente en background (no bloquea queries)
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Creando índices en background...');
      mongoose.connection.collection('usuarios').createIndex({ username: 1, email: 1 });
    }
  } catch (error) {
    const hint = diagnoseMongoError(error);
    console.error('❌ Error conectando a MongoDB:', error.message || error);
    console.error(`💡 Diagnostico: ${hint}`);

    const hasFallback = fallbackUri && fallbackUri !== primaryUri;
    if (hasFallback) {
      try {
        console.warn('↩️ Intentando conexion MongoDB de respaldo...');
        await mongoose.disconnect().catch(() => {});
        await mongoose.connect(fallbackUri, getMongoOptions());
        isConnected = true;
        console.log('✅ MongoDB conectado usando URI de respaldo');
        return;
      } catch (fallbackError) {
        console.error('❌ Error conectando a MongoDB de respaldo:', fallbackError.message || fallbackError);
      }
    }

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
