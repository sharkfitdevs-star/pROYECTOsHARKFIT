# 🔥 Universal Extractor - MongoDB + REST APIs

Sistema resiliente y blindado para extraer datos de **MongoDB** y **APIs REST** con múltiples fallbacks automáticos.

## 📋 Características

✅ **MongoDB**
- Soporte nativo con mongoose
- Filtros, proyecciones, paginación
- Upsert bulk operations
- Retry con exponential backoff
- Health checks integrados

✅ **APIs REST**
- Direct HTTP Requests
- GraphQL
- JSON Path Extraction
- Recursive Data Mining
- HTML Scraping
- Local Cache (24h fallback)

✅ **Seguridad**
- Variables de entorno (cero hardcoding)
- Retry automático
- Circuit breaker pattern
- Timeout protections

✅ **Resiliencia**
- Múltiples estrategias de fallback automático
- Manejo explícito de errores en español
- Health checks integrados

## 🚀 Instalación

### 1. Dependencias

```bash
npm install \
  axios \
  mongoose
```

### 2. Variables de Entorno (.env)

```env
# MongoDB
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USER=root
MONGODB_PASSWORD=password
MONGODB_DATABASE=mydb

# APIs (opcional)
SHOPIFY_BASE_URL=https://mystore.myshopify.com/
SHOPIFY_API_TOKEN=xxx
```

## 📝 Configuración

### Crear archivo de configuración

```json
{
  "id": "mongodb-main",
  "type": "database",
  "description": "Extrae datos desde MongoDB",
  
  "source": {
    "host": "${MONGODB_HOST}",
    "port": "${MONGODB_PORT}",
    "user": "${MONGODB_USER}",
    "password": "${MONGODB_PASSWORD}",
    "database": "${MONGODB_DATABASE}",
    "timeout": 10000
  },

  "endpoints": [
    {
      "path": "usuarios",
      "table": "users",
      "fields": ["_id", "email", "nombre", "estado"],
      "idField": "_id",
      "where": {
        "field": "estado",
        "operator": "=",
        "value": "activo"
      },
      "limit": 1000
    }
  ],

  "syncInterval": 5
}
```

## 🎯 Uso

### Setup Interactivo (Recomendado)

```bash
# Crear una nueva configuración de API
npm run setup
```

Te hará preguntas como:
- ¿Cuál es tu proveedor de datos? (Shopify, WooCommerce, etc)
- ¿URL base de la API?
- ¿Cómo se autentica? (API Key, Bearer Token, Basic Auth, OAuth)
- ¿Qué endpoints necesitas?
- ¿Qué campos extraer?

**Resultado:**
- 📄 `configs/api-tu-proveedor.json` (sin credenciales)
- 🔐 `.env` (con credenciales protegidas)

### Extraer Datos

```bash
# Una sola fuente
npm run extract -- --config api-shopify

# Todas las fuentes configuradas
npm run extract-all
```

### Uso Programático

```javascript
const { extractAndSync } = require('./src/index');

const result = await extractAndSync('api-shopify');

if (result.success) {
  console.log('✅ Datos extraídos:', result.totalRecords);
}
```

## 📊 Ejemplo de Salida

```
═══════════════════════════════════════════════════════════════════════════
🔍 EXTRAYENDO: usuarios
   Fuente: mongodb-main (database)
═══════════════════════════════════════════════════════════════════════════

   [1/2] MongoDB Direct Query...
   ✅ ÉXITO en 234ms
   📦 Registros extraídos: 1250

═══════════════════════════════════════════════════════════════════════════
✅ SINCRONIZACIÓN COMPLETADA
═══════════════════════════════════════════════════════════════════════════

✅ usuarios
   Registros: 1250
   Strategy: MongoDB Direct Query
   Duración: 234ms

Tiempo total: 1245ms
═══════════════════════════════════════════════════════════════════════════
```

## 🔥 Manejo de Errores (Fallback Automático)

Si MongoDB está caída, intenta cache:

```
[1/2] MongoDB Direct Query...
❌ Conexión rechazada: ¿BD está corriendo?

[2/2] Cache local (últimas 24h)...
✅ ÉXITO (usando cache de 2 horas atrás)

═══════════════════════════════════════════════════════════════════════════
```

## 📂 Estructura de Archivos

```
backend-data-intake/
├── src/
│   ├── connectors/
│   │   ├── DatabaseConnector.js      ⭐ Conexión MongoDB
│   │   ├── UniversalExtractor.js     ⭐ Motor de extracción
│   │   └── ...
│   ├── index.js                      (Entrada principal)
│   └── ...
├── configs/
│   ├── mongodb-main.json             ⭐ Config MongoDB
│   ├── api-shopify.json              (Config APIs)
│   └── ...
└── .env                              (Variables de entorno)
```

## 🔐 Seguridad - CRÍTICO

### ❌ NUNCA hardcodear credenciales

```javascript
// ❌ MAL - RIESGO TOTAL
const config = {
  apiKey: "sk_live_xxxxxxxxxxxxx"
};
```

### ✅ SIEMPRE usar variables de entorno

```javascript
// ✅ BIEN - SEGURO
const config = {
  apiKey: process.env.API_KEY_SHOPIFY
};
```

### 📋 Cómo funciona el Setup Interactivo

**Paso 1:** Setup pregunta por credenciales
```
¿Token Bearer?
> sk_live_xxxxxxxxxxxxx
```

**Paso 2:** Se guardan en `.env` (NO se versiona)
```env
API_TOKEN_SHOPIFY=sk_live_xxxxxxxxxxxxx
API_USER_MYAPI=admin@empresa.com
```

**Paso 3:** Se usan en config JSON (SÍ se versiona)
```json
{
  "auth": {
    "type": "bearer",
    "token": "${API_TOKEN_SHOPIFY}"
  }
}
```

**Paso 4:** Sistema reemplaza `${VAR}` con `process.env.VAR` en tiempo de ejecución

### 🚨 Verificación Pre-GitHub

**ANTES de subir a GitHub, verifica:**

```bash
# Ver si .env está en .gitignore
cat .gitignore | grep "\.env"

# Verificar que NO hay credenciales en los archivos JSON
grep -r "sk_live\|password\|secret" configs/

# Debe estar vacío si está seguro
ls -la .env
```

### ✅ Checklist de Seguridad

- ✅ `.env` está en `.gitignore`
- ✅ No hay credenciales en `configs/*.json`
- ✅ Las credenciales viven en `.env` local solamente
- ✅ GitHub solo tiene configs JSON sin sensibles
- ✅ Cada desarrollador tiene su `.env` local
- ✅ Servidor producción tiene variables de entorno propias

## 📋 Operaciones MongoDB

### Extracción simple

```javascript
const connector = new DatabaseConnector(config);
await connector.connect();

const data = await connector.extract('users', {
  filter: { status: 'active' },
  limit: 100
});

await connector.disconnect();
```

### Upsert (Insert or Update)

```javascript
await connector.upsert('users', [
  { _id: '1', email: 'user@example.com', name: 'John' },
  { _id: '2', email: 'jane@example.com', name: 'Jane' }
], '_id');
```

### Otras operaciones

```javascript
// Insertar
await connector.insertOne('users', { email: 'new@example.com' });

// Actualizar
await connector.updateOne('users', { _id: '1' }, { status: 'inactive' });

// Eliminar
await connector.deleteMany('users', { status: 'deleted' });

// Contar
const count = await connector.count('users');

// Estadísticas
const stats = await connector.stats('users');
```

## 🎯 Tipos de Autenticación (REST)

```json
{
  "auth": {
    "type": "none"
  }
}
```

```json
{
  "auth": {
    "type": "bearer",
    "token": "${API_TOKEN}"
  }
}
```

```json
{
  "auth": {
    "type": "apikey",
    "headerName": "X-API-Key",
    "key": "${API_KEY}"
  }
}
```

## 🧪 Testing

```bash
# Probar MongoDB
npm run extract -- --config mongodb-main

# Probar API
npm run extract -- --config api-shopify

# Probar todas
npm run extract -- --all
```

## 📊 Logging

Todos los eventos se registran automáticamente:

```javascript
logger.info('✅ Extracción exitosa', { endpoint, records: 100 });
logger.warn('⚠️ Intento falló', { strategy, error });
logger.error('❌ Error fatal', { syncId, message });
```

## 🚀 Próximos Pasos

1. ✅ Crear archivos de configuración
2. ✅ Configurar variables de entorno
3. ✅ Probar conexiones
4. ✅ Sincronizar datos
5. ✅ Configurar scheduler automático

## 📞 Soporte

Para errores o preguntas:
- Revisar logs en `app.log`
- Validar ficheros de configuración JSON
- Verificar variables de entorno
- Comprobar conectividad a MongoDB

---

**Creado:** Febrero 2026  
**Stack:** Node.js (puro JavaScript)  
**BD:** MongoDB  
**APIs:** REST, GraphQL

