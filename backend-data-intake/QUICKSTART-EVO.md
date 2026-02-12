# 🚀 EVO W12 Proxy - Inicio Rápido (5 minutos)

## ⚡ Instalación Express

### Paso 1: Instalar Dependencia
```bash
cd backend-data-intake
npm install better-sqlite3
```

### Paso 2: Generar Clave de Encriptación
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Copia el resultado** (64 caracteres hex)

### Paso 3: Configurar .env
```bash
cp .env.example .env
```

Editar `.env` y agregar:
```env
DATABASE_PATH=../../backend/db.sqlite3
ENCRYPTION_KEY=<pega_aqui_la_clave_del_paso_2>
SYNC_INTERVAL_MINUTES=15
```

### Paso 4: Agregar Credenciales EVO
```bash
npm run evo-add-credentials
```

**Te preguntará:**
- Tenant ID: `gym-vendify-001`
- EVO DNS: `tu-dns-evo`
- EVO API Token: `tu-token-evo`

### Paso 5: Iniciar Proxy
```bash
npm run evo-proxy
```

**Deberías ver:**
```
================================================================================
  EVO W12 INTEGRATION PROXY SERVER (SQLite Edition)
================================================================================
[System] 🚀 Starting sync cycle...
[Sync] ✅ Upserted 120 prospects.
[Sync] ✅ Upserted 85 sales.
[Sync] ✅ Upserted 1250 entries.
[System] ✅ Sync cycle completed in 4.82s
```

---

## 📊 Ver Datos Sincronizados

### Opción 1: SQLite CLI
```bash
sqlite3 ../../backend/db.sqlite3

# Mostrar prospectos
SELECT COUNT(*) FROM prospects;

# Mostrar ventas
SELECT * FROM sales ORDER BY sale_date DESC LIMIT 10;

# Logs de sincronización
SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT 10;
```

### Opción 2: Desde Django
```bash
cd ../backend
python manage.py shell
```

```python
from django.db import connection

cursor = connection.cursor()
cursor.execute("SELECT COUNT(*) FROM prospects")
print(f"Total prospectos: {cursor.fetchone()[0]}")

cursor.execute("SELECT * FROM sales ORDER BY sale_date DESC LIMIT 5")
for sale in cursor.fetchall():
    print(sale)
```

---

## 🔧 Scripts Útiles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Iniciar Proxy | `npm run evo-proxy` | Ejecuta sincronización continua |
| Agregar Credenciales | `npm run evo-add-credentials` | Setup interactivo |
| Encriptar Token | `npm run evo-encrypt-token` | Solo encriptación manual |

---

## ⚠️ Troubleshooting Rápido

### "ENCRYPTION_KEY must be 32 bytes"
```bash
# Regenerar clave
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Actualizar .env
```

### "No active integrations found"
```bash
# Verificar tabla
sqlite3 ../../backend/db.sqlite3
SELECT * FROM api_integrations;

# Si vacío, ejecutar:
npm run evo-add-credentials
```

### "AUTH_DECRYPTION_FAILURE"
```bash
# Token o IV corrupto, re-agregar credenciales
npm run evo-add-credentials
```

### "FOREIGN KEY constraint failed"
El proxy crea automáticamente "stub members". Si persiste:
```sql
PRAGMA foreign_keys = OFF;
-- Hacer operación
PRAGMA foreign_keys = ON;
```

---

## 🎯 Próximos Pasos

1. ✅ **Proxy funcionando** → Ver logs en consola
2. ✅ **Datos sincronizados** → Verificar tablas en SQLite
3. ✅ **Django accediendo datos** → Ver modelos en admin
4. 📈 **Crear visualizaciones** → Dashboard React con estos datos

---

## 📚 Más Información

- **Documentación completa**: `README-EVO-SQLITE.md`
- **Código fuente**: `src/evo-w12-proxy-sqlite.js`
- **Scripts helpers**: `scripts/`

---

**¿Problemas?** Revisa `sync_queue` para ver errores detallados:
```sql
SELECT * FROM sync_queue WHERE status = 'FAILED' ORDER BY created_at DESC;
```
