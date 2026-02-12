# 🌐 MONGODB ATLAS - Setup para Desarrollo y Producción

## 🎯 Por qué MongoDB Atlas para tu caso

Vas a deployer a la web, entonces necesitas MongoDB en la nube:

- ✅ **Mismo connection string** en desarrollo y producción
- ✅ **Sin servidor propio** que mantener
- ✅ **Backups automáticos** incluidos
- ✅ **Plan gratis** 512MB (suficiente para ~50,000 clientes)
- ✅ **Escalable** cuando necesites más

---

## 📝 PASO 1: Crear cuenta MongoDB Atlas (2 minutos)

### 1. Ir a MongoDB Atlas
https://www.mongodb.com/cloud/atlas/register

### 2. Crear cuenta con email
- Email: tu-email@gmail.com
- Password: (crea una segura)
- ✅ Acepta términos
- Crear cuenta

### 3. Verificar email
- Revisa tu email
- Click en "Verify Email"

### 4. Completar perfil
- Goal: Learn MongoDB
- Type of application: Personal project
- Preferred language: JavaScript
- Continue

---

## 🗄️ PASO 2: Crear cluster gratis (2 minutos)

### 1. En el dashboard, click "Create"

### 2. Seleccionar plan GRATIS:
```
M0 (Free)
- 512 MB Storage
- Shared RAM
- Perfect for learning/small apps
```
Click en **"Create"** (el botón verde del plan M0)

### 3. Configurar cluster:
- **Provider:** AWS (o el que prefieras)
- **Region:** us-east-1 (o el más cercano a donde deployarás)
  - Para México/Latinoamérica: us-east-1 (Virginia) o South America (São Paulo)
- **Cluster Name:** Cluster0 (déjalo así)

Click **"Create Deployment"**

### 4. Crear usuario de base de datos:

Te aparecerá un popup "Security Quickstart"

**Username:** `sharkfit`  
**Password:** Genera una automática o usa: `Sharkfit2024!`  

⚠️ **COPIA LA PASSWORD** - la necesitarás después

Click **"Create Database User"**

### 5. Configurar acceso desde cualquier IP:

Aún en el popup:

- My Local Environment → Add Entry
- IP Address: `0.0.0.0/0` (IMPORTANTE: para desarrollo)
- Description: "Allow from anywhere (dev)"

⚠️ En producción cambiarás esto a la IP de tu servidor

Click **"Add Entry"** → **"Finish and Close"**

---

## 🔗 PASO 3: Obtener Connection String (1 minuto)

### 1. En tu cluster, click "Connect"

### 2. Seleccionar: "Connect your application"

### 3. Copiar el connection string:

Verás algo como:
```
mongodb+srv://sharkfit:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 4. Reemplazar `<password>` con tu password real:

**ANTES:**
```
mongodb+srv://sharkfit:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**DESPUÉS (ejemplo):**
```
mongodb+srv://sharkfit:Sharkfit2024!@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

⚠️ **IMPORTANTE:** Si tu password tiene caracteres especiales (`@`, `#`, `$`, etc.), debes codificarlos:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `!` → `%21`

**Ejemplo con password `Shark@2024!`:**
```
mongodb+srv://sharkfit:Shark%402024%21@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

### 5. Agregar nombre de base de datos:

Cambiar el final para especificar la DB `sharkfit`:

**FINAL:**
```
mongodb+srv://sharkfit:Sharkfit2024!@cluster0.abc123.mongodb.net/sharkfit?retryWrites=true&w=majority
```

---

## 📝 PASO 4: Configurar tu .env

### 1. Abrir: `backend-data-intake/.env`

### 2. Actualizar MONGODB_URI:

```env
# ─── MONGODB (Atlas Cloud - Desarrollo y Producción) ───
MONGODB_URI=mongodb+srv://sharkfit:TU_PASSWORD@cluster0.xxxxx.mongodb.net/sharkfit?retryWrites=true&w=majority

# Reemplaza:
# - TU_PASSWORD: con tu password real
# - cluster0.xxxxx: con tu cluster URL real
```

**Ejemplo completo de .env:**
```env
PORT=8000
NODE_ENV=development

MONGODB_URI=mongodb+srv://sharkfit:Sharkfit2024!@cluster0.abc123.mongodb.net/sharkfit?retryWrites=true&w=majority

JWT_SECRET=sharkfit-super-secret-key-2024-cambiar-en-produccion
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173

EVO_BASE_URL=https://evo-integracao-api.w12app.com.br
# EVO_DNS=tu-empresa
# EVO_TOKEN=tu-token-evo5

POLL_INTERVAL_MS=10000
LOG_LEVEL=info
```

---

## 🚀 PASO 5: Probar conexión

### 1. Iniciar backend:

```powershell
cd backend-data-intake
npm run dev
```

### 2. Deberías ver:

```
🔗 Conectando a MongoDB...
✅ MongoDB conectado exitosamente
🚀 Servidor iniciado en http://localhost:8000
```

### 3. Verificar health:

Abre en navegador: http://localhost:8000/health

Deberías ver:
```json
{
  "status": "ok",
  "mongodb": "connected",
  "uptime": 2.5
}
```

✅ **¡LISTO! MongoDB Atlas funcionando**

---

## 🌐 PASO 6: Usar en producción (Cuando deployes)

### Opciones de deployment:

#### 1. **Railway** (Más fácil - Recomendado)
```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

**Variables de entorno en Railway:**
- `MONGODB_URI`: tu connection string de Atlas
- `JWT_SECRET`: cambiar por uno más seguro
- `CORS_ORIGIN`: tu dominio real (ej: https://sharkfit.app)

#### 2. **Vercel** (Para Node.js serverless)
```bash
npm install -g vercel
vercel
```

#### 3. **Heroku**
```bash
heroku create sharkfit-api
git push heroku main
heroku config:set MONGODB_URI="tu-connection-string"
```

#### 4. **DigitalOcean App Platform**
- Conectar GitHub
- Seleccionar repositorio
- Agregar variables de entorno
- Deploy

### ⚠️ IMPORTANTE para producción:

1. **Cambiar JWT_SECRET** a algo más complejo
2. **Actualizar CORS_ORIGIN** a tu dominio real
3. **Restringir IPs en MongoDB Atlas:**
   - Network Access → Edit
   - Cambiar `0.0.0.0/0` por la IP de tu servidor
4. **Habilitar MongoDB backups** (ya incluido en Atlas)

---

## 📊 Ver tus datos en MongoDB Atlas

### En el navegador:

1. Ir a https://cloud.mongodb.com
2. Login
3. Database → Browse Collections
4. Ver: `clientes`, `ventas`, `usuarios`, etc.

### Con MongoDB Compass (Aplicación Desktop):

1. Descargar: https://www.mongodb.com/try/download/compass
2. Instalar (gratis, no requiere login adicional)
3. Conectar con tu connection string
4. Ver y editar datos con interfaz gráfica

---

## 🔧 Comandos útiles

### Ver logs en MongoDB Atlas:
1. Cluster → Metrics
2. Ver: Operations, Connections, Network

### Crear backup manual:
1. Cluster → Backup (solo en planes pagos)
2. Plan gratis: backups automáticos cada 24h

### Escalar cuando necesites más:
1. Cluster → Edit Configuration
2. Cambiar a M10 ($59/mes) o superior

---

## 💰 Límites del plan gratis (M0)

- ✅ 512 MB almacenamiento (~50,000 clientes con datos)
- ✅ Conexiones: 500 simultáneas
- ✅ Operaciones: ilimitadas
- ✅ Backups automáticos (últimas 24h)
- ⚠️ No clusters múltiples
- ⚠️ No escalado automático

**Para tu gimnasio:** Más que suficiente para empezar. Cuando superes 10,000 miembros activos, considerar upgrade a M10.

---

## 🐛 Troubleshooting

### ❌ Error: "Authentication failed"

**Causa:** Password incorrecta en connection string

**Solución:**
1. Verifica que la password no tenga caracteres especiales sin codificar
2. O crea nuevo usuario en Atlas: Database Access → Add New User

### ❌ Error: "Could not connect to any servers"

**Causa:** IP no autorizada

**Solución:**
1. MongoDB Atlas → Network Access
2. Verificar que `0.0.0.0/0` esté en la lista
3. O agregar tu IP actual

### ❌ Error: "MongoServerError: bad auth"

**Causa:** Usuario no tiene permisos

**Solución:**
1. Database Access → Edit usuario
2. Verificar que tenga rol: "Read and write to any database"

### ❌ Connection string no funciona

**Ejemplo correcto:**
```
mongodb+srv://sharkfit:Sharkfit2024!@cluster0.abc123.mongodb.net/sharkfit?retryWrites=true&w=majority
```

**Verificar:**
- ✅ Empieza con `mongodb+srv://`
- ✅ Password sin `<>`
- ✅ Cluster URL correcto (.mongodb.net)
- ✅ Nombre de DB al final (`/sharkfit`)
- ✅ Sin espacios

---

## ✅ Checklist completo

- [ ] Cuenta MongoDB Atlas creada
- [ ] Email verificado
- [ ] Cluster M0 (gratis) creado
- [ ] Usuario de DB creado (sharkfit)
- [ ] IP `0.0.0.0/0` autorizada
- [ ] Connection string copiado
- [ ] Password reemplazada en connection string
- [ ] `.env` actualizado con MONGODB_URI
- [ ] Backend iniciado: `npm run dev`
- [ ] Health check OK: http://localhost:8000/health
- [ ] (Opcional) MongoDB Compass instalado

---

## 🎯 Ventajas para tu deployment futuro

**Con MongoDB Atlas:**
1. ✅ Código idéntico en desarrollo y producción
2. ✅ Solo cambias `MONGODB_URI` en variables de entorno
3. ✅ Sin migración de datos (ya están en la nube)
4. ✅ Sin servidor MongoDB que mantener
5. ✅ Escalable cuando crezcas

**Sin MongoDB Atlas (usando Docker local):**
1. ❌ Tienes que exportar/importar datos
2. ❌ Dos configuraciones diferentes (local vs producción)
3. ❌ Necesitas configurar MongoDB en tu servidor
4. ❌ Tú manejas backups y seguridad

---

## 🚀 Resumen

**Para desarrollo Y producción:**
1. Crear cuenta MongoDB Atlas (gratis)
2. Crear cluster M0 (gratis)
3. Copiar connection string
4. Actualizar `.env`
5. ¡Listo para desarrollo y producción!

**Mismo código, misma DB, zero configuración extra cuando deployes.**
