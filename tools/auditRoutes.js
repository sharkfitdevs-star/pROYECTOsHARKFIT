// simple auditing script to hit backend and proxy routes
// requires Node 18+ where "fetch" is global; if not, install undici

(async function () {
  const urls = [
    'http://127.0.0.1:3005/api/settings/imports-connection',
    'http://localhost:3000/api/settings/imports-connection',
    'http://127.0.0.1:3005/api/clientes',
    'http://localhost:3000/api/clientes'
  ];

  // ensure fetch exists
  if (typeof fetch !== 'function') {
    try {
      global.fetch = (await import('undici')).fetch;
    } catch (e) {
      console.error('fetch not available; please run `npm install undici`');
      process.exit(1);
    }
  }

  for (const url of urls) {
    const start = Date.now();
    let res, text;
    try {
      res = await fetch(url);
      text = await res.text();
    } catch (err) {
      console.log(`\nURL: ${url}`);
      console.log('  error:', err.message || err);
      continue;
    }
    const ms = Date.now() - start;
    const ok = res.ok;
    const status = res.status;
    const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim();
    console.log(`\nURL: ${url}`);
    console.log(`  status: ${status}  ok: ${ok}  time: ${ms}ms`);
    console.log(`  bodySnippet: ${snippet}`);
    if (status >= 400) {
      console.log('  full body:');
      console.log(text);
    }
  }
})();
