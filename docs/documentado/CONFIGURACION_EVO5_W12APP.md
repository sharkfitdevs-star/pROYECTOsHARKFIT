# Configuración Evo5 API (w12app)

## 📋 Resumen

Esta integración sincroniza datos desde Evo5 (plataforma w12app) hacia tu sistema cada 30 minutos.

**Datos sincronizados:**
- ✅ Miembros activos (v2/members)
- ✅ Prospectos (v1/prospects)
- ✅ Actividades (v1/activities)
- ✅ Membresías (v2/membership)
- ✅ Ventas (v2/sales)

---

## 🔑 Variables de Entorno Requeridas

### 1. EVO5_API_KEY (REQUERIDO)
**Valor actual:** `4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC`

**Dónde obtenerlo:**
1. Accede a: https://evo5.w12app.com.br/#/app/sharkfitchile/1/configuracoes/evo-api/token
2. Copia el token que aparece en la página
3. Si no aparece, genera uno nuevo

### 2. EVO5_BASE_URL (Opcional)
**Valor por defecto:** `https://evo-integracao-api.w12app.com.br/api`

Solo configúralo si w12app te indica una URL diferente.

### 3. EVO5_GYM_ID (Opcional)
**Valor por defecto:** `1`

Es el ID de tu gimnasio/sede. Si tienes múltiples sedes, usa el ID correspondiente.

---

## ⚙️ Configuración en AgentUI

### Paso 1: Agregar Secretos

1. Ve a **Configuración → Secretos** en AgentUI
2. Agrega las siguientes variables:

```
Nombre: EVO5_API_KEY
Valor: 4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC
```

```
Nombre: EVO5_GYM_ID
Valor: 1
```

### Paso 2: Probar la Conexión

Ejecuta el test de conexión:

```bash
curl -X POST https://ventasprueba.sharkfit.info/api/testSincronizacionEvo5 \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_API_KEY" \
  -d '{}'
```

**Resultado esperado:**
```json
{
  "success": true,
  "resumen": {
    "total": 7,
    "exitosos": 7,
    "fallidos": 0
  }
}
```

---

## 🔄 Configuración del Webhook (Cron)

### Opción 1: cron-job.org (Recomendado)

1. Regístrate en https://cron-job.org
2. Crea un nuevo cron job:
   - **URL:** `https://ventasprueba.sharkfit.info/api/sincronizarEvo5`
   - **Método:** POST
   - **Frecuencia:** `*/30 * * * *` (cada 30 minutos)
   - **Headers:**
     ```
     Content-Type: application/json
     x-api-key: TU_API_KEY
     ```
   - **Body:** `{}`

### Opción 2: EasyCron

1. Regístrate en https://www.easycron.com
2. Crea un nuevo cron job:
   - **URL:** `https://ventasprueba.sharkfit.info/api/sincronizarEvo5`
   - **Cron Expression:** `*/30 * * * *`
   - **HTTP Method:** POST
   - **HTTP Headers:** `x-api-key: TU_API_KEY`

### Opción 3: GitHub Actions

Crea `.github/workflows/sync-evo5.yml`:

```yaml
name: Sincronizar Evo5
on:
  schedule:
    - cron: '*/30 * * * *'  # Cada 30 minutos
  workflow_dispatch:  # Permite ejecución manual

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sincronizar datos de Evo5
        run: |
          curl -X POST https://ventasprueba.sharkfit.info/api/sincronizarEvo5 \
            -H "Content-Type: application/json" \
            -H "x-api-key: ${{ secrets.API_KEY }}" \
            -d '{}'
```

---

## 📊 Endpoints de Evo5 API

### Base URL
```
https://evo-integracao-api.w12app.com.br/api
```

### Endpoints Disponibles

#### 1. Miembros (v2)
```
GET /v2/members
GET /v2/members/{idMember}
```

#### 2. Prospectos (v1)
```
GET /v1/prospects
GET /v1/prospects/latest-transfer
```

#### 3. Actividades (v1)
```
GET /v1/activities
GET /v1/activities/schedule
GET /v1/activities/schedule/enroll
GET /v1/activities/schedule/experimental-class
```

#### 4. Membresías (v2)
```
GET /v2/membership
GET /v1/membermembership/{idMemberMembership}
```

#### 5. Ventas (v2)
```
GET /v2/sales
GET /v1/sales/sales-items
```

#### 6. Gestión (v2)
```
GET /v2/management/prospects
GET /v2/management/not-renewed
```

#### 7. Otros
```
GET /v1/entries
GET /v1/costcenter
GET /v1/payables
GET /v1/revenuecenter
POST /v1/webhook
POST /v1/members/block-unblock/{idMember}
GET /v1/members/{idMember}/card
```

### Headers Requeridos

```
apikey: 4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC
Content-Type: application/json
gym-id: 1
```

---

## 🧪 Testing

### Test Manual

```bash
# 1. Test de configuración
curl -X POST https://ventasprueba.sharkfit.info/api/testSincronizacionEvo5 \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_API_KEY"

# 2. Sincronización manual
curl -X POST https://ventasprueba.sharkfit.info/api/sincronizarEvo5 \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_API_KEY"
```

### Respuesta Exitosa

```json
{
  "success": true,
  "timestamp": "2026-02-09T15:30:00.000Z",
  "miembrosSincronizados": 150,
  "prospectosSincronizados": 45,
  "actividadesSincronizadas": 230,
  "totalSincronizado": 425,
  "errores": 0
}
```

---

## 🔍 Troubleshooting

### Error 401 Unauthorized

**Causa:** Token incorrecto o expirado

**Solución:**
1. Ve a https://evo5.w12app.com.br/#/app/sharkfitchile/1/configuracoes/evo-api/token
2. Verifica que el token sea correcto
3. Si es necesario, genera un nuevo token
4. Actualiza `EVO5_API_KEY` en los secretos de AgentUI

### Error 404 Not Found

**Causa:** Endpoint incorrecto o gym-id inválido

**Solución:**
1. Verifica que `EVO5_GYM_ID` sea correcto (probablemente `1`)
2. Contacta a soporte de w12app para confirmar los endpoints

### Error 403 Forbidden

**Causa:** Permisos insuficientes en el token

**Solución:**
1. Verifica que el token tenga permisos de lectura
2. Contacta a soporte de w12app para habilitar permisos

### No se sincronizan datos

**Causa:** Webhook no configurado o fallando

**Solución:**
1. Verifica que el cron job esté activo
2. Revisa los logs del servicio de cron
3. Ejecuta una sincronización manual para verificar

---

## 📈 Monitoreo

### Ver Datos Sincronizados

1. Ve a **Datos → Datos_EVO** en AgentUI
2. Verás todos los registros sincronizados con:
   - Tipo (miembro, prospecto, actividad)
   - Última sincronización
   - Estado

### Logs de Sincronización

Los logs se guardan automáticamente en cada ejecución. Puedes verlos en:
- AgentUI → Logs → Functions
- Busca `sincronizarEvo5`

---

## 🆘 Soporte

**Soporte w12app:**
- Panel: https://evo5.w12app.com.br
- Documentación: Solicitar a soporte de w12app

**Soporte AgentUI:**
- Documentación: https://docs.agentui.com
- Soporte: support@agentui.com

---

## 📝 Notas Importantes

1. **Frecuencia:** La sincronización se ejecuta cada 30 minutos
2. **Datos:** Se guardan en la entidad `Datos_EVO`
3. **Duplicados:** El sistema evita duplicados comparando por WhatsApp, Email y Evo5_id
4. **Actualizaciones:** Los registros existentes se actualizan automáticamente
5. **Errores:** Los errores se registran pero no detienen la sincronización

---

## ✅ Checklist de Configuración

- [ ] Variables de entorno configuradas (EVO5_API_KEY, EVO5_GYM_ID)
- [ ] Test de conexión ejecutado exitosamente
- [ ] Webhook cron configurado (cada 30 minutos)
- [ ] Primera sincronización manual ejecutada
- [ ] Datos verificados en Datos_EVO
- [ ] Monitoreo configurado

---

**Última actualización:** 2026-02-09
**Versión:** 1.0