const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

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

const connectDB = async (uri) => {
  if (isConnected) {
    logger.info('📦 Ya conectado a MongoDB');
    return;
  }

  const finalUri = (uri || process.env.MONGODB_URI || '').trim();
  const fallbackUri = (process.env.MONGODB_URI_FALLBACK || process.env.MONGODB_URI_LOCAL || '').trim();

  if (!finalUri) {
    throw new Error('❌ MONGODB_URI no está definido. Configúralo en el archivo .env para conectar a MongoDB Atlas.');
  }

  try {
    await mongoose.connect(finalUri, getMongoOptions());

    isConnected = true;
    logger.info('✅ MongoDB conectado exitosamente');
    
    // Crear índices manualmente en background (no bloquea queries)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('📊 Creando índices en background...');
      mongoose.connection.collection('usuarios').createIndex({ username: 1, email: 1 });
    }
  } catch (error) {
    const hint = diagnoseMongoError(error);
    logger.error('❌ Error conectando a MongoDB:', { message: error.message || error, hint });
    logger.error(`💡 Diagnostico: ${hint}`);

    const hasFallback = fallbackUri && fallbackUri !== finalUri;
    if (hasFallback) {
      try {
        logger.warn('↩️ Intentando conexion MongoDB de respaldo...');
        await mongoose.disconnect().catch(() => {});
        await mongoose.connect(fallbackUri, getMongoOptions());
        isConnected = true;
        logger.info('✅ MongoDB conectado usando URI de respaldo');
        return;
      } catch (fallbackError) {
        logger.error('❌ Error conectando a MongoDB de respaldo:', { error: fallbackError.message || fallbackError });
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
    logger.info('🔌 MongoDB desconectado');
  } catch (error) {
    logger.error('❌ Error desconectando MongoDB:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
