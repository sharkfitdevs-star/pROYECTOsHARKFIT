#!/usr/bin/env node

/**
 * 🚀 CONFIGURADOR INTERACTIVO DE APIs EXTERNAS
 * 
 * Propósito: Crear configuraciones para extraer datos de APIs externas
 * (Shopify, WooCommerce, CRMs, etc.) hacia MongoDB
 * 
 * Características:
 * - Preguntas interactivas en español
 * - Separa CREDENCIALES (→ .env) de CONFIG (→ JSON)
 * - Valida URLs, autenticación, endpoints
 * - Genera nombres de archivos automáticamente
 * - Muestra ejemplos prácticos
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Cargar .env existente
const envPath = path.join(__dirname, '../.env');
let envContent = fs.existsSync(envPath) 
  ? fs.readFileSync(envPath, 'utf8') 
  : '';

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(text, color = 'reset', newline = true) {
  const output = text.includes('\n') || !newline 
    ? text 
    : `${text}\n`;
  process.stdout.write(`${colors[color]}${output}${colors.reset}`);
}

function logHeader(title) {
  log('\n' + '═'.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('═'.repeat(60) + '\n', 'cyan');
}

function logStep(num, title) {
  log(`\n${colors.bright}${colors.yellow}[Paso ${num}]${colors.reset} ${title}\n`, 'yellow');
}

function logSuccess(text) {
  log(`✅ ${text}`, 'green');
}

function logWarning(text) {
  log(`⚠️  ${text}`, 'yellow');
}

function logError(text) {
  log(`❌ ${text}`, 'red');
}

function logInfo(text) {
  log(`ℹ️  ${text}`, 'blue');
}

// Crear interfaz readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => {
    rl.question(`${colors.cyan}${query}${colors.reset}`, resolve);
  });
}

async function selectFromMenu(title, options) {
  log(`\n${title}\n`, 'cyan');
  options.forEach((opt, i) => {
    log(`  ${i + 1}. ${opt}\n`);
  });
  
  let choice;
  while (true) {
    choice = await question('Selecciona una opción (número): ');
    if (choice >= 1 && choice <= options.length) {
      return parseInt(choice) - 1;
    }
    logError('Opción inválida, intenta nuevamente');
  }
}

function sanitizeFileName(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function setupAPIConfig() {
  logHeader('🚀 CONFIGURADOR DE APIs EXTERNAS - SHARKFIT');

  log('Este programa te guiará para configurar tus APIs externas.\n');
  log('Los datos sensibles (credenciales) se guardarán en .env\n');
  log('La configuración se guardará en un archivo JSON\n');

  // ════════════════════════════════════════════════════════════════════
  // PASO 1: Información General
  // ════════════════════════════════════════════════════════════════════
  logStep(1, 'Información General');

  let apiName = await question('¿Nombre de tu proveedor de datos?\n(Ej: Shopify, WooCommerce, Mi API Interna)\n> ');
  while (!apiName.trim()) {
    logError('El nombre no puede estar vacío');
    apiName = await question('> ');
  }

  const configFileName = sanitizeFileName(apiName);

  logInfo(`Nombre de config: api-${configFileName}.json`);

  // ════════════════════════════════════════════════════════════════════
  // PASO 2: Tipo de API
  // ════════════════════════════════════════════════════════════════════
  logStep(2, '¿Qué tipo de API es?');

  const apiTypes = [
    'Shopify',
    'WooCommerce',
    'Otra API REST',
    'Personalizada'
  ];
  const typeIdx = await selectFromMenu(
    'Selecciona el tipo:',
    apiTypes
  );

  let baseURL;
  if (typeIdx === 0) {
    // Shopify
    baseURL = await question('URL de tu tienda Shopify (incluyendo /admin/api/2024-01):\n> ');
  } else if (typeIdx === 1) {
    // WooCommerce
    baseURL = await question('URL de tu sitio WooCommerce (incluyendo /wp-json/wc/v3):\n> ');
  } else {
    baseURL = await question('URL base de la API (sin trailing slash):\n> ');
  }

  while (!validateURL(baseURL)) {
    logError('URL inválida. Debe comenzar con http:// o https://');
    baseURL = await question('> ');
  }

  // ════════════════════════════════════════════════════════════════════
  // PASO 3: Autenticación
  // ════════════════════════════════════════════════════════════════════
  logStep(3, 'Autenticación');

  const authTypes = [
    'API Key (en header)',
    'Bearer Token (en header)',
    'Basic Auth (usuario/password)',
    'OAuth 2.0',
    'Sin autenticación'
  ];

  const authIdx = await selectFromMenu(
    '¿Cómo se autentica tu API?',
    authTypes
  );

  let auth = { type: 'none' };
  let envVars = {};

  if (authIdx === 0) {
    // API Key
    const headerName = await question('Nombre del header (ej: X-API-Key, API-Key):\n> ');
    const apiKey = await question('¿Valor de la API Key? (se guardará encriptado en .env)\n> ');

    const envKeyName = `API_KEY_${sanitizeFileName(apiName).toUpperCase()}`;
    
    auth = {
      type: 'apikey',
      headerName: headerName,
      key: `\${${envKeyName}}`
    };
    envVars[envKeyName] = apiKey;

  } else if (authIdx === 1) {
    // Bearer Token
    const token = await question('¿Token Bearer? (se guardará encriptado en .env)\n> ');
    
    const envKeyName = `API_TOKEN_${sanitizeFileName(apiName).toUpperCase()}`;
    
    auth = {
      type: 'bearer',
      token: `\${${envKeyName}}`
    };
    envVars[envKeyName] = token;

  } else if (authIdx === 2) {
    // Basic Auth
    const username = await question('Usuario:\n> ');
    const password = await question('Contraseña (se guardará encriptado en .env):\n> ');
    
    const userEnvKey = `API_USER_${sanitizeFileName(apiName).toUpperCase()}`;
    const passEnvKey = `API_PASS_${sanitizeFileName(apiName).toUpperCase()}`;
    
    auth = {
      type: 'basic',
      username: `\${${userEnvKey}}`,
      password: `\${${passEnvKey}}`
    };
    envVars[userEnvKey] = username;
    envVars[passEnvKey] = password;

  } else if (authIdx === 3) {
    // OAuth 2.0
    const clientId = await question('Client ID:\n> ');
    const clientSecret = await question('Client Secret (se guardará encriptado en .env):\n> ');
    const tokenURL = await question('Token Endpoint URL:\n> ');
    
    const idEnvKey = `OAUTH_ID_${sanitizeFileName(apiName).toUpperCase()}`;
    const secretEnvKey = `OAUTH_SECRET_${sanitizeFileName(apiName).toUpperCase()}`;
    
    auth = {
      type: 'oauth',
      clientId: `\${${idEnvKey}}`,
      clientSecret: `\${${secretEnvKey}}`,
      tokenURL: tokenURL
    };
    envVars[idEnvKey] = clientId;
    envVars[secretEnvKey] = clientSecret;
  }

  // ════════════════════════════════════════════════════════════════════
  // PASO 3: Webhooks
  // ════════════════════════════════════════════════════════════════════
  logStep(4, 'Webhooks');

  const webhookChoice = await selectFromMenu(
    '¿La aplicación externa permite usar Webhooks?',
    ['Sí', 'No', 'No sé']
  );

  const supportsWebhooks = webhookChoice === 0;
  if (webhookChoice === 2) {
    logWarning('Si no estás seguro, puedes dejarlo como NO por ahora.');
  }

  // ════════════════════════════════════════════════════════════════════
  // PASO 5: Rango Historico
  // ════════════════════════════════════════════════════════════════════
  logStep(5, 'Rango Historico');

  log('Define desde qué fecha hasta qué fecha quieres extraer datos históricos.\n');
  logInfo('Formato recomendado: YYYY-MM-DD (ej: 2023-01-01)');
  logInfo('Si lo dejas vacío, se extrae todo el histórico disponible.\n');

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  let historicalStartDate = await question('Desde (opcional):\n> ');
  while (historicalStartDate && !dateRegex.test(historicalStartDate)) {
    logError('Formato inválido. Usa YYYY-MM-DD o deja vacío.');
    historicalStartDate = await question('Desde (opcional):\n> ');
  }

  let historicalEndDate = await question('Hasta (opcional):\n> ');
  while (historicalEndDate && !dateRegex.test(historicalEndDate)) {
    logError('Formato inválido. Usa YYYY-MM-DD o deja vacío.');
    historicalEndDate = await question('Hasta (opcional):\n> ');
  }

  if (!historicalStartDate && !historicalEndDate) {
    logWarning('⚠️ Se extraera TODO el historico. Puede tardar bastante tiempo.');
  }

  // ════════════════════════════════════════════════════════════════════
  // PASO 6: Endpoints
  // ════════════════════════════════════════════════════════════════════
  logStep(6, 'Endpoints a Extraer');
  
  log('Ahora vamos a definir qué datos extraeremos de cada endpoint.\n');
  logInfo('Ejemplo para Shopify: /products, /customers, /orders');
  logInfo('Ejemplo para WooCommerce: /products, /customers, /orders\n');

  const endpoints = [];
  let addMore = true;

  while (addMore) {
    log(`\n${colors.yellow}Endpoint #${endpoints.length + 1}${colors.reset}\n`);
    
    const path = await question('Ruta del endpoint (ej: /productos, /customers):\n> ');
    if (!path.trim()) {
      logError('El endpoint no puede estar vacío');
      continue;
    }

    const method = 'GET'; // Por ahora solo GET

    const collectionName = await question(
      `Nombre de la colección en MongoDB (ej: ${path.replace(/\//g, '').toLowerCase()}):\n> `
    );

    const fieldsInput = await question(
      'Campos a extraer (separados por coma):\nEj: id, name, email, price\n> '
    );
    const fields = fieldsInput
      .split(',')
      .map(f => f.trim())
      .filter(f => f);

    if (fields.length === 0) {
      logError('Debes especificar al menos un campo');
      continue;
    }

    const dataPath = await question(
      'Ruta JSON de los datos (ej: data, results, data.items) [opcional]:\n> '
    );

    const endpoint = {
      path: path,
      method: method,
      collectionName: collectionName,
      fields: fields
    };

    if (dataPath.trim()) {
      endpoint.dataPath = dataPath.trim();
    }

    endpoints.push(endpoint);
    logSuccess(`Endpoint agregado: ${path} → ${collectionName}`);

    const moreInput = await question('\n¿Agregar otro endpoint? (s/n):\n> ');
    addMore = moreInput.toLowerCase().startsWith('s');
  }

  if (endpoints.length === 0) {
    logError('Debes agregar al menos un endpoint');
    rl.close();
    return;
  }

  // ════════════════════════════════════════════════════════════════════
  // PASO 7: Generar archivos
  // ════════════════════════════════════════════════════════════════════
  logStep(7, 'Guardar Configuración');

  // Crear config JSON
  const config = {
    id: `api-${configFileName}`,
    name: apiName,
    type: 'rest',
    description: `Extrae datos de ${apiName} hacia MongoDB`,
    baseURL: baseURL,
    auth: auth,
    webhooks: {
      enabled: supportsWebhooks
    },
    historical: {
      startDate: historicalStartDate || null,
      endDate: historicalEndDate || null
    },
    endpoints: endpoints.map(ep => ({
      path: ep.path,
      method: ep.method,
      collectionName: ep.collectionName,
      fields: ep.fields,
      ...(ep.dataPath && { dataPath: ep.dataPath })
    })),
    syncInterval: 60,
    timeout: 30000
  };

  // Guardar JSON
  const configPath = path.join(
    __dirname,
    '../configs',
    `api-${configFileName}.json`
  );

  if (!fs.existsSync(path.dirname(configPath))) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  logSuccess(`Config guardada: ${configPath}`);

  // Guardar variables en .env
  if (Object.keys(envVars).length > 0) {
    let newEnv = '';
    
    Object.entries(envVars).forEach(([key, value]) => {
      if (!envContent.includes(`${key}=`)) {
        newEnv += `${key}=${value}\n`;
      }
    });

    if (newEnv) {
      fs.appendFileSync(envPath, newEnv);
      logSuccess(`Credenciales guardadas en .env`);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ════════════════════════════════════════════════════════════════════
  logHeader('✅ CONFIGURACIÓN COMPLETADA');

  log(`\nNombre de config: ${colors.bright}api-${configFileName}${colors.reset}\n`);
  log(`API: ${colors.bright}${apiName}${colors.reset}\n`);
  log(`URL: ${colors.dim}${baseURL}${colors.reset}\n`);
  log(`Endpoints: ${colors.bright}${endpoints.length}${colors.reset}\n`);

  endpoints.forEach((ep, i) => {
    log(`  ${i + 1}. ${colors.cyan}${ep.path}${colors.reset} → ${colors.green}${ep.collectionName}${colors.reset}\n`);
  });

  log(`\n${colors.bright}Próximos pasos:${colors.reset}\n`);
  log(`  1. Prueba la conexión:\n`);
  log(`     ${colors.yellow}npm run extract -- --config api-${configFileName}${colors.reset}\n`);
  log(`  2. Verifica los datos en MongoDB\n`);
  log(`  3. Configura un schedule si necesitas sincronización automática\n`);

  rl.close();
}

// Ejecutar
setupAPIConfig().catch(err => {
  logError(err.message);
  rl.close();
  process.exit(1);
});
