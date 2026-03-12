#!/usr/bin/env node
// simple E2E check: token from users-microservice must work in backend-data-intake
// Usage: node scripts/e2e-token-test.js
//
// The script does two GETs against intake and prints status/body/headers.
// It never prints the full token (only length+head).

const fetch = global.fetch || require('node-fetch');

async function main() {
  try {
    // 1) login to users-microservice
    const loginUrl = 'http://localhost:4001/api/auth/login';
    const credentials = { identifier: 'admin', password: 'admin123' };

    console.log('POST', loginUrl);
    const loginResp = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const loginBody = await loginResp.text();
    let json;
    try { json = JSON.parse(loginBody); } catch (_) { json = null; }

    console.log('->', loginResp.status);
    console.log(loginBody);

    if (!json || !json.token) {
      console.error('login failed or no token in response');
      process.exit(1);
    }
    const token = json.token;
    const safeToken = token.slice(0, 10) + '...' + '(len=' + token.length + ')';
    console.log('obtained token', safeToken);

    // helper for requests
    async function doGet(url) {
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const bodyText = await resp.text();
      let bodyJson;
      try { bodyJson = JSON.parse(bodyText); } catch (_) { bodyJson = bodyText; }
      console.log(`\nGET ${url}`);
      console.log('status', resp.status);
      console.log('headers:');
      resp.headers.forEach((v,k) => console.log(`  ${k}: ${v}`));
      console.log('body:', bodyJson);
    }

    await doGet('http://localhost:3005/api/whoami');
    await doGet('http://localhost:3005/api/clientes?skip=0&limit=10');
  } catch (err) {
    console.error('error in script', err);
  }
}

main();