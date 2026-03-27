// _audit_data.js
// Script de auditoría de datos reales en MongoDB
// Ejecutar con: node src/_audit_data.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

(async () => {
  try {
    const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI;
    if (!dbUri) throw new Error('No se encontró la variable de entorno MONGODB_URI');
    await mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const collections = await mongoose.connection.db.listCollections().toArray();
    const resumen = [];
    for (const col of collections) {
      const name = col.name;
      const coll = mongoose.connection.db.collection(name);
      const total = await coll.countDocuments();
      const example = await coll.findOne();
      let fechas = [];
      let nums = [];
      if (example) {
        for (const [k, v] of Object.entries(example)) {
          if (v instanceof Date) fechas.push(k);
          if (typeof v === 'number') nums.push(k);
        }
      }
      let minFecha = null, maxFecha = null;
      if (fechas.length) {
        const campoFecha = fechas[0];
        const minDoc = await coll.find({ [campoFecha]: { $exists: true } }).sort({ [campoFecha]: 1 }).limit(1).toArray();
        const maxDoc = await coll.find({ [campoFecha]: { $exists: true } }).sort({ [campoFecha]: -1 }).limit(1).toArray();
        minFecha = minDoc[0]?.[campoFecha] || null;
        maxFecha = maxDoc[0]?.[campoFecha] || null;
      }
      let metricas = null;
      if (nums.length) {
        const campoNum = nums[0];
        const agg = await coll.aggregate([
          { $group: {
            _id: null,
            sum: { $sum: `$${campoNum}` },
            avg: { $avg: `$${campoNum}` },
            min: { $min: `$${campoNum}` },
            max: { $max: `$${campoNum}` }
          }}
        ]).toArray();
        metricas = agg[0] || null;
      }
      console.log(`\n=== COLECCIÓN: ${name} ===`);
      console.log(`Total documentos: ${total}`);
      if (fechas.length) console.log(`Rango de fechas: ${minFecha} → ${maxFecha}`);
      if (metricas) console.log(`Métricas numéricas: sum=${metricas.sum}, avg=${metricas.avg}, min=${metricas.min}, max=${metricas.max}`);
      console.log('Ejemplo documento:');
      console.log(example);
      resumen.push({
        name,
        total,
        tieneFechas: !!fechas.length,
        tieneNumericos: !!nums.length,
        rango: fechas.length ? `${minFecha} → ${maxFecha}` : ''
      });
    }
    // Tabla resumen
    console.log('\n--- RESUMEN ---');
    console.log('| Colección | Documentos | Tiene fechas | Tiene numéricos | Rango temporal |');
    console.log('|-----------|------------|--------------|-----------------|----------------|');
    for (const r of resumen) {
      console.log(`| ${r.name} | ${r.total} | ${r.tieneFechas ? 'Sí' : 'No'} | ${r.tieneNumericos ? 'Sí' : 'No'} | ${r.rango} |`);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error en auditoría:', err);
    process.exit(1);
  }
})();
