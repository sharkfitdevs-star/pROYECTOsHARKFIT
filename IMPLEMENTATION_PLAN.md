# 🚀 PLAN DE IMPLEMENTACIÓN INMEDIATO

## Timeline de Cambios Críticos

### **FASE 0: HOY (1-2 horas) - BLOQUEA PRODUCCIÓN**

Estos cambios DEBEN ser completados antes de pasar a cualquier ambiente.

#### 1. **Remover secretos hardcodeados** ⏱️ 10 min

**Paso 1.1:** Actualizar `docker-compose.yml`

```bash
# ACTUAL (INSEGURO):
environment:
  MONGO_INITDB_ROOT_PASSWORD: sharkfit2024
  JWT_SECRET: your-secret-key-change-in-production

# MEJORADO (SEGURO):
environment:
  MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
  JWT_SECRET: ${JWT_SECRET}
```

**Paso 1.2:** Crear `.env.local` (NO commitear):

```bash
cp .env.example .env.local

# Generar secretos:
openssl rand -hex 32  # Copiar en JWT_SECRET
openssl rand -base64 32  # Copiar en MONGO_PASSWORD
```

**Paso 1.3:** Actualizar `.gitignore`:

```bash
.env
.env.local
.env.production
.env.*.local
```

**Paso 1.4:** Verificar que NO hay secretos en git:

```bash
git log --all -S 'sharkfit2024' -- '*'  # Buscar credencial antigua
git log --all -S '4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC' -- '*'  # Buscar EVO key
```

Si encuentra coincidencias:
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" -- --all
```

---

#### 2. **Eliminar endpoints de debugging** ⏱️ 10 min

**Ubicación:** `/backend-data-intake/src/routes/auth.js` líneas 213-350

```javascript
// ❌ ELIMINAR COMPLETAMENTE:

router.get('/health', ...);  // ❌ Mover a ruta separada
router.post('/test-simple', ...);  
router.get('/test-model', ...);
router.get('/test-connection', ...);
router.post('/test-native-mongo', ...);
router.post('/login-debug', ...);  
router.post('/test-findone-v2', ...);

// ✅ MANTENER solo:
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

**Verificar eliminación:**
```bash
grep -n "test-\|debug" /backend-data-intake/src/routes/auth.js
# No debe devolver nada
```

---

#### 3. **Regenerar y securizar EVO5 API Keys** ⏱️ 30 min

En la interfaz de EVO5/W12App:

```javascript
// ❌ ACTUAL (EXPUESTO):
api_key: '4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC',  // ← COMPROMETIDA

// ✅ ELIMINAR de código:
// Buscar y reemplazar en:
// - /frontend/src/pages/dashboard/ConfigurarEvo5.jsx
// - /frontend/src/pages/dashboard/ConfiguracionEvo5.jsx
// - /backend/apps/webhooks/testSincronizacionEvo5*.js
```

**Comando de búsqueda:**
```bash
grep -r "4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC" .
grep -r "api_key.*:" frontend/src --include="*.jsx"
```

**Reemplazar con variable de entorno:**
```javascript
// ✅ En .env:
EVO_API_KEY=your-new-generated-key-from-evo5-panel

// ✅ En código:
const evoKey = process.env.EVO_API_KEY;
if (!evoKey) throw new Error('EVO_API_KEY no configurado');
```

---

#### 4. **Validar JWT_SECRET** ⏱️ 5 min

**Archivo:** `/backend-data-intake/src/middleware/auth.js` línea 5

```javascript
// ❌ ACTUAL:
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'change-me';

// ✅ MEJORADO:
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;

if (!ACCESS_TOKEN_SECRET) {
  throw new Error(
    '❌ FATAL: JWT_SECRET no configurado.\n' +
    'Generar: openssl rand -hex 32\n' +
    'Guardar en .env: JWT_SECRET=<valor>'
  );
}

if (process.env.NODE_ENV === 'production' && ACCESS_TOKEN_SECRET === 'change-me') {
  throw new Error('❌ JWT_SECRET aún tiene valor default en PRODUCCIÓN');
}
```

**Test:**
```bash
NODE_ENV=development node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET || 'UNDEFINED')"
```

---

### **FASE 1: ESTA SEMANA (4-6 horas) - BLOQUES PARA STAGING**

---

#### 5. **Implementar validación Joi** ⏱️ 2h

```bash
npm install joi
```

**Crear:** `/backend-data-intake/src/middleware/validation.js`

Ver archivo `validation.IMPROVED.js` en este repositorio.

**Aplicar en rutas:**

```javascript
const { validateRequest, schemas } = require('../middleware/validation');

// POST /register
router.post('/register',
  validateRequest(schemas.register),
  async (req, res) => {
    // req.body ya está validado y limpio
  }
);

// POST /login
router.post('/login',
  validateRequest(schemas.login),
  authLoginRateLimiter,
  async (req, res) => {
    // ...
  }
);
```

---

#### 6. **Mover token a httpOnly cookie** ⏱️ 2-3h

**Backend - Cambio en `/routes/auth.js`:**

```javascript
// En POST /login:
const refreshToken = generateRefreshToken();

// ✅ Guardar en BD
await Session.create({
  userId: user._id,
  refreshTokenHash: refreshToken.tokenHash,
  userAgent: req.headers['user-agent'],
  ip: getClientMeta(req).ip,
  expiresAt: refreshToken.expiresAt
});

// ✅ Enviar refresh token en httpOnly cookie
res.cookie('refreshToken', refreshToken.token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 días
});

// ✅ Enviar access token en body (solo acceso temporal)
res.json({
  success: true,
  accessToken: signAccessToken(user),
  user: user.toJSON()
});
```

**Frontend - Cambio en `/api/axios.IMPROVED.js`:**

Ver archivo `axios.IMPROVED.js` en este repositorio.

---

#### 7. **Configurar CORS positional** ⏱️ 1h

**Backend - En `/app.js`:**

```javascript
// Validar CORS_ORIGIN en startup
if (process.env.NODE_ENV === 'production') {
  const origins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim());
  if (origins.length === 0 || origins[0] === '') {
    throw new Error('❌ CORS_ORIGIN vacío en PRODUCCIÓN');
  }
}

// Configurar CORS dinámicamente
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map(o => o.trim());

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS BLOCKED: ${origin}`);
      callback(new Error('CORS no permitido'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

**En `.env`:**
```
# Desarrollo:
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Producción:
CORS_ORIGIN=https://dashboard.sharkfit.com
```

---

#### 8. **Aplicar rate limiting en auth** ⏱️ 30 min

**Verificar que está aplicado en `/routes/auth.js`:**

```javascript
const { authLoginRateLimiter, authPasswordRateLimiter } = require('../middleware/rateLimiter');

// POST /login
router.post('/login', authLoginRateLimiter, async (req, res) => {
  // Máximo 3 intentos por 15 minutos
});

// POST /register
router.post('/register',
  (await Usuario.countDocuments()) === 0 ? (req, res, next) => next() : authLoginRateLimiter,
  async (req, res) => { }
);

// POST /password/reset
router.post('/password/reset', authPasswordRateLimiter, async (req, res) => {
  // Máximo 5 intentos por hora
});

// POST /password/forgot
router.post('/password/forgot', authPasswordRateLimiter, async (req, res) => { });
```

**Consideración:** Reducir a `max: 3` para login (actual es 10):

```javascript
const authLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,  // ← Reducir de 10
  message: { error: 'Demasiados intentos. Intente en 15 minutos.' }
});
```

---

### **FASE 2: SEMANAS 2-3 (6-8 horas) - NIVEL PRODUCCIÓN**

#### 9. **Implementar token rotation** ⏱️ 3h

En POST `/auth/refresh`:

```javascript
router.post('/refresh', async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    return res.status(401).json({ error: true, message: 'No autorizado' });
  }

  // Buscar sesión
  const session = await Session.findOne({
    refreshTokenHash: hashToken(oldRefreshToken)
  });

  if (!session || session.revokedAt) {
    // Token revoked/expirado
    await Session.deleteMany({ userId: session.userId });  // Logout en todos los dispositivos
    return res.status(401).json({ error: true, message: 'Sesión expirada' });
  }

  // Generar NUEVO refresh token
  const newRefreshToken = generateRefreshToken();

  // Actualizar sesión con NUEVO token
  await Session.updateOne(
    { _id: session._id },
    {
      refreshTokenHash: newRefreshToken.tokenHash,
      rotatedAt: new Date(),
      rotatedFrom: session.refreshTokenHash
    }
  );

  // Enviar en cookie
  setRefreshCookie(res, newRefreshToken.token, newRefreshToken.expiresAt.getTime() - Date.now());

  // Nuevo access token
  const accessToken = signAccessToken(session.userId);

  res.json({ success: true, accessToken });
});
```

---

#### 10. **Auditoría y logging** ⏱️ 2-3h

**Crear modelo `/models/AuditLog.js`:**

```javascript
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    index: true
  },
  action: {
    type: String,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'REGISTER',
      'PASSWORD_RESET',
      'PERMISSION_DENIED',
      'DATA_ACCESS',
      'DATA_MODIFY',
      'ACCOUNT_DISABLED',
      'INVALID_TOKEN'
    ],
    required: true,
    index: true
  },
  ip: String,
  userAgent: String,
  details: Object,
  statusCode: Number,
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: false,
  collection: 'auditlogs'
});

// Índice para limpiar logs antiguos (90 días)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
```

**Usar en rutas:**

```javascript
const AuditLog = require('../models/AuditLog');

// En login exitoso:
await AuditLog.create({
  userId: user._id,
  action: 'LOGIN_SUCCESS',
  ip: getClientMeta(req).ip,
  userAgent: req.headers['user-agent']
});

// En login fallido:
await AuditLog.create({
  action: 'LOGIN_FAILED',
  ip: getClientMeta(req).ip,
  details: { username: identifier }
});
```

---

#### 11. **Crear índices MongoDB** ⏱️ 1h

**Ejecutar en base de datos:**

```javascript
// En MongoDB shell:
db.usuarios.createIndex({ "role": 1, "active": 1 });
db.usuarios.createIndex({ "idBranch": 1, "role": 1 });
db.usuarios.createIndex({ "status": 1, "createdAt": -1 });

db.sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
db.sessions.createIndex({ "userId": 1, "revokedAt": 1 });

db.auditlogs.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000 });
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Pre-producción

- [ ] No hay secretos en git (revisar últimas 50 commits)
- [ ] JWT_SECRET es aleatorio (no 'change-me')
- [ ] MONGO_PASSWORD fue regenerado
- [ ] EVO5 API keys fueron regeneradas
- [ ] Endpoints /test-* y /login-debug eliminados
- [ ] `docker-compose.yml` usa ${VAR} en lugar de valores hardcodeados
- [ ] `.env.example` documentado sin valores reales
- [ ] CORS_ORIGIN configurado correctamente (.env prod)
- [ ] Rate limiting activo en endpoints auth
- [ ] Token en httpOnly cookie (no localStorage)
- [ ] Validación Joi en POST endpoints
- [ ] Índices MongoDB creados
- [ ] Logs son seguros (no exponen datos sensibles)

### Antes de Deploy

- [ ] Teste login/logout en HTTPS localmente
- [ ] Teste refresh token (token expira, refresh automático)
- [ ] Teste CORS (peticiones de dominio bloqueado = rechazarlas)
- [ ] Teste rate limiting (3 intentos fallidos = bloqueo)
- [ ] Verifique error messages (sin revelar estructura)
- [ ] Backup de MongoDB antes de deploy
- [ ] Documente procedimiento rollback

---

## 📞 Soporte y Próximos Pasos

1. **Hoy:** Implementar cambios Fase 0
2. **Mañana:** Code review de cambios
3. **Esta semana:** Fase 1 completa + testing
4. **Próxima semana:** Penetration test básico
5. **Antes de prod:** Checklist 100% completado + aprobación lead
