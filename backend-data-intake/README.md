# 🚀 STAGE 4 - EVO5 Data Intake Service

Servicio Node.js/Express que sincroniza datos automáticamente desde **EVO5 CRM** hacia **Django Backend**.

## 📋 ¿Qué Hace?

```
┌──────────┐     ┌─────────────┐     ┌─────────────┐
│  EVO5    │────▶│  Stage 4    │────▶│   Django    │
│  CRM     │     │ (Node.js)   │     │  Backend    │
└──────────┘     └─────────────┘     └─────────────┘
              API HTTP               REST API + JWT
```

- ✅ **Conecta a EVO5 API** con credenciales (DNS + Token)
- ✅ **Polling automático** cada 10 segundos
- ✅ **Sincroniza datos**: Clientes, Ventas, Contactos
- ✅ **Transforma formatos** EVO5 → Django
- ✅ **Inserta en Django** vía REST API
- ✅ **WebSocket real-time** para actualizaciones en vivo

## 🔧 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar .env
```bash
cp .env.example .env
```

Editar `.env`:
```dotenv
PORT=3001
EVO_BASE_URL=https://evo-integracao-api.w12app.com.br
DJANGO_BASE_URL=http://localhost:8000/api
DJANGO_JWT_TOKEN=tu-token-jwt-aqui
POLL_MS=10000
```

Registro público (desarrollo vs producción):
- En `development` puedes habilitar el registro desde la UI para pruebas locales usando `ALLOW_PUBLIC_REGISTER=true` en `.env`.
- En **producción** mantén `ALLOW_PUBLIC_REGISTER=false` y crea el primer usuario `owner` mediante el seed (configurar `SEED_OWNER_PASSWORD`) o el script interactivo `npm run create-owner` (ver `COMO_CREAR_PRIMER_USUARIO.md`).

### 3. Obtener credenciales

#### EVO5 Credentials
- DNS: Tu dominio/empresa en EVO5
- Token: Generar en Settings → API Tokens

#### Django JWT Token
```bash
# 1. Activar Django backend
cd ../backend
python manage.py runserver

# 2. En otra terminal, hacer login
curl -X POST http://localhost:8000/api/usuarios/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response:
# {
#   "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "refresh": "...",
#   "usuario": { ... }
# }

# 3. Copiar el valor de "access" al .env
DJANGO_JWT_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...
```

## ▶️ Iniciar Servicio

### Modo desarrollo (con reinicio automático)
```bash
npm run dev
```

### Modo producción
```bash
npm start
```

Deberías ver:
```
═══════════════════════════════════════════════════════════════
🚀 SHARKFIT DATA INTAKE - STAGE 4
Sincronizando EVO5 → Django en tiempo real
═══════════════════════════════════════════════════════════════

📍 EVO5 API:      https://evo-integracao-api.w12app.com.br
📍 Django API:    http://localhost:8000/api
📍 Puerto:        3005
⏱️  Poll Interval: 10000ms

✅ Servidor listo en: http://localhost:3005

📝 API Endpoints:
   POST   /login              { dns, token, django_token } → sessionToken
   GET    /api/snapshot       (requiere header x-session-token)
   POST   /api/sync           (fuerza sincronización inmediata)
   GET    /health             (checkeo de salud del servicio)

🔌 WebSocket (Socket.IO):
   Evento: evo:snapshot       (datos cada 10000ms)
   Evento: sync:request       (sincronización manual)
```

## 🌐 API REST Endpoints

### 1. Login (Obtener sesión)
```bash
POST /login
Content-Type: application/json

{
  "dns": "mi-empresa",
  "token": "token-evo5-aqui",
  "django_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response:
{
  "ok": true,
  "sessionToken": "a1b2c3d4e5f6...",
  "message": "Sesión iniciada correctamente"
}
```

### 2. Obtener snapshot de EVO5
```bash
GET /api/snapshot
Headers:
  x-session-token: a1b2c3d4e5f6...

Response:
{
  "ok": true,
  "ts": "2024-02-11T15:30:00.000Z",
  "sales": { "ok": true, "data": {...} },
  "prospects": { "ok": true, "data": {...} },
  "entries": { "ok": true, "data": {...} },
  "contacts": { "ok": true, "data": {...} }
}
```

### 3. Forzar sincronización
```bash
POST /api/sync
Headers:
  x-session-token: a1b2c3d4e5f6...

Response:
{
  "ok": true,
  "message": "Sincronización completada",
  "results": {
    "clients": { "synced": 5, "errors": 0 },
    "sales": { "synced": 12, "errors": 2 }
  },
  "timestamp": "2024-02-11T15:30:00.000Z"
}
```

### 4. Health Check
```bash
GET /health

Response:
{
  "ok": true,
  "service": "sharkfit-data-intake",
  "status": "running",
  "timestamp": "2024-02-11T15:30:00.000Z"
}
```

## 🔌 WebSocket (Socket.IO)

Conecta desde frontend para recibir datos en tiempo real:

### Cliente JavaScript (Frontend)
```javascript
import { io } from "socket.io-client";

// Login primero para obtener sessionToken
const response = await fetch("http://localhost:3001/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    dns: "mi-empresa",
    token: "token-evo5",
    django_token: "token-django"
  })
});

const { sessionToken } = await response.json();

// Conectar WebSocket
const socket = io("http://localhost:3001", {
  auth: { sessionToken }
});

// Recibir snapshots cada 10 segundos
socket.on("evo:snapshot", (snap) => {
  console.log("📡 Datos de EVO5:", snap);
  
  if (snap.prospects?.ok) {
    console.log("✅ Clientes:", snap.prospects.data.items);
  }
  
  if (snap.sales?.ok) {
    console.log("✅ Ventas:", snap.sales.data.items);
  }
});

// Errores de conexión
socket.on("evo:error", (err) => {
  console.error("❌ Error:", err.message);
});

// Forzar sincronización manual
socket.emit("sync:request");

socket.on("sync:complete", (result) => {
  console.log("✅ Sincronización completa:", result.results);
});

socket.on("sync:error", (err) => {
  console.error("❌ Error en sincronización:", err.message);
});
```

## 📊 Flujo Completo

### 1. Bootstrap
```
1. Iniciar Django backend
   python manage.py runserver

2. Obtener JWT token Django
   curl -X POST http://localhost:8000/api/usuarios/login/ ...

3. Copiar token al .env (DJANGO_JWT_TOKEN)

4. Iniciar Stage 4
   npm start

5. Test health check
   curl http://localhost:3001/health
```

### 2. Primera sincronización (REST)
```bash
# Paso 1: Login
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{
    "dns": "mi-empresa",
    "token": "token-evo5",
    "django_token": "token-django"
  }'

# Respuesta:
# {"ok":true,"sessionToken":"abc123...","message":"..."}

# Guardar sessionToken

# Paso 2: Forzar sincronización
curl -X POST http://localhost:3001/api/sync \
  -H "x-session-token: abc123..."

# Respuesta:
# {"ok":true,"message":"Sincronización completada","results":{...}}
```

### 3. Monitoreo continuo (WebSocket)
```bash
# Conecta el frontend con Socket.IO
# Recibe snapshots cada 10 segundos
# Dashboard ve datos en TIEMPO REAL
```

## 🔄 Transformación de Datos

### EVO5 → Django (Clientes)
```javascript
// EVO5 formato
{
  name: "Acme Corp",
  email: "contacto@acme.com",
  phone: "+55 11 99999-9999",
  razao_social: "Acme Corporation LTDA"
}

// Transforma a Django
{
  nombre: "Acme Corp",
  email: "contacto@acme.com",
  telefono: "+55 11 99999-9999",
  empresa: "Acme Corporation LTDA",
  estado: "activo",
  fuente: "evo5"
}
```

### EVO5 → Django (Ventas)
```javascript
// EVO5 formato
{
  code: "VTA-123",
  prospect_id: 456,
  value: 15000.00,
  status: "won"
}

// Transforma a Django
{
  numero_venta: "VTA-123",
  cliente: 1,  // Mapeo interno
  tipo: "nueva_afiliacion",
  estado: "completada",
  monto_total: 15000.00,
  monto_neto: 15000.00
}
```

## 🐛 Troubleshooting

### Error: "Credenciales EVO5 inválidas"
- Verifica DNS y Token en EVO5
- Comprueba permisos de API en EVO5

### Error: "Django token no configurado"
- Obtén token: `curl -X POST http://localhost:8000/api/usuarios/login/`
- Actualiza `.env`: `DJANGO_JWT_TOKEN=...`
- Reinicia Stage 4: `npm start`

### No sincroniza clientes
- Verifica que Django esté corriendo: `curl http://localhost:8000/health`
- Verifica token Django válido
- Check logs: `npm run dev`

### WebSocket no conecta
- Verifica sessionToken válido
- Mira CORS en http://localhost:3001

## 📚 Documentación Completa

Ver [STAGE_4_COMPLETADO.md](../docs/documentado/STAGE_4_COMPLETADO.md) para:
- Diagrama de arquitectura
- Flujos de sincronización
- Configuración avanzada
legacy SQLite (historical) / MongoDB for ingestion
- Webhooks de EVO5

## 📌 Checklist de Activación

- [ ] Django backend corriendo (`http://localhost:8000`)
- [ ] JWT token obtenido
- [ ] `.env` configurado con credenciales
- [ ] Dependencies instaladas (`npm install`)
- [ ] Health check: `curl http://localhost:3001/health`
- [ ] Primera sincronización: `POST /api/sync`
- [ ] WebSocket conecta: Socket.IO client
- [ ] Datos aparecen en Django admin

## 📞 Soporte

Problemas? Ver:
- [API_DOCUMENTACION_COMPLETA.md](../docs/documentado/API_DOCUMENTACION_COMPLETA.md)
- [PROYECTO_COMPLETO_STATUS.md](../docs/documentado/PROYECTO_COMPLETO_STATUS.md)

---

**Status:** 🟢 Stage 4 Ready  
**Versión:** 1.0.0  
**Last Updated:** February 2024
