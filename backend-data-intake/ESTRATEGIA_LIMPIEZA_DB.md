# 🧹 Estrategia de Limpieza de Base de Datos

Para mantener el uso de espacio bajo control en el tier gratuito de MongoDB Atlas (512 MB).

---

## 📅 Tareas de limpieza automática

### 1. Sesiones expiradas (YA IMPLEMENTADO ✅)

**Ubicación:** `src/models/Session.js`
**Qué hace:** Borra sesiones con `expiresAt` pasado
**Frecuencia:** Cada 24 horas (cron job)

```javascript
// Ya configurado en Session.js
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### 2. Email tokens usados (YA IMPLEMENTADO ✅)

**Ubicación:** `src/models/EmailToken.js`
**Qué hace:** Borra tokens después de ser usados
**Frecuencia:** Automático al verificar email

---

## 📋 Tareas de limpieza periódica (RECOMENDADAS)

### 3. Audit logs antiguos

Borrar logs de más de 1 año:

```javascript
// Crear archivo: src/scripts/cleanAuditLogs.js
const mongoose = require('mongoose');
const { connectDB } = require('../db/mongodb');
const { AuditLog } = require('../models');
const { logger } = require('../utils/logger');

const cleanOldAuditLogs = async () => {
  try {
    await connectDB();
    
    // Borrar logs de hace más de 1 año
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const result = await AuditLog.deleteMany({
      timestamp: { $lt: oneYearAgo }
    });
    
    logger.info(`🧹 Audit logs borrados: ${result.deletedCount}`);
    
    // Estadísticas de espacio
    const stats = await mongoose.connection.db.collection('auditlogs').stats();
    logger.info(`📊 Espacio usado por audit logs: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Error limpiando audit logs:', error);
    process.exit(1);
  }
};

cleanOldAuditLogs();
```

**Ejecutar manualmente:** `node src/scripts/cleanAuditLogs.js`

**Automatizar (cron - ejecutar cada mes):**
```json
// En package.json
"scripts": {
  "clean:audit-logs": "node src/scripts/cleanAuditLogs.js"
}
```

### 4. Agendamientos cancelados antiguos

Borrar citas canceladas de hace más de 6 meses:

```javascript
// Crear archivo: src/scripts/cleanAgendamientos.js
const { connectDB } = require('../db/mongodb');
const { Agendamiento } = require('../models');
const { logger } = require('../utils/logger');

const cleanCancelledAppointments = async () => {
  try {
    await connectDB();
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const result = await Agendamiento.deleteMany({
      estado: 'cancelado',
      fechaHora: { $lt: sixMonthsAgo }
    });
    
    logger.info(`🧹 Agendamientos cancelados borrados: ${result.deletedCount}`);
    process.exit(0);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
};

cleanCancelledAppointments();
```

### 5. Reportes temporales antiguos

Si generas reportes y los guardas en DB:

```javascript
// Borrar reportes de hace más de 3 meses
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

await Reporte.deleteMany({
  tipo: 'temporal', // Solo reportes no críticos
  createdAt: { $lt: threeMonthsAgo }
});
```

---

## 🔄 Automatización con node-cron

Instalar:
```bash
npm install node-cron
```

Crear `src/scheduler/cleanupTasks.js`:

```javascript
const cron = require('node-cron');
const { logger } = require('../utils/logger');
const { AuditLog, Agendamiento } = require('../models');

// Ejecutar el primer día de cada mes a las 2:00 AM
cron.schedule('0 2 1 * *', async () => {
  logger.info('🧹 Iniciando limpieza mensual...');
  
  try {
    // 1. Audit logs > 1 año
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const auditResult = await AuditLog.deleteMany({
      timestamp: { $lt: oneYearAgo }
    });
    logger.info(`✅ Audit logs borrados: ${auditResult.deletedCount}`);
    
    // 2. Agendamientos cancelados > 6 meses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const agendaResult = await Agendamiento.deleteMany({
      estado: 'cancelado',
      fechaHora: { $lt: sixMonthsAgo }
    });
    logger.info(`✅ Agendamientos borrados: ${agendaResult.deletedCount}`);
    
    logger.info('🎉 Limpieza mensual completada');
    
  } catch (error) {
    logger.error('❌ Error en limpieza mensual:', error);
  }
});

module.exports = { startCleanupScheduler: () => logger.info('🕒 Scheduler de limpieza iniciado') };
```

En `src/server.js`:
```javascript
// Después de connectDB()
const { startCleanupScheduler } = require('./scheduler/cleanupTasks');
startCleanupScheduler();
```

---

## 📊 Monitoreo de espacio

### Script para ver uso actual:

```javascript
// Crear: src/scripts/checkDbSize.js
const mongoose = require('mongoose');
const { connectDB } = require('../db/mongodb');
const { logger } = require('../utils/logger');

const checkDbSize = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ESTADÍSTICAS DE BASE DE DATOS');
    console.log('='.repeat(60));
    console.log(`Base de datos: ${stats.db}`);
    console.log(`Tamaño total: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Índices: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Espacio usado: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\n📈 Uso del tier M0 (512 MB): ${((stats.storageSize / 1024 / 1024 / 512) * 100).toFixed(1)}%`);
    
    // Por colección
    console.log('\n📦 Por colección:');
    const collections = await db.listCollections().toArray();
    
    for (const col of collections) {
      const colStats = await db.collection(col.name).stats();
      const sizeMB = (colStats.size / 1024 / 1024).toFixed(2);
      const count = colStats.count;
      console.log(`   ${col.name}: ${sizeMB} MB (${count} documentos)`);
    }
    
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
};

checkDbSize();
```

Agregar a `package.json`:
```json
"scripts": {
  "db:size": "node src/scripts/checkDbSize.js",
  "db:clean": "node src/scripts/cleanAuditLogs.js"
}
```

Ejecutar: `npm run db:size`

---

## 🎯 Políticas de retención recomendadas

| Tipo de dato | Retención | Acción |
|--------------|-----------|--------|
| **Audit logs** | 1 año | Borrar automáticamente |
| **Sesiones** | Hasta expiración | Ya se borra automático |
| **Email tokens** | Hasta uso | Ya se borra automático |
| **Agendamientos completados** | 2 años | Conservar para historial |
| **Agendamientos cancelados** | 6 meses | Borrar |
| **Ventas** | Permanente | Necesario para contabilidad |
| **Usuarios inactivos** | Permanente | Conservar (GDPR permite esto) |
| **Reportes temporales** | 3 meses | Borrar si no son críticos |

---

## 🚨 Alertas de espacio

Crear alerta cuando se llegue al 80% del espacio:

```javascript
// En el script de monitoreo
const LIMIT_MB = 512;
const ALERT_THRESHOLD = 0.8; // 80%

const usagePercent = stats.storageSize / 1024 / 1024 / LIMIT_MB;

if (usagePercent > ALERT_THRESHOLD) {
  logger.warn(`⚠️  BASE DE DATOS AL ${(usagePercent * 100).toFixed(1)}% de capacidad`);
  logger.warn('💡 Considera ejecutar limpieza o actualizar tier');
  
  // Aquí podrías enviar email o notificación
}
```

---

## 💰 Si necesitas más espacio

### MongoDB Atlas Tiers:

| Tier | RAM | Storage | Precio/mes |
|------|-----|---------|------------|
| **M0** | 512 MB | 512 MB | 🆓 Gratis |
| **M2** | 2 GB | 2 GB | $9 USD |
| **M5** | 2 GB | 5 GB | $25 USD |
| **M10** | 4 GB | 10 GB | $57 USD |

**Recomendación:** Si llegas al 80% del M0, salta directo al **M2** (solo $9/mes).

---

## ✅ Checklist de implementación

- [ ] Ejecutar `npm run db:size` para ver uso actual
- [ ] Crear script `cleanAuditLogs.js`
- [ ] Crear script `cleanAgendamientos.js`
- [ ] Instalar `node-cron`: `npm install node-cron`
- [ ] Crear scheduler `cleanupTasks.js`
- [ ] Integrar scheduler en `server.js`
- [ ] Configurar cron job mensual
- [ ] Establecer alerta al 80% de uso
- [ ] Documentar políticas de retención para el equipo

---

¿Necesitas ayuda implementando alguno de estos scripts? Avísame y los creamos juntos.
