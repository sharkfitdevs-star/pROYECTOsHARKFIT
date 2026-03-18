// simple audit script to compare backend and proxy responses
// run with `node tools/auditProxy.js` (requires Node 18+ for global fetch)

const urls = [
  'http://127.0.0.1:3005/api/settings/imports-connection',
  'http://localhost:3000/api/settings/imports-connection',
  'http://127.0.0.1:3005/api/clientes',
  'http://localhost:3000/api/clientes',
];

async function probe(url) {
  const start = Date.now();
  try {
    const res = await fetch(url);
    const elapsed = Date.now() - start;
    let text;
    try {
      text = await res.text();
    } catch (e) {
      text = `<failed to read body: ${e.message}>`;
    }
    const snippet = text ? text.slice(0, 200) : '';
    console.log(`URL: ${url}`);
    console.log(`  status: ${res.status} ok:${res.ok} time:${elapsed}ms`);
    console.log(`  body: ${snippet.replace(/\n/g, ' ')}`);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`URL: ${url}`);
    console.error(`  network error after ${elapsed}ms: ${err.message}`);
  }
}

async function main() {
  for (const u of urls) {
    await probe(u);
    console.log('----------------------------------');
  }
}

main().catch(e => console.error('fatal', e));
