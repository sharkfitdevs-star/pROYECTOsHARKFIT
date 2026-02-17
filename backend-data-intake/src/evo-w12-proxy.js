// Entrypoint alias for the EVO W12 proxy. The implementation remains in
// `src/evo-w12-proxy-sqlite.js` for backward compatibility but the filename
// `evo-w12-proxy.js` should be used going forward (MongoDB-backed).

module.exports = require('./evo-w12-proxy-sqlite');
