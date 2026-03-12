#!/usr/bin/env node
// 
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  // parse argumentos
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('USO: node tools/reset-password.js <username|email> <newPassword>');
    console.error('Ejemplo: node tools/reset-password.js stafftest "NuevaClave123"');
    process.exit(1);
  }
  const [identifier, newPassword] = args;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI no está definido en el .env');
    process.exit(1);
  }

  // importar modelo (debe existir y no estar comentado)
  const User = require('../src/models/User');

  let conn;
  try {
    conn = await mongoose.connect(uri);

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      console.error(`Usuario no encontrado: ${identifier}`);
      process.exit(1);
    }

    user.password = newPassword;
    await user.save();

    console.log(`✅ Password actualizada para: ${user.username} ${user.email}`);
    process.exit(0);
  } catch (err) {
    console.error('Error al resetear password:', err.message || err);
    process.exit(1);
  } finally {
    try {
      if (mongoose.connection?.readyState === 1) {
        await mongoose.disconnect();
      }
    } catch (e) {
      // ignore disconnect errors
    }
  }
}

main();
