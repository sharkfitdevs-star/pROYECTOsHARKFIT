/**
 * SEED OWNER: Crea automáticamente el primer usuario owner
 * Se ejecuta al iniciar el servidor si no existe ningún usuario
 */

const { Usuario } = require('../models');
const { logger } = require('./logger');

const seedOwner = async () => {
  try {
    const userCount = await Usuario.countDocuments();

    if (userCount > 0) {
      logger.info('✅ Usuarios existentes, omitiendo seed de owner');
      return;
    }

    // Obtener credenciales de owner desde variables de entorno
    const ownerEmail = process.env.SEED_OWNER_EMAIL;
    const ownerPassword = process.env.SEED_OWNER_PASSWORD;
    const ownerFirstName = process.env.SEED_OWNER_FIRSTNAME || 'Admin';
    const ownerLastName = process.env.SEED_OWNER_LASTNAME || 'Principal';
    const ownerUsername = process.env.SEED_OWNER_USERNAME || 'admin';

    if (!ownerEmail || !ownerPassword) {
      logger.warn('⚠️  SEED_OWNER_EMAIL y SEED_OWNER_PASSWORD no configurados');
      logger.warn('⚠️  No se creará usuario owner automáticamente');
      logger.warn('');
      logger.warn('📝 Para crear el primer usuario owner:');
      logger.warn('   1. Configura SEED_OWNER_PASSWORD en .env con TU contraseña');
      logger.warn('   2. Reinicia el servidor');
      logger.warn('   O ejecuta: npm run create-owner (modo interactivo)');
      return;
    }

    // Validar longitud mínima de password
    if (ownerPassword.length < 8) {
      logger.error('❌ SEED_OWNER_PASSWORD debe tener al menos 8 caracteres');
      logger.error('💡 Recomendado: 16+ caracteres con mayúsculas, números y símbolos');
      return;
    }

    // Recomendación de seguridad
    if (ownerPassword.length < 16) {
      logger.warn(`⚠️  SEED_OWNER_PASSWORD tiene ${ownerPassword.length} caracteres`);
      logger.warn('💡 Recomendado: 16+ caracteres para mayor seguridad');
    }

    logger.info('🔑 Creando usuario owner inicial...');

    const owner = new Usuario({
      firstName: ownerFirstName,
      lastName: ownerLastName,
      username: ownerUsername.toLowerCase(),
      email: ownerEmail.toLowerCase(),
      password: ownerPassword, // Se hashea automáticamente en pre-save hook
      role: 'owner',
      status: 'active',
      active: true,
      emailVerifiedAt: new Date() // Owner inicial ya verificado
    });

    await owner.save();

    logger.info('✅ Usuario owner creado exitosamente');
    logger.info(`   Email: ${ownerEmail}`);
    logger.info(`   Username: ${ownerUsername}`);
    logger.info(`   Role: owner`);
    logger.info('🔒 Cambia la contraseña después del primer login');

  } catch (error) {
    logger.error('❌ Error creando usuario owner:', error.message);
    // No lanzar error para no detener el servidor
  }
};

module.exports = { seedOwner };
