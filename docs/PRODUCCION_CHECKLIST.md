# 🚀 CHECKLIST DE PRODUCCIÓN - SHARKFIT AUTH SYSTEM

## 📋 **PRE-DEPLOY OBLIGATORIO**

### 🔐 **1. SEGURIDAD CRÍTICA**
- [ ] **JWT Secrets**: Generar secretos únicos de 64 bytes
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  - [ ] `JWT_SECRET` (para tokens heredados)
  - [ ] `JWT_ACCESS_SECRET` (para access tokens)
  - [ ] Nunca usar los defaults del `.env` de desarrollo

- [ ] **MongoDB URI**: Configurar connection string de Atlas producción
  - [ ] Crear cluster en MongoDB Atlas (M0 gratis o superior)
  - [ ] Crear usuario de DB con contraseña fuerte
  - [ ] Permitir acceso solo desde IPs del servidor (no 0.0.0.0/0)
  - [ ] Codificar caracteres especiales en password (@ → %40, etc.)

- [ ] **Variables de Entorno**: Copiar `.env.production` y completar
  - [ ] `NODE_ENV=production`
  - [ ] `CORS_ORIGIN` con dominio de frontend (https://...)
  - [ ] `SEED_OWNER_PASSWORD` con contraseña fuerte única
  - [ ] `REQUIRE_EMAIL_VERIFICATION=true`

### 🍪 **2. COOKIES Y CORS**
- [ ] Verificar configuración según arquitectura:
  - **Frontend y Backend en MISMO dominio**:
    - [ ] `COOKIE_SAMESITE=lax`
    - [ ] `COOKIE_SECURE=true` (producción siempre usa HTTPS)
    - [ ] `CORS_ORIGIN=https://tudominio.com`
  
  - **Frontend y Backend en dominios DIFERENTES**:
    - [ ] `COOKIE_SAMESITE=none`
    - [ ] `COOKIE_SECURE=true` (⚠️ OBLIGATORIO con SameSite=none)
    - [ ] Servidor DEBE usar HTTPS (no HTTP)
    - [ ] `CORS_ORIGIN=https://frontend.dominio.com`

- [ ] ⚠️ **VALIDACIÓN AUTOMÁTICA**: Si configuras `COOKIE_SAMESITE=none` con `COOKIE_SECURE=false`, el servidor lanzará error al iniciar (navegadores rechazan esta combinación)

- [ ] Confirmar que `withCredentials: true` está en frontend ([axios.js](../frontend/src/api/axios.js#L12))

### 👤 **3. USUARIO OWNER INICIAL**
- [ ] Configurar `SEED_OWNER_EMAIL` en `.env.production`
- [ ] Configurar `SEED_OWNER_PASSWORD` (mínimo 8 caracteres, idealmente 16+ con symbols)
- [ ] Al primer deploy, verificar logs de servidor:
  ```
  ✅ Usuario owner creado exitosamente
     Email: admin@sharkfit.com
     Role: owner
  ```
- [ ] **CRÍTICO**: Cambiar password inmediatamente después del primer login
  - Ir a `/account` → Cambiar contraseña

### 📧 **4. EMAILS (REQUERIDO SI `REQUIRE_EMAIL_VERIFICATION=true`)**
- [ ] Elegir proveedor (SendGrid, Mailgun, AWS SES)
- [ ] Obtener API Key y configurar en `.env.production`
- [ ] Implementar función `sendEmail()` en `utils/email.js`:
  ```javascript
  // Reemplazar console.log en auth.js líneas 177, 555
  await sendEmail({
    to: usuario.email,
    subject: 'Verifica tu email',
    html: `Token: ${verifyToken}`
  });
  ```
- [ ] Configurar dominio emisor verificado (SPF/DKIM)
- [ ] Probar envío de emails en staging antes de producción

### ⚙️ **5. VARIABLES DE CONFIGURACIÓN COMPLETAS**
```env
# Copiar a .env.production y completar TODOS los valores

PORT=8000
NODE_ENV=production

MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/sharkfit

JWT_SECRET=[GENERAR_64_BYTES]
JWT_ACCESS_SECRET=[GENERAR_64_BYTES_DIFERENTE]
JWT_ACCESS_TTL=15m
JWT_REFRESH_DAYS=7
JWT_REFRESH_COOKIE=refreshToken

COOKIE_SAMESITE=lax
COOKIE_SECURE=true
# ⚠️ OBLIGATORIO: Si usas COOKIE_SAMESITE=none, debes configurar COOKIE_SECURE=true

MAX_FAILED_LOGINS=5
LOCK_MINUTES=15

ALLOW_PUBLIC_REGISTER=false
REQUIRE_EMAIL_VERIFICATION=true

SEED_OWNER_EMAIL=admin@sharkfit.com
SEED_OWNER_PASSWORD=[PASSWORD_FUERTE_UNICA]
SEED_OWNER_FIRSTNAME=Admin
SEED_OWNER_LASTNAME=Principal
SEED_OWNER_USERNAME=admin

CORS_ORIGIN=https://dashboard.sharkfit.com
```

---

## 🧪 **TESTING PRE-PRODUCCIÓN**

### Test 1: Flujo de Registro
1. [ ] POST `/api/auth/register` con credenciales válidas
2. [ ] Verificar respuesta con `pending_verification` si `REQUIRE_EMAIL_VERIFICATION=true`
3. [ ] Recibir email con token de verificación
4. [ ] POST `/api/auth/verify-email` con token
5. [ ] Verificar status cambia a `active`

### Test 2: Flujo de Login
1. [ ] POST `/api/auth/login` con email/password
2. [ ] Verificar respuesta incluye `accessToken` (NO localStorage)
3. [ ] Verificar cookie `refreshToken` en DevTools (HttpOnly, Secure si HTTPS)
4. [ ] GET `/api/auth/me` con `Authorization: Bearer {accessToken}`
5. [ ] Verificar respuesta con datos de usuario

### Test 3: Refresh Token
1. [ ] Esperar 16+ minutos (expirar access token)
2. [ ] POST `/api/auth/refresh` (sin bearer token, solo cookie)
3. [ ] Verificar nuevo `accessToken` en respuesta
4. [ ] Verificar nueva cookie `refreshToken` (rotación)
5. [ ] Intentar refresh con token anterior → debe fallar (401)

### Test 4: Rate Limiting
1. [ ] Intentar login con password incorrecta 10 veces en 15 minutos
2. [ ] Verificar bloqueo después de 5 intentos (423 Locked)
3. [ ] Esperar `LOCK_MINUTES` (15 min) y verificar desbloqueo automático

### Test 5: Sessions Management
1. [ ] Login desde 2 navegadores diferentes
2. [ ] GET `/api/auth/sessions` → verificar 2 sesiones activas
3. [ ] DELETE `/api/auth/sessions/:id` en una sesión
4. [ ] Verificar que solo una sesión sigue activa
5. [ ] POST `/api/auth/sessions/close-all` → verificar logout total

---

## 🚢 **DEPLOYMENT**

### Opción A: VPS (DigitalOcean, AWS EC2, etc.)
```bash
# 1. Clonar repo en servidor
git clone https://github.com/tu-repo/sharkfit.git
cd sharkfit/backend-data-intake

# 2. Configurar .env.production
cp .env.production .env
nano .env  # Completar todas las variables

# 3. Instalar dependencias
npm install --production

# 4. Iniciar con PM2
npm install -g pm2
pm2 start src/server.js --name sharkfit-api
pm2 save
pm2 startup

# 5. Configurar Nginx reverse proxy (puerto 8000 → 443)
```

### Opción B: Servicios Managed (Heroku, Railway, Render)
1. [ ] Conectar repositorio Git
2. [ ] Configurar variables de entorno en dashboard
3. [ ] Deploy automático desde main branch
4. [ ] Verificar logs de startup (seed de owner)

### Post-Deploy
- [ ] Verificar logs: `owner creado exitosamente`
- [ ] Test manual de login con owner
- [ ] Monitorear logs de errores primeras 24h
- [ ] Configurar alertas (CPU > 80%, errores 5xx)

---

## 🔒 **SEGURIDAD ADICIONAL (OPCIONAL)**

### Hardening Avanzado
- [ ] Configurar Helmet.js con políticas CSP estrictas
- [ ] Habilitar HSTS (HTTP Strict Transport Security)
- [ ] Implementar rate limiting global (no solo auth)
- [ ] Agregar CAPTCHA en formulario de login (hCaptcha/reCAPTCHA)
- [ ] Configurar logs de auditoría en servicio externo (DataDog, Sentry)
- [ ] Implementar 2FA/TOTP con `speakeasy` (futuro)

### Monitoreo
- [ ] Configurar Winston para enviar logs críticos a servicio (Papertrail, Loggly)
- [ ] Alertas en Slack/Email para:
  - 5+ intentos de login fallidos en 1 minuto
  - Errores 500 en endpoints de auth
  - Session hijacking detectado (IP cambia drasticamente)

---

## ✅ **CHECKLIST FINAL**

Antes de marcar como listo para producción:

- [ ] Todos los items de **SEGURIDAD CRÍTICA** completados
- [ ] Tests de flujos principales pasados
- [ ] Logs de servidor sin errores críticos
- [ ] Backup de DB configurado (snapshots automáticos en Atlas)
- [ ] Documentación de recovery en caso de fallos
- [ ] Owner login testeado y password cambiada

---

**Fecha de Deployment**: _____________
**Responsable**: _____________
**Servidor**: _____________
**Frontend URL**: _____________

