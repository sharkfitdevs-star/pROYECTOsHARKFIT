# 🔐 SISTEMA DE AUTENTICACIÓN - GUÍA RÁPIDA

## 📦 **LO QUE SE IMPLEMENTÓ**

### Arquitectura de Tokens
- **Access Token**: JWT de 15 minutos, se almacena en **memoria** del navegador (no localStorage)
- **Refresh Token**: Aleatorio de 48 bytes, se guarda en **cookie HttpOnly** (7 días)
- **Seguridad**: Refresh token almacenado como hash SHA256 en DB (nunca en texto plano)

### Flujos Implementados
1. **Registro** → Crea usuario con status `pending_verification` (si `REQUIRE_EMAIL_VERIFICATION=true`)
2. **Login** → Valida password, genera access + refresh tokens, crea sesión en DB
3. **Refresh** → Valida cookie, rota refresh token (invalida anterior), devuelve nuevo access token
4. **Logout** → Revoca sesión en DB, limpia cookie
5. **Verificación Email** → Tokens de 24h con hash SHA256
6. **Reset Password** → Tokens de 1h con hash SHA256
7. **Gestión Sesiones** → Lista, cierra individual o todas las sesiones activas

### Protecciones de Seguridad
- ✅ Bcrypt cost 12 para passwords
- ✅ Rate limiting: 10 intentos login/15min, 5 reset password/hora
- ✅ Account locking: 5 intentos fallidos → bloqueo 15 minutos
- ✅ Refresh token rotation: cada refresh invalida token anterior
- ✅ Audit logs: LOGIN_SUCCESS/FAIL, PASSWORD_RESET, EMAIL_VERIFIED
- ✅ RBAC: 8 roles con middleware `requireRole(['admin', 'owner'])`
- ✅ CORS con credentials, SameSite cookies adaptativo

---

## 🚀 **CÓMO USAR**

### Desarrollo Local
```bash
cd backend-data-intake
npm install
cp .env .env.local  # Editar con tu MongoDB URI local
npm start
```

**Primera ejecución**: El servidor crea automáticamente el usuario owner desde variables `.env`:
```
✅ Usuario owner creado exitosamente
   Email: admin@sharkfit.com
   Username: admin
```

### Login en Frontend
```javascript
// En cualquier componente
import { useAuth } from '@/hooks/useAuth';

const { login, user, isAuthenticated, logout } = useAuth();

await login({
  email: 'admin@sharkfit.com',
  password: 'SharkFit2024!'
});

console.log(user.role); // 'owner'
```

### Llamadas API Protegidas
```javascript
// Automáticamente incluye access token y refresca si expiró
import api from '@/api/client';

const usuarios = await api.get('/usuarios');
// Si access token expiró, axios interceptor llama /auth/refresh automáticamente
```

---

## 🔧 **CONFIGURACIÓN**

### Variables Clave (.env)
| Variable | Desarrollo | Producción |
|----------|------------|------------|
| `NODE_ENV` | `development` | `production` |
| `MONGODB_URI` | Local o Atlas dev | Atlas cluster prod |
| `JWT_ACCESS_SECRET` | Default OK | **GENERAR 64 bytes** |
| `COOKIE_SAMESITE` | `lax` | `lax` (mismo dominio) o `none` (cross-domain) |
| `COOKIE_SECURE` | `false` | `true` (⚠️ obligatorio si `sameSite=none`) |
| `REQUIRE_EMAIL_VERIFICATION` | `false` | `true` |
| `SEED_OWNER_PASSWORD` | Dev password | **PASSWORD FUERTE** |
| `CORS_ORIGIN` | `http://localhost:5173` | `https://tudominio.com` |

### Generar Secretos para Producción
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copiar output a `JWT_ACCESS_SECRET` en `.env.production`

---

## 📝 **ENDPOINTS DISPONIBLES**

### Auth Públicos
- `POST /api/auth/login` - Login con email/username + password
- `POST /api/auth/register` - Registro (requiere admin/owner si `ALLOW_PUBLIC_REGISTER=false`)
- `POST /api/auth/verify-email` - Verifica email con token
- `POST /api/auth/forgot-password` - Solicita reset de password
- `POST /api/auth/reset-password` - Resetea password con token

### Auth Protegidos (requieren access token)
- `POST /api/auth/refresh` - Refresh access token (cookie automática)
- `POST /api/auth/logout` - Cierra sesión actual
- `GET /api/auth/me` - Datos del usuario autenticado
- `POST /api/auth/change-password` - Cambia password (requiere actual + nueva)
- `GET /api/auth/sessions` - Lista sesiones activas del usuario
- `DELETE /api/auth/sessions/:id` - Cierra sesión específica
- `POST /api/auth/sessions/close-all` - Cierra todas las sesiones excepto actual

### Otros Endpoints Protegidos
- `GET /api/usuarios` - Lista usuarios (requiere auth)
- `POST /api/usuarios` - Crea usuario (requiere owner/admin/manager)
- `DELETE /api/usuarios/:id` - Elimina usuario (requiere owner/admin)

---

## 🛡️ **ROLES Y PERMISOS**

| Rol | Permisos |
|-----|----------|
| `owner` | Acceso total, puede crear/eliminar admins |
| `admin` | Gestión completa excepto otros admins |
| `manager` | Gestión de staff en su sucursal |
| `staff` | Lectura y modificación limitada |
| `viewer` | Solo lectura |
| `instructor` | Gestión de clases y clientes |
| `recepcionista` | Check-ins y agendamientos |
| `vendedor` | Ventas y membresías |

**Proteger ruta en backend**:
```javascript
const { requireAuth, requireRole } = require('./middleware/auth');

router.delete('/usuarios/:id',
  requireAuth,
  requireRole(['owner', 'admin']),
  async (req, res) => {
    // Solo owner y admin pueden eliminar usuarios
  }
);
```

**Proteger ruta en frontend**:
```jsx
<Route 
  path="/admin/usuarios" 
  element={
    <ProtectedRoute roles={['owner', 'admin']}>
      <UsuariosPage />
    </ProtectedRoute>
  } 
/>
```

---

## 🐛 **TROUBLESHOOTING**

### Error: "Refresh token not found"
- **Causa**: Cookie bloqueada por navegador (secure=true en HTTP, o SameSite incorrecto)
- **Solución Dev**: Verificar `.env` tiene `COOKIE_SAMESITE=lax` y `COOKIE_SECURE=false`
- **Solución Prod**: Usar HTTPS, configurar `COOKIE_SECURE=true` y:
  - Mismo dominio: `COOKIE_SAMESITE=lax`
  - Cross-domain: `COOKIE_SAMESITE=none` (requiere `COOKIE_SECURE=true`)
- **Verificar**: DevTools → Network → verificar que cookie `refreshToken` se envía en Request Headers

### Error: "Configuración inválida: COOKIE_SAMESITE=none requiere COOKIE_SECURE=true"
- **Causa**: Intentas usar `COOKIE_SAMESITE=none` con `COOKIE_SECURE=false`
- **Comportamiento**:
  - **Desarrollo**: Warning en consola, servidor sigue corriendo
  - **Producción**: Error fatal, servidor NO inicia
- **Solución**: Elige una opción:
  - **Opción 1**: `COOKIE_SAMESITE=lax` + `COOKIE_SECURE=false` (dev local HTTP)
  - **Opción 2**: `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` (prod cross-domain HTTPS)

### Error: "Cuenta bloqueada temporalmente"
- **Causa**: 5+ intentos de login con password incorrecta
- **Solución**: Esperar `LOCK_MINUTES` (15 min por default) o resetear manualmente:
  ```javascript
  // En MongoDB o herramienta de admin
  db.usuarios.updateOne(
    { email: 'usuario@example.com' },
    { $set: { failedLoginAttempts: 0, accountLockedUntil: null, status: 'active' } }
  );
  ```

### Error: "Usuario no encontrado" en seed
- **Causa**: Variables `SEED_OWNER_EMAIL` o `SEED_OWNER_PASSWORD` no configuradas
- **Solución**: Agregar a `.env`:
  ```env
  SEED_OWNER_EMAIL=admin@sharkfit.com
  SEED_OWNER_PASSWORD=password123
  ```
  Reiniciar servidor con DB vacía

### Access token expira constantemente
- **Causa**: TTL muy bajo o reloj del servidor desincronizado
- **Solución**: Ajustar `.env`:
  ```env
  JWT_ACCESS_TTL=30m  # Aumentar a 30 minutos
  ```

---

## 📚 **PRÓXIMOS PASOS**

### Implementación de Emails (REQUERIDO para producción)
1. Elegir proveedor (SendGrid, Mailgun, AWS SES)
2. Crear archivo `backend-data-intake/src/utils/email.js`:
   ```javascript
   const sendEmail = async ({ to, subject, html }) => {
     // Integración con SendGrid/Mailgun
   };
   module.exports = { sendEmail };
   ```
3. Reemplazar `console.log` en [auth.js línea 177](../backend-data-intake/src/routes/auth.js#L177) y [línea 555](../backend-data-intake/src/routes/auth.js#L555)

### 2FA/TOTP (Opcional)
- Instalar: `npm install speakeasy qrcode`
- Agregar campo `totpSecret` en modelo Usuario
- Implementar endpoints `/auth/setup-2fa` y `/auth/verify-2fa`

### OAuth (Google/Microsoft)
- Instalar: `npm install passport passport-google-oauth20`
- Crear estrategias en `src/auth/strategies/`
- Agregar rutas `/auth/google` y `/auth/google/callback`

---

**Versión**: 2.0.0  
**Última actualización**: Enero 2024  
**Documentación completa**: [PRODUCCION_CHECKLIST.md](PRODUCCION_CHECKLIST.md)
