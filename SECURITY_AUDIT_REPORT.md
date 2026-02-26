# 🔒 SEGURIDAD AUDITADA: Sharkfit Dashboard
**Auditoría realizada:** 16 Febrero 2026  
**Auditor:** Lead Full-Stack Engineer + OWASP Lead  
**Versión:** 2.0.0

---

## ⚠️ RESUMEN EJECUTIVO

### Status de Seguridad
- **CRÍTICO:** 4 hallazgos que BLOQUEAN producción
- **ALTO:** 6 hallazgos que deben resolverse dentro de 1 semana
- **MEDIO:** 4 hallazgos que deben resolverse en 2-3 semanas
- **BAJO:** 4 optimizaciones recomendadas

### Timeline para Producción
```
HOY (1-2 horas):
  ✅ Remover secretos hardcodeados
  ✅ Eliminar endpoints de debug
  ✅ Generar secretos aleatorios

SEMANA 1 (4-6 horas):
  ✅ Implementar validación Joi
  ✅ Mover token a httpOnly + SameSite
  ✅ Aplicar rate limiting en login
  ✅ Configurar CORS seguro

SEMANA 2-3:
  ✅ Token rotation + refresh logic
  ✅ Auditoría logging
  ✅ Tests de seguridad
  ✅ Documentación de deploy
```

---

## 🔴 HALLAZGOS CRÍTICOS

### \[CRÍTICO\] 1: Secretos Hardcodeados en docker-compose.yml

**Ubicación:** `/docker-compose.yml` líneas 8-10, 19, 32-35

**Problema:**
```yaml
# ❌ EXPUESTO:
MONGO_INITDB_ROOT_PASSWORD: sharkfit2024
JWT_SECRET: your-secret-key-change-in-production
MONGODB_URI: mongodb://admin:sharkfit2024@mongodb:27017/sharkfit
```

**Riesgo:** Si repo es público = BD completamente comprometida

**Solucio:** 

```bash
# 1. Generar secretos aleatorios
openssl rand -hex 32  # JWT_SECRET
openssl rand -base64 32  # MONGO_PASSWORD

# 2. Crear .env local (NO commitear) y docker-compose.override.yml
```

**Archivo: docker-compose.yml - CAMBIO**
```yaml
environment:
  MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
  MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/sharkfit?authSource=admin
  JWT_SECRET: ${JWT_SECRET}
  JWT_EXPIRES_IN: 15m
```

**Nota:** Usar `.env` local o secrets de Docker/K8s en producción

---

### \[CRÍTICO\] 2: Endpoints de Debugging Expuestos

**Ubicación:** `/backend-data-intake/src/routes/auth.js` líneas 213-350+

**Problemas:**
```javascript
router.get('/health', ...);  // OK - mantener
router.post('/test-simple', ...);  // ❌ ELIMINAR
router.get('/test-model', ...);  // ❌ ELIMINAR - filtra estructura de BD
router.get('/test-connection', ...);  // ❌ ELIMINAR - revela MongoDB info
router.post('/test-native-mongo', ...);  // ❌ ELIMINAR - acceso directo a BD
router.post('/login-debug', ...);  // ❌ ELIMINAR - revela usernames, hashes
```

**Riesgo:** Enumeration de usuarios, información de arquitectura interna

**Solución:** Eliminar o proteger con admin-only + NODE_ENV=production check

---

### \[CRÍTICO\] 3: Credenciales EVO5 en Frontend

**Ubicación:** 
- `/frontend/src/pages/dashboard/ConfigurarEvo5.jsx` línea 18
- `/frontend/src/pages/dashboard/ConfiguracionEvo5.jsx` línea 14
- `/backend/apps/webhooks/testSincronizacionEvo5*.js` líneas 27-28

**Problema:**
```javascript
// ❌ EXPUESTO EN CÓDIGO FUENTE:
api_key: '4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC',
const token: "4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC"
```

**Riesgo:** Cualquiera que acceda a repo puede usarjarlo. Si es key real de producción = **INCIDENT**.

**Solución:** 
1. **Inmediato:** Regenerar EVO5 API keys
2. Nunca hardcodear; usar env vars o secrets management (Vault, AWS Secrets Manager)
3. Crear `.gitignore` entry para crendentials

---

### \[CRÍTICO\] 4: JWT_SECRET Default 'change-me'

**Ubicación:** `/backend-data-intake/src/middleware/auth.js` línea 5

```javascript
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'change-me';
```

**Riesgo:** Si JWT_SECRET no está seteado en .env = cualquiera puede forjar tokens

**Solución:**

```javascript
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;

if (!ACCESS_TOKEN_SECRET || ACCESS_TOKEN_SECRET === 'change-me') {
  throw new Error(
    '❌ FATAL: JWT_SECRET no configurado en .env o es el default. ' +
    'Generar con: openssl rand -hex 32'
  );
}
```

---

## 🟠 HALLAZGOS ALTO

### \[ALTO\] 5: Token JWT en localStorage

**Ubicación:** `/frontend/src/api/axios.js` (setAccessToken), `/frontend/src/context/AuthContext.jsx`

**Problema:** 
- JWT almacenado en `localStorage` es vulnerable a XSS
- Si JS de terceros se ejecuta = token es robado
- Sin `httpOnly` flag
- Sin `Secure` flag

**Solución:**

```javascript
// ❌ ACTUAL (INSEGURO)
localStorage.setItem('token', response.data.accessToken);

// ✅ MEJORADO (SEGURO)
// 1. Backend: Guardar refresh token en httpOnly cookie
// 2. Frontend: Access token en memoria (variable); perderlo al refresh tab (OK)
// 3. Usar refresh endpoint para renovar sin relogin manual
```

**Implementación:**

**Backend (`auth.js` - MEJORADO):**
```javascript
const setRefreshCookie = (res, refreshToken, expiresAt) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // Forzar HTTPS en prod
    sameSite: process.env.COOKIE_SAMESITE || 'strict',  // CSRF protection
    path: '/api/auth',
    maxAge: (expiresAt.getTime() - Date.now()),
    domain: process.env.COOKIE_DOMAIN || undefined  // restrict domain
  });
};

// POST /login
res.json({
  success: true,
  accessToken,  // Devolver access token en body (temporal)
  user: {...}
  // Refresh token ya está en cookie
});
```

**Frontend (`axios.js` - MEJORADO):**
```javascript
let accessToken = null;  // En memoria, no localStorage

export const setAccessToken = (token) => { accessToken = token; };

// Interceptor: agregar access token a header
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
}, error => Promise.reject(error));

// Interceptor: renovar token si expira (usando refresh cookie)
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await refreshClient.post('/auth/refresh');  // Cookie automática
        setAccessToken(data.accessToken);
        return api(error.config);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

### \[ALTO\] 6: CORS Mal Configurado

**Ubicación:** `/backend-data-intake/src/app.js` líneas 17-23

**Problema:**
```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',  // ❌ Hardcoded dev!
  credentials: true,  // ✅ OK pero...
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

**Riesgo:** 
- Si `CORS_ORIGIN` no está en env prod = acepta `localhost:5173`
- CSRF si third-party hace POST con credentials
- Exposición a MITM

**Solución:**

```javascript
// config/cors.js - ✅ NUEVO
const CORS_CONFIG = {
  development: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  },
  production: {
    origin: process.env.CORS_ORIGIN?.split(',') || [],  // Whitelist explícita
    credentials: true,
    optionsSuccessStatus: 200
  }
};

// En app.js:
const corsOptions = CORS_CONFIG[process.env.NODE_ENV || 'development'];

if (process.env.NODE_ENV === 'production' && (!corsOptions.origin || corsOptions.origin.length === 0)) {
  throw new Error('❌ CORS_ORIGIN no configurado en .env para producción');
}

app.use(cors(corsOptions));
```

---

### \[ALTO\] 7-10: Otras vulnerabilidades ALTO

| # | Hallazgo | Solución Rápida |
|---|----------|---|
| 7 | Sin validación input (nombres, emails) | Usar `joi` o `express-validator` en controladores |
| 8 | Refresh token no rotado | Generar nuevo hash cada login; invalidar anterior |
| 9 | Error messages revelan estructura | Usar "Credenciales inválidas" genérico en prod |
| 10 | Rate limiting débil (10/15min login) | Reducir a 3/15min; usar Redis store; agregar CAPTCHA en 2do fallo |

---

## 🟡 HALLAZGOS MEDIO (PERFORMANCE + UX)

### Índices MongoDB Faltantes
```javascript
// En usuarios collection:
db.usuarios.createIndex({ "role": 1, "active": 1 });
db.usuarios.createIndex({ "idBranch": 1, "role": 1 });
db.usuarios.createIndex({ "status": 1, "createdAt": -1 });
db.usuarios.createIndex({ "email": 1, "active": 1 });

// En sessions collection (CRÍTICO):
db.sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });  // TTL
db.sessions.createIndex({ "userId": 1, "revokedAt": 1 });
```

### Logging Insuficiente
Falta auditoría de:
- Login exitosos/fallidos por usuario
- Cambios de rol/permisos
- Accesos a datos sensibles
- Intentos bloqueados

**Solución:** Crear `AuditLog` collection + log a archivo + alertar si múltiples fallos

---

## ✅ PARTE F: CHECKLIST FINAL PARA DEPLOY

### PRE-DEPLOYMENT (Antes de pasar a producción)

**[ ] Secretos y Configuración**
- [ ] `.env.production` creado con secretos aleatorios (no copiar de dev)
- [ ] `JWT_SECRET` = `openssl rand -hex 32` (NO 'change-me')
- [ ] `MONGO_PASSWORD` regenerado + actualizado en MongoDB
- [ ] EVO5 API keys regeneradas (anterior fue expuesta)
- [ ] CORS_ORIGIN = dominio real (ej: `https://dashboard.sharkfit.com`)
- [ ] NODE_ENV = 'production'
- [ ] HTTPS_ONLY = 'true'
- [ ] BCRYPT_COST = 13 (en prod)

**[ ] Seguridad de Código**
- [ ] Endpoints `/test-*`, `/login-debug` ELIMINADOs
- [ ] Sin console.log(sensitive data) en controller
- [ ] Helmet headers configurados (CSP, X-Frame, etc.)
- [ ] Rate limiter en auth endpoints (3 intentos/15min)
- [ ] Validación Joi en POST /login, /register

**[ ] Base de Datos**
- [ ] Índices creados (usuarios, sessions)
- [ ] TTL index en sessions.expiresAt
- [ ] Backup automático configurado (MongoDB Atlas o snapshot)
- [ ] Replicación si es production (mínimo 3 nodos)

**[ ] Frontend**
- [ ] Token JWT en httpOnly cookie (no localStorage)
- [ ] CSP header en HTML
- [ ] Sanitización de user input (DOMPurify)
- [ ] Build minificado (`npm run build`)
- [ ] Service Worker para cache estático

**[ ] Infraestructura**
- [ ] HTTPS/TLS certificate válido
- [ ] Reverse proxy (nginx/Caddy) frente a Node.js
- [ ] Rate limiting en nginx (otro nivel de protección)
- [ ] Firewall: solo puertos 80, 443 abiertos
- [ ] MongoDB sin acceso público (IP whitelist)
- [ ] Logs centralizados (CloudWatch, ELK, etc.)

**[ ] Monitoreo y Alertas**
- [ ] Alert si múltiples login fallidos (posible ataque)
- [ ] Monitoring de uptime
- [ ] Alertas de excepciones (error rate > X%)
- [ ] Auditoría log: guardar intentos de acceso

**[ ] Documentación**
- [ ] README actualizado con pasos de deploy
- [ ] Variables .env.example documentadas
- [ ] Guía de recuperación de BD
- [ ] Runbook para escalada de incidentes

---

## 📊 PRIORIZACIÓN: Top 10 Críticos

| Prioridad | Cambio | Esfuerzo | Impacto | Deadline |
|-----------|--------|----------|--------|----------|
| **P0** | Remover secretos hardcodeados | 10 min | CRÍTICO | HOY |
| **P0** | Generar JWT_SECRET aleatorio | 5 min | CRÍTICO | HOY |
| **P0** | Eliminar endpoints /test-* | 10 min | CRÍTICO | HOY |
| **P0** | Regenerar EVO5 API keys | 30 min | CRÍTICO | HOY |
| **P1** | Mover token a httpOnly cookie | 2h | ALTO | Mañana |
| **P1** | Validar y limpiar CORS | 1h | ALTO | Mañana |
| **P1** | Implementar Joi validation | 3h | ALTO | Esta semana |
| **P2** | Token rotation + refresh flows | 4h | MEDIO | Semana 1 |
| **P2** | Índices MongoDB | 1h | MEDIO | Semana 1 |
| **P2** | Auditoría logging | 2h | MEDIO | Semana 2 |

---

## 🔗 Referencias OWASP

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

**Próximos pasos:** 
1. Implementar cambios P0 (HOY)
2. Schedule reunión de seguridad en 1 semana
3. Penetration testing antes de prod
