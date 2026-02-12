#!/usr/bin/env node

/**
 * SCRIPT INTERACTIVO: Crear primer usuario Owner
 * Ejecutar con: npm run create-owner
 */

require('dotenv').config();
const readline = require('readline');
const { connectDB } = require('./src/db/mongodb');
const { Usuario } = require('./src/models');
const { logger } = require('./src/utils/logger');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createOwner = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('👤 CREAR PRIMER USUARIO OWNER');
  console.log('='.repeat(70) + '\n');

  try {
    // Conectar a MongoDB
    await connectDB();

    // Verificar si ya existen usuarios
    const userCount = await Usuario.countDocuments();
    if (userCount > 0) {
      console.log('⚠️  Ya existen usuarios en la base de datos');
      console.log(`📊 Total de usuarios: ${userCount}\n`);
      
      const confirmar = await question('¿Deseas crear otro usuario owner de todos modos? (s/N): ');
      if (confirmar.toLowerCase() !== 's' && confirmar.toLowerCase() !== 'si') {
        console.log('\n❌ Operación cancelada\n');
        process.exit(0);
      }
    }

    console.log('📝 Ingresa los datos del usuario owner:\n');

    // Solicitar datos
    const firstName = await question('Nombre: ');
    const lastName = await question('Apellido: ');
    const username = await question('Username: ');
    const email = await question('Email: ');

    // Solicitar password con validación
    let password = '';
    let passwordConfirm = '';
    let passwordValid = false;

    while (!passwordValid) {
      password = await question('\nContraseña (mínimo 8 caracteres): ');
      
      if (password.length < 8) {
        console.log('❌ La contraseña debe tener al menos 8 caracteres');
        continue;
      }

      if (password.length < 16) {
        console.log('⚠️  Recomendación: Usa al menos 16 caracteres para mayor seguridad');
      }

      passwordConfirm = await question('Confirmar contraseña: ');

      if (password !== passwordConfirm) {
        console.log('❌ Las contraseñas no coinciden. Intenta de nuevo.\n');
        continue;
      }

      passwordValid = true;
    }

    // Confirmar datos
    console.log('\n' + '-'.repeat(70));
    console.log('📋 CONFIRMA LOS DATOS:');
    console.log('-'.repeat(70));
    console.log(`Nombre:   ${firstName} ${lastName}`);
    console.log(`Username: ${username}`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${'*'.repeat(password.length)} (${password.length} caracteres)`);
    console.log(`Role:     owner`);
    console.log('-'.repeat(70) + '\n');

    const confirmar = await question('¿Crear usuario? (S/n): ');
    if (confirmar.toLowerCase() === 'n' || confirmar.toLowerCase() === 'no') {
      console.log('\n❌ Operación cancelada\n');
      process.exit(0);
    }

    // Crear usuario
    console.log('\n🔄 Creando usuario...');

    const owner = new Usuario({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: password, // Se hashea automáticamente en pre-save hook
      role: 'owner',
      status: 'active',
      active: true,
      emailVerifiedAt: new Date() // Owner creado manualmente ya verificado
    });

    await owner.save();

    console.log('\n' + '='.repeat(70));
    console.log('✅ USUARIO OWNER CREADO EXITOSAMENTE');
    console.log('='.repeat(70));
    console.log(`\n📧 Email:    ${email}`);
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Role:     owner`);
    console.log('\n💡 Ahora puedes hacer login con estas credenciales\n');

    process.exit(0);

  } catch (error) {
    if (error.code === 11000) {
      console.log('\n❌ ERROR: Email o username ya existe en la base de datos');
      console.log('💡 Usa un email y username diferentes\n');
    } else {
      console.error('\n❌ Error creando usuario:', error.message);
      console.error('\n📝 Stack trace:', error.stack);
    }
    process.exit(1);
  }
};

// Manejo de Ctrl+C
rl.on('SIGINT', () => {
  console.log('\n\n❌ Operación cancelada por el usuario\n');
  process.exit(0);
});

createOwner();
