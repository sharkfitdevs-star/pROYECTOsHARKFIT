// Conector MongoDB externo: lee colecciones, aplana objetos, soporta URI Atlas/manual
const { MongoClient } = require('mongodb');

function flatten(obj, prefix = '', res = {}) {
  for (const key in obj) {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) flatten(val, newKey, res);
    else res[newKey] = val;
  }
  return res;
}

async function readMongoCollections(uri, { database, collections, limit = 100 }) {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000
  });
  await client.connect();
  const db = client.db(database);
  const colls = collections && collections.length ? collections : (await db.listCollections().toArray()).map(c => c.name);
  const result = {};
  for (const name of colls) {
    const docs = await db.collection(name).find({}).limit(limit).toArray();
    result[name] = docs.map(d => flatten(d));
  }
  await client.close();
  return result;
}

module.exports = {
  read: async (source, config) => {
    const { uri, host, port, database, user, password, collections, limit } = config;
    let mongoUri = uri;
    if (!mongoUri) {
      // Construir URI manual
      const auth = user && password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : '';
      mongoUri = `mongodb://${auth}${host || 'localhost'}:${port || 27017}`;
    }
    return await readMongoCollections(mongoUri, { database, collections, limit });
  }
};
