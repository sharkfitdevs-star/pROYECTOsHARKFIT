# ✅ VERIFICACIÓN DE CONFIGURACIÓN DE COOKIES

## 🔍 **MINI-CHECK RÁPIDO**

### 1. Verificar código en [auth.js](src/routes/auth.js)

**✅ LO QUE DEBE ESTAR**:
```javascript
const sameSiteRaw = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
const sameSite = ['lax', 'strict', 'none'].includes(sameSiteRaw) ? sameSiteRaw : 'lax';

// ✅ Evaluación estricta: SOLO depende de COOKIE_SECURE
const secure = String(process.env.COOKIE_SECURE).toLowerCase() === 'true';

// ✅ Validación: warning en dev, error en prod
if (sameSite === 'none' && !secure) {
  const msg = '...';
  if (process.env.NODE_ENV === 'production') throw new Error(msg);
  console.warn('[AUTH COOKIE WARNING]', msg);
}
```

**❌ LO QUE NO DEBE EXISTIR**:
```javascript
// ❌ NUNCA hacer esto:
const secure = process.env.COOKIE_SECURE === 'true' || 
               process.env.NODE_ENV === 'production' ||
               sameSite === 'none';  // ← Esto rompe dev
```

---

## 🧪 **PRUEBAS DE FUNCIONAMIENTO**

### Test 1: Dev con HTTP (localhost)

**Config en `.env`**:
```env
NODE_ENV=development
COOKIE_SAMESITE=lax
COOKIE_SECURE=false
```

**Resultado esperado**:
- ✅ Cookie `refreshToken` enviada por el navegador
- ✅ DevTools → Network → `/api/auth/refresh` muestra header `Cookie: refreshToken=...`
- ✅ Login funciona y sesión se mantiene

---

### Test 2: Prod con HTTPS (mismo dominio)

**Config en `.env.production`**:
```env
NODE_ENV=production
COOKIE_SAMESITE=lax
COOKIE_SECURE=true
```

**Resultado esperado**:
- ✅ Cookie con flag `Secure`
- ✅ Solo se envía por HTTPS
- ✅ Frontend y backend en `https://tudominio.com`

---

### Test 3: Prod con HTTPS (cross-domain)

**Config en `.env.production`**:
```env
NODE_ENV=production
COOKIE_SAMESITE=none
COOKIE_SECURE=true
CORS_ORIGIN=https://frontend.dominio.com
```

**Resultado esperado**:
- ✅ Cookie con `SameSite=None; Secure`
- ✅ Cookie viaja entre dominios diferentes
- ✅ Backend en `https://api.dominio.com`, frontend en `https://frontend.dominio.com`

---

### Test 4: Configuración inválida (debe fallar)

**Config incorrecta**:
```env
COOKIE_SAMESITE=none
COOKIE_SECURE=false  # ← INVÁLIDO
```

**Resultado esperado**:
- ❌ **Desarrollo**: Warning en consola, servidor sigue corriendo
  ```
  [AUTH COOKIE WARNING] Configuración inválida: COOKIE_SAMESITE=none requiere COOKIE_SECURE=true...
  ```
- ❌ **Producción**: Servidor NO inicia, lanza error:
  ```
  Error: Configuración inválida: COOKIE_SAMESITE=none requiere COOKIE_SECURE=true...
  ```

---

## 🔒 **CHECKLIST DE SEGURIDAD POST-IMPLEMENTACIÓN**

### Paso 1: JWT Secrets
```bash
# Generar nuevos secrets de 64 bytes
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Actualizar en `.env.production`:
```env
JWT_SECRET=[SECRET_64_BYTES_1]
JWT_ACCESS_SECRET=[SECRET_64_BYTES_2_DIFERENTE]
```

### Paso 2: Seed Owner
- [ ] Cambiar `SEED_OWNER_PASSWORD` en prod a contraseña única y fuerte
- [ ] Después de primer deploy y login, **deshabilitar seed**:
  ```env
  # Opcional: comentar o eliminar estas líneas después del primer deploy
  # SEED_OWNER_EMAIL=...
  # SEED_OWNER_PASSWORD=...
  ```

### Paso 3: Verificar cookies en navegador
1. Abrir DevTools → Application → Cookies
2. Buscar `refreshToken`
3. Verificar flags:
   - ✅ `HttpOnly`: true
   - ✅ `Secure`: true (prod) o false (dev)
   - ✅ `SameSite`: Lax o None según config
   - ✅ `Path`: /api/auth

### Paso 4: Test de refresh token
1. Login exitoso
2. Esperar 16+ minutos (expirar access token)
3. Hacer request a endpoint protegido (ej: `/api/usuarios`)
4. Verificar que axios interceptor llama `/api/auth/refresh` automáticamente
5. Confirmar que nuevo access token se obtiene sin re-login

---

## 🐛 **TROUBLESHOOTING**

### Problema: "Refresh token not found" en dev local

**Causa**: Cookie no se envía porque `secure=true` en HTTP  
**Solución**:
```env
# .env (desarrollo)
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

### Problema: Warning en consola "COOKIE_SAMESITE=none requiere COOKIE_SECURE=true"

**Causa**: Configuración inválida detectada  
**Solución**: Elige una de estas opciones:
```env
# Opción 1: Cambiar a lax (recomendado si mismo dominio)
COOKIE_SAMESITE=lax
COOKIE_SECURE=false  # (o true en prod)

# Opción 2: Activar secure (requiere HTTPS)
COOKIE_SAMESITE=none
COOKIE_SECURE=true
```

### Problema: Cookie no viaja en cross-domain (producción)

**Causa**: Falta configurar `SameSite=None` o CORS incorrecto  
**Solución**:
```env
# Backend .env.production
COOKIE_SAMESITE=none
COOKIE_SECURE=true
CORS_ORIGIN=https://frontend.dominio.com
```

```javascript
// Frontend axios.js - verificar
withCredentials: true  // ← CRÍTICO para enviar cookies cross-domain
```

---

## 📊 **MATRIZ DE CONFIGURACIONES**

| Entorno | Protocolo | Frontend/Backend | COOKIE_SAMESITE | COOKIE_SECURE | Resultado |
|---------|-----------|------------------|-----------------|---------------|-----------|
| Dev | HTTP | localhost:5173 / localhost:8000 | `lax` | `false` | ✅ Funciona |
| Dev | HTTP | localhost:5173 / localhost:8000 | `none` | `false` | ⚠️ Warning |
| Dev | HTTPS | localhost:5173 / localhost:8000 | `lax` | `true` | ✅ Funciona |
| Prod | HTTPS | mismo dominio | `lax` | `true` | ✅ Funciona |
| Prod | HTTPS | cross-domain | `none` | `true` | ✅ Funciona |
| Prod | HTTPS | cross-domain | `none` | `false` | ❌ Error (no inicia) |
| Prod | HTTP | cualquiera | cualquiera | `true` | ❌ Cookie no viaja |

---

**Última actualización**: Febrero 12, 2026  
**Versión de implementación**: 2.1.0 (evaluación estricta)
