// Script to reset the password of the test user in the users microservice
// Usage: run from the users-microservice root with `node .\scripts\resetTestUserPassword.js`

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
    console.log('🔌 Connected to MongoDB for password reset');

    const username = 'matiasmartinez';
    const email = 'vecchiomartinez2002@gmail.com';
    const newPlainPassword = 'Matias1302';

    const user = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (!user) {
      console.error('❌ No test user found, cannot reset password');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('👀 Usuario encontrado, reseteando contraseña...', {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    user.password = newPlainPassword;
    await user.save();

    console.log('✅ Contraseña reseteada correctamente para usuario:', {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during password reset:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
