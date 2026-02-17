# 🚀 EVO W12 Proxy - Inicio Rápido (MongoDB)

## Requisitos previos
- MongoDB disponible (local o Atlas)
- `MONGODB_URI` configurada en `.env`
- Node 18+

## 1) Configurar variables
```bash
cd backend-data-intake
cp .env.example .env
# editar .env -> ajustar MONGODB_URI y ENCRYPTION_KEY
```

## 2) Generar ENCRYPTION_KEY
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# pegar el valor (64 hex chars) en ENCRYPTION_KEY
```

## 3) Agregar credenciales EVO (ahora en MongoDB)
```bash
npm run evo-add-credentials
```

## 4) Iniciar proxy (Mongo-backed)
```bash
npm run evo-proxy
```

Salida esperada en consola:
```
================================================================================
  EVO W12 INTEGRATION PROXY SERVER (MongoDB)
================================================================================
[System] 🚀 Starting sync cycle...
[Sync] ✅ Upserted 120 prospects.
[Sync] ✅ Upserted 85 sales.
[Sync] ✅ Upserted 1250 entries.
[System] ✅ Sync cycle completed in 4.82s
```

---

## 📊 Ver datos sincronizados (Mongo)

### Usando mongosh
```js
use sharkfit
db.clientes.countDocuments()
db.ventas.find().sort({ saleDate: -1 }).limit(10).pretty()
db.sync_logs.find().sort({ iniciado: -1 }).limit(10)
```

### Desde la app (Mongoose)
- Colecciones: `clientes`, `ventas`, `access_logs`, `sync_logs`, `api_integrations`

---

## 🔧 Scripts útiles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Iniciar Proxy | `npm run evo-proxy` | Ejecuta sincronización continua (Mongo) |
| Agregar Credenciales | `npm run evo-add-credentials` | Inserta credenciales en `api_integrations` (Mongo) |
| Encriptar Token | `npm run evo-encrypt-token` | Helper para AES-GCM |

---

## ⚠️ Troubleshooting
- Asegúrate de que `MONGODB_URI` es accesible desde el entorno
- `AUTH_DECRYPTION_FAILURE` → revisar `ENCRYPTION_KEY` y re-encriptar token

---

## 📚 Más Información
- `src/evo-w12-proxy.js` — implementación Mongo-backed
- `src/db/evoRepository.js` — abstracción del repositorio (async / Mongoose)
- Tests: incluye integraciones en `tests/*.mongo.test.js` (mongodb-memory-server)

