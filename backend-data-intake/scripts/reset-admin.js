#!/usr/bin/env node

/**
 * RESET ADMIN USER
 * Limpia la colección de usuarios y crea un nuevo admin
 * Úsalo si olvidaste la contraseña o necesitas resetear
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Usuario } = require('../src/models');
const { logger } = require('../src/utils/logger');

const MONGODB_URI = process.env.MONGODB_URI;

const resetAdmin = async () => {
  try {
    if (!MONGODB_URI) {
      logger.error('❌ MONGODB_URI no configurada en .env');
      process.exit(1);
    }

    logger.info('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('✅ Conectado a MongoDB');

    // Obtener credenciales del .env
    const ownerEmail = process.env.SEED_OWNER_EMAIL || 'admin@sharkfit.com';
    const ownerPassword = process.env.SEED_OWNER_PASSWORD;
    const ownerUsername = process.env.SEED_OWNER_USERNAME || 'admin';

    if (!ownerPassword) {
      logger.error('❌ SEED_OWNER_PASSWORD no está configurada en .env');
      logger.error('💡 Configura la contraseña en .env y vuelve a ejecutar');
      process.exit(1);
    }

    logger.warn('⚠️  ADVERTENCIA: Se eliminarán TODOS los usuarios');
    logger.warn(`   Email del nuevo admin: ${ownerEmail}`);
    logger.warn(`   Username: ${ownerUsername}`);
    logger.warn('');

    // Eliminar todos los usuarios
    logger.info('🗑️  Eliminando usuarios existentes...');
    const result = await Usuario.deleteMany({});
    logger.info(`   ${result.deletedCount} usuario(s) eliminado(s)`);

    // Crear nuevo admin
    logger.info('🔑 Creando nuevo usuario admin...');
    const owner = new Usuario({
      firstName: process.env.SEED_OWNER_FIRSTNAME || 'Admin',
      lastName: process.env.SEED_OWNER_LASTNAME || 'Principal',
      username: ownerUsername.toLowerCase(),
      email: ownerEmail.toLowerCase(),
      password: ownerPassword,
      role: 'owner',
      status: 'active',
      active: true,
      emailVerifiedAt: new Date()
    });

    await owner.save();

    logger.info('✅ Usuario admin creado exitosamente');
    logger.info('');
    logger.info('📝 CREDENCIALES:');
    logger.info(`   Email/Username: ${ownerUsername} o ${ownerEmail}`);
    logger.info(`   Contraseña: ${ownerPassword}`);
    logger.info('');
    logger.info('🚀 Ahora puedes loguearte en el dashboard');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetAdmin();
