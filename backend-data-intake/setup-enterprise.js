#!/usr/bin/env node

/**
 * 🔧 SETUP SCRIPT - Configuración automática de la arquitectura mejorada
 * 
 * Uso: node setup-enterprise.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🚀 SHARKFIT ENTERPRISE - SETUP v2.0                          ║
║  Workers + MongoDB + Health Checks                            ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // Detectar si .env existe
  const envPath = path.join(__dirname, '.env');
  const envExists = fs.existsSync(envPath);

  console.log(`⚙️  Detectamos: ${envExists ? '✅ .env existe' : '❌ .env no existe'}`);

  if (!envExists) {
    console.log('📝 Crearemos archivo .env...\n');

    const config = {
      PORT: await question('Puerto para backend-data-intake (default: 3001): ') || '3001',
      MONGODB_URI: await question('MongoDB URI (default: mongodb://localhost:27017/sharkfit): ') || 'mongodb://localhost:27017/sharkfit',
      EVO_BASE_URL: await question('EVO Base URL (default: https://evo-integracao.w12app.com.br): ') || 'https://evo-integracao.w12app.com.br',
      EVO_DNS: await question('EVO DNS: '),
      EVO_TOKEN: await question('EVO Token: '),
      W12_BASE_URL: await question('W12 Base URL: '),
      W12_DNS: await question('W12 DNS: '),
      W12_TOKEN: await question('W12 Token: '),
      DJANGO_BASE_URL: await question('Django Base URL (default: http://localhost:8000/api): ') || 'http://localhost:8000/api',
      NODE_ENV: await question('Entorno (development/production): ') || 'development'
    };

    const envContent = `
# 🚀 SHARKFIT ENTERPRISE v2.0
# Generado por setup-enterprise.js

# Server
PORT=${config.PORT}
NODE_ENV=${config.NODE_ENV}


# MongoDB
MONGODB_URI=${config.MONGODB_URI}

# EVO API
EVO_BASE_URL=${config.EVO_BASE_URL}
EVO_DNS=${config.EVO_DNS}
EVO_TOKEN=${config.EVO_TOKEN}

# W12 API
W12_BASE_URL=${config.W12_BASE_URL}
W12_DNS=${config.W12_DNS}
W12_TOKEN=${config.W12_TOKEN}

# Django
DJANGO_BASE_URL=${config.DJANGO_BASE_URL}

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Health Checks
HEALTH_CHECK_INTERVAL_MS=30000

# Sync
EXTERNAL_API_SYNC_MINUTES=180
POLL_MS=10000
`;

    fs.writeFileSync(envPath, envContent.trim());
    console.log('✅ Archivo .env creado\n');
  }

  // Verificar dependencias
  console.log('📦 Verificando dependencias...\n');

  const requiredPackages = [
    'agenda',
    'mongoose',
    'express-rate-limit'
  ];

  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  let missingPackages = [];

  for (const pkg of requiredPackages) {
    if (packageJson.dependencies[pkg]) {
      console.log(`✅ ${pkg}`);
    } else {
      console.log(`❌ ${pkg} - FALTA INSTALAR`);
      missingPackages.push(pkg);
    }
  }

  if (missingPackages.length > 0) {
    const install = await question(`\n🔧 ¿Instalar ${missingPackages.join(', ')}? (y/n): `);
    
    if (install.toLowerCase() === 'y') {
      console.log(`\n📥 Instalando: npm install ${missingPackages.join(' ')}`);
      require('child_process').spawnSync('npm', ['install', ...missingPackages], {
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log('✅ Dependencias instaladas');
    }
  }


  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sharkfit', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB conectado');
    await mongoose.disconnect();
  } catch (error) {
    console.log('❌ MongoDB no disponible - Asegúrate de tenerlo corriendo:');
    console.log('   docker run -d -p 27017:27017 mongo');
  }

  // Crear directorios necesarios
  console.log('\n📁 Creando directorios necesarios...\n');

  const dirs = [
    'logs',
    'uploads',
    'temp'
  ];

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Creado: ${dir}/`);
    } else {
      console.log(`✅ Existe: ${dir}/`);
    }
  }

  // Mostrar próximos pasos
  console.log(`\n
╔════════════════════════════════════════════════════════════════╗
║  ✅ SETUP COMPLETADO                                          ║
╚════════════════════════════════════════════════════════════════╝

📝 Próximos pasos:


2. Asegúrate de que MongoDB está corriendo:
   docker run -d -p 27017:27017 mongo

3. Inicia el servidor:
   npm run dev

4. En otra terminal, prueba el health check:
   curl http://localhost:3001/api/health

5. Lee la documentación:
   cat ARQUITECTURA_MEJORADA_v2.md

📊 Endpoints importantes:
   GET  /api/health              - Estado general del sistema
   POST /api/webhooks/evo        - Recibir webhooks de EVO
   POST /api/webhooks/w12        - Recibir webhooks de W12
   GET  /api/webhooks/stats      - Estadísticas de webhooks

🎉 ¡Tu sistema está listo para enterprise!
  `);

  rl.close();
}

main().catch(error => {
  console.error('❌ Error en setup:', error);
  process.exit(1);
});
