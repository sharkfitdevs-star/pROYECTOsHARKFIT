# ⚡ Configuración Rápida de Webhooks - 5 Minutos

## 🎯 Objetivo
Configurar 5 webhooks programados para que las alertas se generen automáticamente.

---

## 📋 Tabla de Configuración Rápida

| Automation | URL | Cron | Horario |
|-----------|-----|------|---------|
| **1. Bajas Programadas** | `/api/generarAlertasBajasProgramadas` | `0 */4 * * *` | Cada 4 horas |
| **2. Clientes Riesgo** | `/api/generarAlertasClientesRiesgo` | `0 */4 * * *` | Cada 4 horas |
| **3. Renovaciones** | `/api/generarAlertasRenovacion` | `0 8 * * *` | 8:00 AM diario |
| **4. Deudores** | `/api/generarAlertasDeudores` | `0 9 * * *` | 9:00 AM diario |
| **5. Clientes Nuevos** | `/api/generarAlertasClienteNuevo` | `0 * * * *` | Cada hora |

---

## 🚀 Pasos Rápidos (Repetir 5 veces)

### 1️⃣ Ir a Automations
```
Dashboard → Automations → Create New
```

### 2️⃣ Configurar Trigger
```
Trigger Type: Schedule
Cron Expression: (ver tabla arriba)
Timezone: America/Santiago
```

### 3️⃣ Agregar Acción Webhook
```
Action: Webhook / HTTP Request
Method: POST
URL: https://ventas.sharkfit.info/api/[NOMBRE_FUNCION]
Headers: { "Content-Type": "application/json" }
Body: (vacío)
Authentication: Service Role (automático)
```

### 4️⃣ Guardar y Activar
```
Save → Enable → Test Run
```

---

## 📊 Cron Expressions Explicadas

```
0 */4 * * *  →  Cada 4 horas (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
0 8 * * *    →  Todos los días a las 8:00 AM
0 9 * * *    →  Todos los días a las 9:00 AM
0 * * * *    →  Cada hora en punto (01:00, 02:00, 03:00, ...)
```

**Formato:** `minuto hora día mes día_semana`

---

## ✅ Verificación Rápida

### Después de configurar, verifica:

1. **Logs de Automation:**
   ```
   Dashboard → Automations → [Tu Automation] → Logs
   ```
   Debe mostrar: `✅ Success` con mensaje de tareas creadas

2. **Tareas en el Dashboard:**
   ```
   Ir a: DashboardRS → Mis Tareas
   ```
   Debes ver tareas nuevas con tipos:
   - 🟣 Baja Programada
   - 🔴 Cliente en Riesgo
   - 🟠 Renovación Vencida
   - 🟡 Deudor
   - 🟢 Cliente Nuevo

3. **Base de Datos:**
   ```
   Dashboard → Database → Tareas_RS
   ```
   Filtra por: `estado = 'pendiente'`

---

## 🔧 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| ❌ Error 403 | Verifica que uses Service Role authentication |
| ⚠️ No se crean tareas | Verifica que existan datos (clientes vencidos, bajas, etc.) |
| 🔄 Tareas duplicadas | Las funciones previenen duplicados automáticamente |
| ⏰ No se ejecuta | Verifica que la automation esté **Enabled** |

---

## 📞 Ayuda

**Email:** katherine@agentui.ai  
**Guía Completa:** Ver archivo `GUIA_CONFIGURACION_WEBHOOKS.md`

---

## 🎉 ¡Listo!

Una vez configurados los 5 webhooks, tu sistema generará alertas automáticamente:

```
✅ 38 ejecuciones por día
✅ Tareas automáticas para el RS
✅ Cero intervención manual
✅ Alertas en tiempo real
```

**Tiempo estimado de configuración: 5-10 minutos** ⏱️