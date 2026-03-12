/**
 * TEST: Endpoints EVO - Prueba rápida desde terminal
 * Uso: node test-evo-endpoints.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const axios = require('axios');

const BASE_URL = process.env.EVO_BASE_URL || 'https://evo-integracao-api.w12app.com.br';
const USERNAME = process.env.EVO_DNS;
const PASSWORD = process.env.EVO_TOKEN;

if (!USERNAME || !PASSWORD) {
  console.error('❌ Faltan credenciales EVO en .env.local');
  console.error('   Necesitas: EVO_USERNAME (o EVO_DNS) y EVO_PASSWORD (o EVO_API_KEY)');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  auth: { username: USERNAME, password: PASSWORD },
  timeout: 15000,
  params: { take: 3, skip: 0 }
});

const ENDPOINTS = [
  { path: '/api/v2/sales',                         name: 'Ventas v2',              dataPath: 'items' },
  { path: '/api/v1/sales/by-session-id',           name: 'Ventas por sesión',      dataPath: 'items' },
  { path: '/api/v1/prospects',                     name: 'Prospectos',             dataPath: 'items' },
  { path: '/api/v1/members',                       name: 'Miembros',               dataPath: 'items' },
  { path: '/api/v1/members/services',              name: 'Servicios miembros',     dataPath: 'items' },
  { path: '/api/v1/payables',                      name: 'Cuentas por cobrar',     dataPath: 'items' },
  { path: '/api/v1/revenuecenter',                 name: 'Centro de ingresos',     dataPath: 'items' },
  { path: '/api/v2/management/activeclients',      name: 'Clientes activos mgmt',  dataPath: 'clients' },
  { path: '/api/v2/management/prospects',          name: 'Prospectos mgmt',        dataPath: 'prospects' },
  { path: '/api/v2/management/not-renewed',        name: 'No renovados',           dataPath: 'clients' },
];

function extractData(response, dataPath) {
  const d = response.data;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (d[dataPath] && Array.isArray(d[dataPath])) return d[dataPath];
  // intentar cualquier array en la respuesta
  for (const key of Object.keys(d)) {
    if (Array.isArray(d[key])) return d[key];
  }
  return [];
}

async function testEndpoint(ep) {
  try {
    const res = await client.get(ep.path);
    const items = extractData(res, ep.dataPath);
    const status = res.status;
    const keys = items.length > 0 ? Object.keys(items[0]).join(', ') : 'sin registros';
    console.log(`✅ [${status}] ${ep.name.padEnd(25)} → ${items.length} registros`);
    if (items.length > 0) {
      console.log(`   Campos: ${keys.substring(0, 120)}${keys.length > 120 ? '...' : ''}`);
    }
    return { path: ep.path, ok: true, count: items.length, fields: Object.keys(items[0] || {}) };
  } catch (err) {
    const status = err.response?.status || 'ERR';
    const msg = err.response?.data?.message || err.message;
    console.log(`❌ [${status}] ${ep.name.padEnd(25)} → ${msg}`);
    return { path: ep.path, ok: false, status, error: msg };
  }
}

async function main() {
  console.log('\n════════════════════════════════════════');
  console.log('  TEST ENDPOINTS EVO - SharkFit');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Usuario:  ${USERNAME}`);
  console.log('════════════════════════════════════════\n');

  const results = [];
  for (const ep of ENDPOINTS) {
    const r = await testEndpoint(ep);
    results.push(r);
    await new Promise(r => setTimeout(r, 300)); // rate limit
  }

  console.log('\n════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('════════════════════════════════════════');
  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  console.log(`  ✅ Exitosos: ${ok}/${results.length}`);
  console.log(`  ❌ Fallidos: ${fail}/${results.length}`);

  if (fail > 0) {
    console.log('\n  Endpoints fallidos:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`  - ${r.path} → [${r.status}] ${r.error}`);
    });
  }
  console.log('');
}

main().catch(console.error);

