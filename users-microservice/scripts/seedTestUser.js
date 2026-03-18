// Script to seed a test user into the same MongoDB used by the users microservice
// Usage: run from the users-microservice root with `node .\scripts\seedTestUser.js`

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not defined - cannot connect');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('🔌 Connected to MongoDB for seeding');

    const username = 'matiasmartinez';
    const email = 'vecchiomartinez2002@gmail.com';
    const plainPassword = 'Matias1302';

    let user = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (user) {
      console.log('⚠️ Usuario YA existía en esta DB:', {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      });

      // si se quiere forzar reseteo de contraseña al hacer el seed,
      // activar variable de entorno FORCE_RESET_TEST_USER_PASSWORD=true
      if (process.env.FORCE_RESET_TEST_USER_PASSWORD === 'true') {
        console.log('🔁 Forzando reseteo de contraseña via FORCE_RESET_TEST_USER_PASSWORD');
        user.password = plainPassword;
        await user.save();
        console.log('✅ Contraseña actualizada (force) para usuario existente');
      }
    } else {
      user = new User({
        username,
        email,
        password: plainPassword,
        fullName: 'Usuario Prueba Sharkfit',
        role: 'user',
        active: true,
      });
      await user.save();
      console.log('✅ Usuario creado correctamente en esta DB:', {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      });
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
