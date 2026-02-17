// SQLite support removed — this module no longer exists in the MongoDB-backed architecture.
// Any attempt to import the old sqlite helper will fail fast to avoid accidental usage.

throw new Error('Deprecated: SQLite support removed. Use MONGODB_URI and the Mongo-backed repository (src/db/evoRepository.js).');
