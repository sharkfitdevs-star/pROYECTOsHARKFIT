#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const { Usuario } = require('../src/models');
const { logger } = require('../src/utils/logger');

const MONGODB_URI = process.env.MONGODB_URI;

const debug = async () => {
  try {
    console.log('🔍 DEBUG: Verificando conexión y datos...\n');
    console.log(`📍 MONGODB_URI: ${MONGODB_URI}\n`);

    logger.info('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('✅ Conectado a MongoDB\n');

    // Contar usuarios
    const userCount = await Usuario.countDocuments();
    console.log(`📊 Total de usuarios en DB: ${userCount}\n`);

    // Buscar admin
    const admin = await Usuario.findOne({ username: 'admin' });
    
    if (admin) {
      console.log('✅ ADMIN ENCONTRADO:');
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.status}`);
      console.log(`   Active: ${admin.active}`);
      console.log(`   Hash de password: ${admin.password.substring(0, 20)}...`);
      console.log(`\n🧪 PROBANDO COMPARACIÓN DE PASSWORD:`);

      const match = await admin.comparePassword('Sharkfit2024!');
      console.log(`   ¿Password coincide? ${match ? '✅ SÍ' : '❌ NO'}`);
    } else {
      console.log('❌ ADMIN NO ENCONTRADO');
      console.log('   Creando nuevo admin...');
      
      const newAdmin = new Usuario({
        firstName: 'Admin',
        lastName: 'Principal',
        username: 'admin',
        email: 'admin@sharkfit.com',
        password: 'Sharkfit2024!',
        role: 'owner',
        status: 'active',
        active: true,
        emailVerifiedAt: new Date()
      });

      await newAdmin.save();
      console.log('✅ Admin creado exitosamente');
    }

    // Listar todos los usuarios
    const allUsers = await Usuario.find({}, { username: 1, email: 1, role: 1, status: 1 });
    console.log(`\n📋 TODOS LOS USUARIOS:`);
    allUsers.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.username} (${u.email}) - ${u.role} - ${u.status}`);
    });

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

debug();
