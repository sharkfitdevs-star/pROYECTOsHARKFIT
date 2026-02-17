# ⚠️ LEGACY: EVO W12 Proxy (SQLite) — Deprecated

Esta documentación describe la versión *legacy* del proxy basada en **SQLite**. El proxy ya está migrado a MongoDB — consulte `QUICKSTART-EVO.md` para la guía actual.

(Archivo retenido por compatibilidad histórica; no usar en despliegues nuevos.)

## 📋 Características

- ✅ **SQLite Native**: Sin necesidad de PostgreSQL, usa el mismo db.sqlite3 de Django
- 🔒 **Encriptación AES-256-GCM**: Tokens protegidos en base de datos
- 🔄 **Sincronización Automática**: Prospects, Sales, Entries cada 15 minutos
- 🎯 **Idempotencia Garantizada**: UPSERT logic previene duplicados
- 🛡️ **Global Lock**: Previene race conditions durante sync
- 📊 **Transacciones SQLite**: Integridad de datos asegurada
- 🚀 **Alto Rendimiento**: `better-sqlite3` es más rápido que drivers async

---

## 🚀 Instalación Rápida

### 1. Instalar Dependencias

```bash
cd backend-data-intake
# LEGACY: SQLite instructions removed — see QUICKSTART-EVO.md (MongoDB)
```

### 2. Generar Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Resultado esperado**: `a1b2c3d4e5f6...` (64 caracteres hex)

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env`:
```env
# LEGACY: DATABASE_PATH (SQLite) — use MONGODB_URI for MongoDB in .env
ENCRYPTION_KEY=tu_clave_de_64_caracteres_aqui
SYNC_INTERVAL_MINUTES=15
```

### 4. Registrar Credenciales EVO

**Opción A: Script Helper** (recomendado)

```bash
node scripts/add-evo-credentials.js
```

**Opción B: Manual SQL**

```sql
-- Conectar a db.sqlite3
# LEGACY: sqlite3 steps removed — use `mongosh --uri "$MONGODB_URI"` (historical reference)

-- Insertar credenciales (usa el script encrypt-token.js para encriptar)
INSERT INTO api_integrations (
    id, tenant_id, dns, encrypted_token, encryption_iv, status
) VALUES (
    lower(hex(randomblob(16))),
    'gym-sharkfit-001',
    'tu-dns-evo',
    'token_encriptado_aqui',
    'iv_hex_aqui',
    'active'
);
```

### 5. Ejecutar Proxy

```bash
node src/evo-w12-proxy-sqlite.js
```

**Output esperado:**
```
================================================================================
  EVO W12 INTEGRATION PROXY SERVER (SQLite Edition)
  Vendify - Sales Management System
================================================================================
  Database: C:\...\backend\db.sqlite3
  EVO API: https://evo-integracao-api.w12app.com.br
  Started: 2024-02-11T15:30:00.000Z
================================================================================

[Database] Schema initialized successfully
[System] 🚀 Starting sync cycle at 2024-02-11T15:30:00.000Z
[System] 📊 Found 1 active integration(s)
[Sync] Starting for Tenant: gym-sharkfit-001 (DNS: tu-dns)
[Sync] Fetching prospects for tenant gym-sharkfit-001...
[Sync] ✅ Upserted 120 prospects.
[Sync] Fetching sales for tenant gym-sharkfit-001...
[Sync] ✅ Upserted 85 sales.
[Sync] Fetching entries for tenant gym-sharkfit-001...
[Sync] ✅ Upserted 1250 entries.
[Sync] ✅ Completed successfully for tenant gym-sharkfit-001
[System] ✅ Sync cycle completed in 4.82s
```

---

## 🗄️ Estructura de Base de Datos

El proxy crea/usa estas tablas automáticamente:

```
api_integrations   → Credenciales EVO encriptadas
├─ tenant_id       → Identificador único del gimnasio
├─ dns             → DNS de EVO W12
├─ encrypted_token → Token AES-256-GCM encriptado
└─ encryption_iv   → Initialization Vector

members            → Miembros del gimnasio
├─ evo_member_id   → ID en sistema EVO
└─ tenant_id       → Aislamiento multi-tenant

prospects          → Prospectos (leads)
├─ evo_prospect_id → ID en EVO
├─ registration_date
└─ email, name

sales              → Ventas realizadas
├─ evo_sale_id     → ID en EVO
├─ member_id       → FK a members
├─ amount, status
└─ sale_date

access_logs        → Registros de acceso al gym
├─ evo_entry_id    → ID en EVO
├─ member_id       → FK a members
├─ access_time
└─ location

sync_queue         → Logs de sincronización
├─ job_type        → FULL_SYNC, etc
├─ status          → COMPLETED, FAILED
└─ error_message
```

---

## 🔐 Seguridad

### Encriptar Token Manualmente

Usa el script helper:

```javascript
// encrypt-token.js
const crypto = require('crypto');

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const token = 'tu-token-evo-aqui';

const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

let encrypted = cipher.update(token, 'utf8');
encrypted = Buffer.concat([encrypted, cipher.final()]);
const authTag = cipher.getAuthTag();

const combinedBuffer = Buffer.concat([encrypted, authTag]);

console.log('Encrypted Token (hex):', combinedBuffer.toString('hex'));
console.log('IV (hex):', iv.toString('hex'));
```

**Ejecutar:**
```bash
ENCRYPTION_KEY=tu_key node encrypt-token.js
```

---

## 🔧 Configuración Avanzada

### Cambiar Intervalo de Sincronización

En `.env`:
```env
SYNC_INTERVAL_MINUTES=5   # Cada 5 minutos (más frecuente)
SYNC_INTERVAL_MINUTES=30  # Cada 30 minutos (menos frecuente)
```

### Múltiples Gimnasios (Multi-tenant)

Inserta varias integraciones con diferentes `tenant_id`:

```sql
INSERT INTO api_integrations (id, tenant_id, dns, encrypted_token, encryption_iv, status) 
VALUES 
    (lower(hex(randomblob(16))), 'gym-alpha', 'dns-alpha', '...', '...', 'active'),
    (lower(hex(randomblob(16))), 'gym-beta', 'dns-beta', '...', '...', 'active');
```

El proxy sincronizará secuencialmente todos los tenants activos.

### Desactivar Integración Temporalmente

```sql
UPDATE api_integrations 
SET status = 'inactive' 
WHERE tenant_id = 'gym-sharkfit-001';
```

---

## 🐛 Troubleshooting

### Error: "AUTH_DECRYPTION_FAILURE"

**Causa**: Encryption key incorrecta o IV dañado.

**Solución**:
1. Verifica que `ENCRYPTION_KEY` tenga exactamente 64 caracteres hex
2. Re-encripta el token con el script correcto
3. Verifica que el IV sea el mismo usado en la encriptación

### Error: "FOREIGN KEY constraint failed"

**Causa**: Intentando insertar sale/entry para un member que no existe.

**Solución**: El proxy automáticamente crea "stub members". Verifica que:
```javascript
getOrUpsertStubMember(tenantId, evoMemberId)
```
Se ejecute antes de insertar sales/entries.

### Error: "SQLITE_BUSY: database is locked"

**Causa**: Otra conexión (ej: Django) tiene lock exclusivo.

**Solución**: El proxy usa WAL mode para permitir lecturas concurrentes:
```javascript
db.pragma('journal_mode = WAL');
```
Si persiste, cierra conexiones Django o usa timeout mayor.

### Logs Vacíos en Sync

**Causa**: No hay integraciones activas.

**Solución**:
```sql
SELECT * FROM api_integrations WHERE status = 'active';
-- Si vacío, inserta credenciales
```

---

## 📊 Monitoreo

### Ver Logs de Sincronización

```sql
SELECT 
    tenant_id,
    job_type,
    status,
    error_message,
    created_at
FROM sync_queue
ORDER BY created_at DESC
LIMIT 20;
```

### Ver Última Sincronización por Tenant

```sql
SELECT 
    tenant_id,
    dns,
    last_sync_at,
    status,
    datetime('now') as current_time,
    CAST((julianday('now') - julianday(last_sync_at)) * 24 * 60 AS INTEGER) as minutes_ago
FROM api_integrations;
```

### Estadísticas de Datos

```sql
SELECT 
    'Prospects' as entity, COUNT(*) as total FROM prospects
UNION ALL
SELECT 'Sales', COUNT(*) FROM sales
UNION ALL
SELECT 'Entries', COUNT(*) FROM access_logs
UNION ALL
SELECT 'Members', COUNT(*) FROM members;
```

---

## 🚀 Producción

### Ejecutar como Servicio (PM2)

```bash
npm install -g pm2

pm2 start src/evo-w12-proxy-sqlite.js --name "evo-proxy"
pm2 save
pm2 startup
```

### Ejecutar como Servicio (systemd)

```ini
# /etc/systemd/system/evo-proxy.service
[Unit]
Description=EVO W12 Integration Proxy
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/srv/vendify/backend-data-intake
ExecStart=/usr/bin/node src/evo-w12-proxy-sqlite.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable evo-proxy
sudo systemctl start evo-proxy
sudo systemctl status evo-proxy
```

---

## 📖 Reglas Críticas del Código

| Regla | Descripción | Implementación |
|-------|-------------|----------------|
| **Rule 1** | URL Base EVO correcta | `EVO_BASE_URL = 'https://evo-integracao-api.w12app.com.br'` |
| **Rule 2** | Axios Native Auth | `auth: { username: dns, password: token }` |
| **Rule 3** | Endpoints exactos | `/api/v1/prospects`, `/api/v2/sales`, `/api/v1/entries` |
| **Rule 4** | AES-256-GCM encryption | `crypto.createCipheriv('aes-256-gcm', key, iv)` |
| **Rule 5** | UPSERT idempotente | `ON CONFLICT (...) DO UPDATE SET ...` |
| **Rule 6** | Global Lock | `if (GLOBAL_SYNC_LOCK) return;` |

---

## 🤝 Integración con Django

El proxy escribe en el mismo `db.sqlite3` que Django. Para acceder desde Django:

```python
# backend/apps/ventas/models.py
from django.db import models

class EvoSale(models.Model):
    """Modelo espejo de la tabla 'sales' del proxy"""
    id = models.UUIDField(primary_key=True)
    tenant_id = models.CharField(max_length=100)
    evo_sale_id = models.IntegerField()
    member_id = models.UUIDField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    sale_date = models.DateTimeField()
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sales'
        unique_together = [['tenant_id', 'evo_sale_id']]
```

---

## 📚 Recursos

- [EVO W12 API Docs](https://documenter.getpostman.com/view/5214497/S1LwxpaS)
- [better-sqlite3 Docs](https://github.com/WiseLibs/better-sqlite3)
- [AES-GCM Explained](https://en.wikipedia.org/wiki/Galois/Counter_Mode)

---

## 📝 Licencia

Vendify © 2024 - Sistema de Gestión de Ventas

---

**¿Problemas?** Revisa los logs en consola o la tabla `sync_queue`.
