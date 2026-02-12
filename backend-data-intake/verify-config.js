#!/usr/bin/env node

/**
 * SCRIPT DE VERIFICACIÓN DE CONFIGURACIÓN DE COOKIES
 * Ejecutar antes de arrancar el servidor para validar la configuración
 */

require('dotenv').config();

const checks = {
  passed: [],
  warnings: [],
  errors: []
};

console.log('\n🔍 VERIFICACIÓN DE CONFIGURACIÓN DE COOKIES\n');
console.log('='.repeat(60));

// 1. Verificar variables de entorno requeridas
const cookieSamesite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
const cookieSecure = String(process.env.COOKIE_SECURE).toLowerCase();
const nodeEnv = process.env.NODE_ENV || 'development';

console.log('\n📋 Variables de entorno detectadas:');
console.log(`   COOKIE_SAMESITE: ${cookieSamesite}`);
console.log(`   COOKIE_SECURE: ${cookieSecure}`);
console.log(`   NODE_ENV: ${nodeEnv}`);

// 2. Validar COOKIE_SAMESITE
console.log('\n✅ Validando COOKIE_SAMESITE...');
const validSameSites = ['lax', 'strict', 'none'];
if (!validSameSites.includes(cookieSamesite)) {
  checks.warnings.push(`COOKIE_SAMESITE='${cookieSamesite}' no es válido. Valores permitidos: lax, strict, none. Se usará 'lax' por defecto.`);
} else {
  checks.passed.push(`COOKIE_SAMESITE='${cookieSamesite}' es válido`);
}

// 3. Validar COOKIE_SECURE
console.log('✅ Validando COOKIE_SECURE...');
const isSecure = cookieSecure === 'true';
if (cookieSecure !== 'true' && cookieSecure !== 'false') {
  checks.warnings.push(`COOKIE_SECURE='${cookieSecure}' no es booleano válido. Se interpretará como 'false'.`);
} else {
  checks.passed.push(`COOKIE_SECURE=${isSecure}`);
}

// 4. Validar combinación crítica: SameSite=none + Secure=false
console.log('✅ Validando combinación SameSite=none + Secure...');
if (cookieSamesite === 'none' && !isSecure) {
  const msg = 'CONFIGURACIÓN INVÁLIDA: COOKIE_SAMESITE=none requiere COOKIE_SECURE=true. Los navegadores modernos ignorarán esta cookie.';
  
  if (nodeEnv === 'production') {
    checks.errors.push(msg);
  } else {
    checks.warnings.push(msg + ' (solo warning en desarrollo)');
  }
} else if (cookieSamesite === 'none' && isSecure) {
  checks.passed.push('SameSite=none con Secure=true es correcto para cross-domain HTTPS');
}

// 5. Verificar JWT secrets
console.log('✅ Validando JWT secrets...');
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const defaultSecrets = ['change-me', 'sharkfit-access-secret-change-me', 'sharkfit-super-secret-key-2024-cambiar-en-produccion'];
const weakSecrets = defaultSecrets.filter(s => jwtAccessSecret === s);

if (nodeEnv === 'production' && weakSecrets.length > 0) {
  checks.errors.push('JWT_ACCESS_SECRET usa valor por defecto. CRÍTICO: genera un secret único de 64 bytes en producción.');
} else if (weakSecrets.length > 0) {
  checks.warnings.push('JWT_ACCESS_SECRET usa valor por defecto (OK para desarrollo, cambiar en producción)');
} else if (jwtAccessSecret && jwtAccessSecret.length < 64) {
  checks.warnings.push(`JWT_ACCESS_SECRET tiene solo ${jwtAccessSecret.length} caracteres. Recomendado: 128+ caracteres (64 bytes hex).`);
} else {
  checks.passed.push('JWT_ACCESS_SECRET configurado con valor personalizado y seguro');
}

// 6. Verificar seed owner
console.log('✅ Validando configuración de Seed Owner...');
const seedEmail = process.env.SEED_OWNER_EMAIL;
const seedPassword = process.env.SEED_OWNER_PASSWORD;

if (!seedPassword) {
  checks.warnings.push('SEED_OWNER_PASSWORD no configurada. No se creará usuario owner automáticamente. Ejecuta: npm run create-owner');
} else if (seedPassword.length < 16) {
  checks.warnings.push(`SEED_OWNER_PASSWORD tiene ${seedPassword.length} caracteres. Recomendado: 16+ caracteres para mayor seguridad.`);
} else {
  checks.passed.push('Seed owner configurado con password personalizada');
}

// 8. Verificar configuración de email
console.log('✅ Validando configuración de Email...');
const emailProvider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
const validProviders = ['console', 'sendgrid', 'mailgun'];

if (!validProviders.includes(emailProvider)) {
  checks.warnings.push(`EMAIL_PROVIDER='${emailProvider}' no es válido. Valores permitidos: console, sendgrid, mailgun. Se usará 'console' por defecto.`);
} else {
  checks.passed.push(`EMAIL_PROVIDER='${emailProvider}' configurado correctamente`);
}

if (emailProvider === 'sendgrid') {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (!sendgridKey || sendgridKey.includes('xxxxx')) {
    checks.warnings.push('EMAIL_PROVIDER=sendgrid pero SENDGRID_API_KEY no configurado. Emails se imprimirán en consola.');
  } else {
    checks.passed.push('SendGrid API Key configurado');
  }
}

if (emailProvider === 'mailgun') {
  const mailgunKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  if (!mailgunKey || !mailgunDomain) {
    checks.warnings.push('EMAIL_PROVIDER=mailgun pero MAILGUN_API_KEY o MAILGUN_DOMAIN no configurados. Emails se imprimirán en consola.');
  } else {
    checks.passed.push('Mailgun configurado correctamente');
  }
}

// 7. Recomendaciones según entorno
console.log('\n📌 Recomendaciones según entorno:');
if (nodeEnv === 'development') {
  console.log('   🔧 DESARROLLO:');
  console.log('      - Usa: COOKIE_SAMESITE=lax + COOKIE_SECURE=false');
  console.log('      - Servidor en: http://localhost:8000');
  console.log('      - Frontend en: http://localhost:5173');
} else if (nodeEnv === 'production') {
  console.log('   🚀 PRODUCCIÓN:');
  console.log('      - Mismo dominio: COOKIE_SAMESITE=lax + COOKIE_SECURE=true');
  console.log('      - Cross-domain: COOKIE_SAMESITE=none + COOKIE_SECURE=true');
  console.log('      - Servidor DEBE usar HTTPS');
}

// Mostrar resultados
console.log('\n' + '='.repeat(60));
console.log('\n📊 RESULTADOS:\n');

if (checks.passed.length > 0) {
  console.log('✅ PASADO:');
  checks.passed.forEach(msg => console.log(`   ✓ ${msg}`));
}

if (checks.warnings.length > 0) {
  console.log('\n⚠️  ADVERTENCIAS:');
  checks.warnings.forEach(msg => console.log(`   ⚠️  ${msg}`));
}

if (checks.errors.length > 0) {
  console.log('\n❌ ERRORES:');
  checks.errors.forEach(msg => console.log(`   ✗ ${msg}`));
  console.log('\n🚫 SERVIDOR NO PUEDE INICIAR CON ESTOS ERRORES\n');
  process.exit(1);
}

if (checks.warnings.length === 0 && checks.errors.length === 0) {
  console.log('\n🎉 CONFIGURACIÓN CORRECTA - Listo para iniciar servidor\n');
} else if (checks.errors.length === 0) {
  console.log('\n⚠️  CONFIGURACIÓN CON ADVERTENCIAS - Servidor puede iniciar pero revisa los warnings\n');
}

console.log('='.repeat(60) + '\n');
