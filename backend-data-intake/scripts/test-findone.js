const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const usuarioSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  password: {
    type: String,
    required: true
  },
  firstName: String,
  lastName: String,
  fullName: String,
  role: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'staff', 'viewer', 'instructor', 'recepcionista', 'vendedor'],
    required: true,
    index: true
  },
  permissions: [String],
  idBranch: { type: String, index: true },
  branchName: String,
  active: { type: Boolean, default: true, index: true },
  status: {
    type: String,
    enum: ['pending_verification', 'active', 'disabled', 'locked'],
    default: 'active',
    index: true
  },
  phone: String,
  cellPhone: String,
  avatar: String,
  bio: String,
  department: String,
  position: String,
  hireDate: Date,
  lastLogin: Date,
  emailVerifiedAt: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  preferences: {
    language: { type: String, default: 'es' },
    timezone: { type: String, default: 'America/Mexico_City' }
  },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'usuarios' });

const Usuario = mongoose.model('Usuario', usuarioSchema);

async function testFindOne() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    const uri = process.env.MONGODB_URI;
    console.log('📍 URI:', uri.replace(/:[^@]*@/, ':***@'));

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB conectado');

    console.log('\n🔍 Intentando findOne con timeout de 5 segundos...');
    const startTime = Date.now();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT: findOne tardó más de 5 segundos'));
      }, 5000);
    });

    const findOnePromise = Usuario.findOne({ username: 'admin' });

    try {
      const result = await Promise.race([findOnePromise, timeoutPromise]);
      const elapsed = Date.now() - startTime;
      console.log(`✅ findOne completó en ${elapsed}ms`);
      if (result) {
        console.log('👤 Usuario encontrado:', result.username, result.email);
      } else {
        console.log('❌ Usuario no encontrado');
      }
    } catch (timeoutError) {
      console.log('❌ TIMEOUT en findOne:', timeoutError.message);
    }

    console.log('\n🔍 Intentando find() simple...');
    const allUsers = await Usuario.find().limit(5);
    console.log(`✅ find() encontró ${allUsers.length} usuarios`);

    console.log('\n✅ Todas las pruebas completadas');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testFindOne();
