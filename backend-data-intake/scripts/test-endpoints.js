const http = require('http');

function testEndpoint(path, method = 'POST', body = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`\n🔍 Probando: POST ${path}`);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/auth${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 3000 // 3 segundos timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        console.log(`✅ Respuesta en ${elapsed}ms`);
        console.log(`📩 Body: ${data.substring(0, 100)}`);
        resolve(true);
      });
    });

    req.on('timeout', () => {
      const elapsed = Date.now() - startTime;
      console.log(`❌ TIMEOUT después de ${elapsed}ms`);
      req.destroy();
      resolve(false);
    });

    req.on('error', (error) => {
      console.log(`❌ Error: ${error.message}`);
      resolve(false);
    });

    req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(50));
  console.log('TEST DE ENDPOINTS');
  console.log('='.repeat(50));

  await testEndpoint('/test-simple', 'POST', {});
  await testEndpoint('/test-findone', 'POST', { username: 'admin' });
  await testEndpoint('/health', 'GET');

  console.log('\n' + '='.repeat(50));
  process.exit(0);
}

runTests();
