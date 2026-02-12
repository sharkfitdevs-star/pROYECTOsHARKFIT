# 🔄 CONFIGURACIÓN DE SINCRONIZACIÓN EVO5

## 📋 Función Creada

**Archivo:** `functions/sincronizarEvo5.js`

**Endpoint:** `https://ventasprueba.sharkfit.info/api/sincronizarEvo5`

**Descripción:** Sincroniza automáticamente cada 30 minutos:
- Contactos de Evo5
- Chats y actividades
- Grupos de WhatsApp
- Actualiza registros en `Datos_EVO`

---

## ⚙️ PASO 1: Configurar Variables de Entorno

### **En AgentUI:**

1. Ve a **Configuración** → **Secretos** (o Environment Variables)
2. Agrega estas 3 variables:

```
EVO5_BASE_URL = https://api.evolution-api.com
EVO5_API_KEY = tu-api-key-de-evolution
EVO5_INSTANCE_ID = nombre-de-tu-instancia
```

**Ejemplo:**
```
EVO5_BASE_URL = https://api.evolution-api.com
EVO5_API_KEY = B6D9A7E2F1C4H8G3
EVO5_INSTANCE_ID = sharkfit-whatsapp
```

---

## 🧪 PASO 2: Probar la Función Manualmente

### **Desde la terminal:**

```bash
curl -X POST https://ventasprueba.sharkfit.info/api/sincronizarEvo5 \
  -H "Content-Type: application/json" \
  -H "x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053" \
  -d '{}'
```

### **Desde Python:**

```python
import requests

url = "https://ventasprueba.sharkfit.info/api/sincronizarEvo5"
headers = {
    "Content-Type": "application/json",
    "x-server-key": "2fa50294-e781-4ad8-abe4-78f21167d053"
}

response = requests.post(url, json={}, headers=headers)
print(response.json())
```

### **Respuesta esperada:**

```json
{
  "success": true,
  "timestamp": "2024-02-05T15:30:00.000Z",
  "miembrosSincronizados": 45,
  "prospectosSincronizados": 23,
  "actividadesSincronizadas": 68,
  "totalSincronizado": 136,
  "errores": 0,
  "detalleErrores": []
}
```

---

## ⏰ PASO 3: Configurar Webhook Automático (Cada 30 minutos)

### **Opción 1: cron-job.org (Recomendado - Gratis)**

1. Ve a https://cron-job.org/
2. Crea una cuenta gratuita
3. Crea un nuevo Cron Job:
   - **Title:** Sincronización Evo5 Sharkfit
   - **URL:** `https://ventasprueba.sharkfit.info/api/sincronizarEvo5`
   - **Método:** POST
   - **Schedule:** `*/30 * * * *` (cada 30 minutos)
   - **Headers:**
     ```
     Content-Type: application/json
     x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053
     ```
   - **Body:** `{}`
   - **Timeout:** 60 segundos

4. Guarda y activa el job

### **Opción 2: EasyCron**

1. Ve a https://www.easycron.com/
2. Crea un nuevo Cron Job:
   - **URL:** `https://ventasprueba.sharkfit.info/api/sincronizarEvo5`
   - **Cron Expression:** `*/30 * * * *`
   - **HTTP Method:** POST
   - **HTTP Headers:**
     ```
     Content-Type: application/json
     x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053
     ```

### **Opción 3: GitHub Actions**

Crea `.github/workflows/sync-evo5.yml`:

```yaml
name: Sincronización Evo5

on:
  schedule:
    # Cada 30 minutos
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sincronizar Evo5
        run: |
          curl -X POST https://ventasprueba.sharkfit.info/api/sincronizarEvo5 \
            -H "Content-Type: application/json" \
            -H "x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053" \
            -d '{}'
```

### **Opción 4: Servidor con Crontab**

```bash
# Editar crontab
crontab -e

# Agregar línea (cada 30 minutos)
*/30 * * * * curl -X POST https://ventasprueba.sharkfit.info/api/sincronizarEvo5 -H "Content-Type: application/json" -H "x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053" -d '{}'
```

---

## 📊 PASO 4: Verificar Sincronización

### **Ver registros sincronizados:**

1. Ve a la página de **Clientes** o crea una página para ver `Datos_EVO`
2. Verifica que los registros se estén creando/actualizando
3. Revisa los campos:
   - `tipo_evo5`: cliente, prospecto, miembro, contacto, grupo
   - `estado_evo5`: activo, inactivo, bloqueado, etc.
   - `fecha_sincronizacion`: última sincronización

### **Ver logs de ejecución:**

1. En AgentUI, ve a **Functions** → **sincronizarEvo5**
2. Revisa los logs:
   - ✅ `Contactos obtenidos: X`
   - ✅ `Chats obtenidos: X`
   - ✅ `Grupos obtenidos: X`
   - ✅ `Sincronización completada`

---

## 🔍 Lógica de Sincronización

### **Clasificación de Contactos:**

1. **Prospecto:** Contacto con mensajes recientes o sin leer
2. **Miembro:** Contacto sin actividad reciente
3. **Grupo:** Grupos de WhatsApp
4. **Contacto:** Otros contactos

### **Búsqueda de Duplicados:**

- Busca por `whatsapp` (número de teléfono)
- Busca por `evo5_id` (ID de Evo5)
- Si existe: **actualiza** el registro
- Si no existe: **crea** nuevo registro

### **Datos Sincronizados:**

- ✅ Nombre del contacto
- ✅ WhatsApp/Teléfono
- ✅ Email (si disponible)
- ✅ Última interacción
- ✅ Estado en Evo5
- ✅ Metadata (foto de perfil, mensajes sin leer, etc.)
- ✅ Datos raw completos de Evo5

---

## ⚠️ Solución de Problemas

### **Error: "Configuración incompleta"**
- Verifica que las 3 variables de entorno estén configuradas
- Asegúrate de que los nombres sean exactos: `EVO5_BASE_URL`, `EVO5_API_KEY`, `EVO5_INSTANCE_ID`

### **Error: "Error obteniendo contactos: 401"**
- Tu API Key de Evo5 es inválida o expiró
- Verifica en el panel de Evolution API

### **Error: "Error obteniendo contactos: 404"**
- El nombre de la instancia es incorrecto
- Verifica el nombre exacto en Evolution API

### **Error: "Timeout"**
- La sincronización puede tardar si hay muchos contactos
- Aumenta el timeout del webhook a 120 segundos

### **No se crean registros**
- Verifica que la entidad `Datos_EVO` exista
- Revisa los logs para ver errores específicos
- Prueba la función manualmente primero

---

## 📈 Monitoreo

### **Métricas a revisar:**

- **miembrosSincronizados:** Contactos clasificados como miembros
- **prospectosSincronizados:** Contactos con actividad reciente
- **actividadesSincronizadas:** Actualizaciones de última interacción
- **totalSincronizado:** Total de registros procesados
- **errores:** Cantidad de errores durante la sincronización

### **Alertas recomendadas:**

- Si `errores > 10`: Revisar logs
- Si `totalSincronizado = 0`: Verificar conexión con Evo5
- Si no se ejecuta: Verificar webhook configurado

---

## 🔐 Seguridad

- ✅ API Keys almacenadas en variables de entorno
- ✅ Autenticación con `x-server-key`
- ✅ Datos raw de Evo5 almacenados en campo JSON
- ⚠️ **NO compartas** las API Keys públicamente

---

## 📅 Frecuencias Alternativas

Si quieres cambiar la frecuencia:

- **Cada 15 minutos:** `*/15 * * * *`
- **Cada hora:** `0 * * * *`
- **Cada 2 horas:** `0 */2 * * *`
- **Solo horario laboral (9am-6pm):** `*/30 9-18 * * *`

---

## ✅ Checklist de Configuración

- [ ] Variables de entorno configuradas (EVO5_BASE_URL, EVO5_API_KEY, EVO5_INSTANCE_ID)
- [ ] Entidad `Datos_EVO` creada
- [ ] Función `sincronizarEvo5` probada manualmente
- [ ] Webhook configurado (cron-job.org o similar)
- [ ] Primera sincronización exitosa
- [ ] Registros visibles en la base de datos
- [ ] Logs revisados sin errores críticos

---

## 🔗 Integración con Automatización Horaria

Si quieres ejecutar ambas sincronizaciones juntas, puedes modificar `automatizacionHoraria.js` para incluir la sincronización de Evo5.

---

**¿Necesitas ayuda?** Revisa los logs en AgentUI o prueba la función manualmente primero.