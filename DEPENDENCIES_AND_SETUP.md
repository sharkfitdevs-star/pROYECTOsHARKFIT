# 📦 DEPENDENCIAS Y SETUP RECOMENDADO

## Paquetes NPM a Instalar

### Seguridad (CRÍTICO)

```bash
npm install joi                      # Validación de esquemas
npm install express-mongo-sanitize   # Prevenir NoSQL injection
npm install hpp                      # HTTP Parameter Pollution
npm install helmet                   # Headers de seguridad (ya existe)
npm install express-rate-limit      # Rate limiting (ya existe)
```

### Logging y Monitoreo

```bash
npm install winston                  # Logging estructurado
npm install morgan                   # HTTP logging middleware
npm install express-async-errors     # Async error handling
```

### Desarrollo (Opcional pero recomendado)

```bash
npm install --save-dev dotenv-cli   # Verificar variables .env
npm install --save-dev jest         # Testing framework
npm install --save-dev supertest    # HTTP assertions para tests
npm install --save-dev nodemon      # Auto-reload en desarrollo
```

### Frontend (React/Vite)

```bash
npm install dompurify               # Sanitizar HTML en frontend
npm install js-cookie               # Manejo seguro de cookies
npm install @tanstack/react-query   # Caché y sincronización de datos
```

---

## Archivos a Crear/Actualizar

### ✅ CREAR

```
backend-data-intake/src/
  ├── config/              ← NUEVO
  │   ├── env.js
  │   ├── database.js
  │   ├── cors.js
  │   └── jwt.js
  ├── repositories/        ← NUEVO
  │   ├── UserRepository.js
  │   ├── SessionRepository.js
  │   └── AuditLogRepository.js
  ├── services/            ← MEJORADO
  │   ├── AuthService.js
  │   └── EncryptionService.js
  ├── middleware/validation.js  ← NUEVO
  └── models/AuditLog.js   ← NUEVO

docs/
  ├── SECURITY.md          ← NUEVO
  ├── ARCHITECTURE.md      ← NUEVO
  └── DEPLOYMENT.md        ← NUEVO
```

### 📝 ACTUALIZAR

```
.env.example              ← Completamente reescrito
docker-compose.yml        ← Usar variables de entorno
backend-data-intake/src/
  ├── app.js              ← Validación global
  ├── server.js           ← Validación al startup
  ├── routes/auth.js      ← Eliminar /test-*, validación
  ├── middleware/auth.js  ← Mejorado
  ├── middleware/rateLimiter.js  ← Aplicar en rutas
  └── models/Usuario.js   ← Índices mejorados

frontend/src/
  ├── api/axios.js        ← Token en memory + cookie
  ├── context/AuthContext.jsx  ← Remover localStorage
  └── pages/auth/Login.jsx    ← Adaptar al nuevo flow
```

---

## Scripts Útiles

### Crear `package.json` scripts

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --watch",
    "test:security": "npm run test -- security.test.js",
    "verify-env": "node scripts/verify-env.js",
    "generate-secrets": "node scripts/generate-secrets.js",
    "migrate": "node scripts/migrate.js",
    "audit": "npm audit --production"
  }
}
```

### Crear `scripts/verify-env.js`

```javascript
#!/usr/bin/env node

const requiredVars = [
  'JWT_SECRET',
  'MONGO_PASSWORD',
  'MONGODB_URI',
  'NODE_ENV',
  'CORS_ORIGIN'
];

const env = process.env;
const missing = requiredVars.filter(v => !env[v]);

if (missing.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missing);
  process.exit(1);
}

if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET === 'change-me') {
    console.error('❌ JWT_SECRET aún tiene valor default en PRODUCCIÓN');
    process.exit(1);
  }
  if (!env.CORS_ORIGIN || env.CORS_ORIGIN.includes('localhost')) {
    console.error('❌ CORS_ORIGIN no configurado para PRODUCCIÓN');
    process.exit(1);
  }
}

console.log('✅ Variables de entorno validadas');
```

### Crear `scripts/generate-secrets.js`

```javascript
#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');

const secrets = {
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  JWT_ACCESS_SECRET: crypto.randomBytes(32).toString('hex'),
  JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
  MONGO_PASSWORD: crypto.randomBytes(32).toString('base64'),
  SESSION_SECRET: crypto.randomBytes(24).toString('hex')
};

console.log('🔐 Secretos generados:');
Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n📋 Copiar y pegar en .env.production');
```

---

## Testing

### Crear `tests/auth.security.test.js`

```javascript
const request = require('supertest');
const app = require('../src/app');
const { Usuario } = require('../src/models');

describe('🔐 Security Tests', () => {
  // Test 1: Validación de entrada
  it('Rechaza email inválido en register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: 'ValidPass123',
        username: 'user123',
        firstName: 'Test',
        lastName: 'User'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(true);
  });

  // Test 2: Rate limiting
  it('Bloquea después de 3 intentos fallidos de login', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpass'
        });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'nonexistent',
        password: 'wrongpass'
      });

    expect(res.statusCode).toBe(429);  // Too Many Requests
  });

  // Test 3: Sin secretos en respuesta de error
  it('No expone detalles en error 401', async () => {
    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', 'Bearer invalid');

    expect(res.statusCode).toBe(401);
    expect(res.body.message).not.toMatch(/jwt|crypto|mongodb/i);
  });

  // Test 4: CORS validation
  it('Rechaza CORS origin no autorizado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.com')
      .send({
        username: 'test',
        password: 'test'
      });

    expect(res.statusCode).toBe(401 || 403 || 500);  // No debe ser 200
  });
});
```

---

## Configuración de Producción

### Dockerfile mejorado

```dockerfile
# backend-data-intake/Dockerfile

FROM node:18-alpine

WORKDIR /app

# Copiar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY src ./src
COPY scripts ./scripts

# Validar configuración
RUN node scripts/verify-env.js || true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Permiso mínimo
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 8000

CMD ["npm", "start"]
```

### docker-compose.yml para PRODUCCIÓN

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0-alpine
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: ${MONGO_DB}
    volumes:
      - mongodb_data:/data/db
      - ./scripts/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    networks:
      - sharkfit_network
    restart: unless-stopped
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh -u ${MONGO_USER} -p ${MONGO_PASSWORD}
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend-data-intake
      cache_from:
        - node:18-alpine
    environment:
      NODE_ENV: production
      PORT: 8000
      MONGODB_URI: mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/${MONGO_DB}?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
      BCRYPT_COST: 13
      MAX_FAILED_LOGINS: 5
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - sharkfit_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./frontend
      cache_from:
        - node:18-alpine
        - nginx:alpine
    environment:
      VITE_API_URL: ${VITE_API_URL:-https://api.sharkfit.com}
    networks:
      - sharkfit_network
    restart: unless-stopped

networks:
  sharkfit_network:
    driver: bridge

volumes:
  mongodb_data:
```

---

## Monitoreo y Alertas

### Script de health check básico

```javascript
// scripts/health-check.js

const axios = require('axios');

setInterval(async () => {
  try {
    const res = await axios.get(`${process.env.API_URL}/api/health`, {
      timeout: 5000
    });

    if (res.status !== 200) {
      console.error('❌ Health check falló');
      // Alertar
    }
  } catch (err) {
    console.error('❌ API no responde:', err.message);
    // Enviar alert a ops@sharkfit.com
  }
}, 60000);  // Cada minuto
```

---

## Referencia Rápida

| Componente | Status | Cambios |
|-----------|--------|---------|
| JWT Secret | 🔴 CRÍTICO | Cambiar valor default |
| CORS | 🔴 CRÍTICO | Validatear contra env |
| Endpoints /test | 🔴 CRÍTICO | Eliminar completamente |
| Secretos en git | 🔴 CRÍTICO | Regenerar todas las keys |
| Token storage | 🟠 ALTO | Mover a httpOnly cookie |
| Validación input | 🟠 ALTO | Usar Joi schema |
| Rate limiting | 🟠 ALTO | Aplicar en auth endpoints |
| Índices BD | 🟡 MEDIO | Crear índices compuestos |
| Auditoría logging | 🟡 MEDIO | Implementar AuditLog |
| HTTPS | 🟢 BAJO | Forzar en nginx/proxy |

