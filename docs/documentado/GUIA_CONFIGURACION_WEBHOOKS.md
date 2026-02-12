# 🔔 Guía de Configuración de Webhooks - Sistema de Alertas Automáticas

Esta guía te ayudará a configurar los webhooks programados para que las alertas se generen automáticamente.

---

## 📋 Resumen de Webhooks a Configurar

| # | Función | Frecuencia Recomendada | Cron Expression | Descripción |
|---|---------|------------------------|-----------------|-------------|
| 1 | `generarAlertasBajasProgramadas` | Cada 4 horas | `0 */4 * * *` | Detecta bajas programadas próximas |
| 2 | `generarAlertasClientesRiesgo` | Cada 4 horas | `0 */4 * * *` | Detecta clientes en riesgo sin gestión |
| 3 | `generarAlertasRenovacion` | Diaria (8:00 AM) | `0 8 * * *` | Detecta clientes vencidos sin renovar |
| 4 | `generarAlertasDeudores` | Diaria (9:00 AM) | `0 9 * * *` | Detecta deudores con días de atraso |
| 5 | `generarAlertasClienteNuevo` | Cada hora | `0 * * * *` | Detecta clientes nuevos para onboarding |

---

## 🚀 Paso 1: Preparar las URLs de las Funciones

Tus funciones backend están disponibles en estas URLs:

```
https://ventas.sharkfit.info/api/generarAlertasBajasProgramadas
https://ventas.sharkfit.info/api/generarAlertasClientesRiesgo
https://ventas.sharkfit.info/api/generarAlertasRenovacion
https://ventas.sharkfit.info/api/generarAlertasDeudores
https://ventas.sharkfit.info/api/generarAlertasClienteNuevo
```

**Nota:** Todas estas funciones requieren `isInServiceRole: true`, por lo que deben ser llamadas con credenciales de servicio.

---

## 🔐 Paso 2: Configurar Secrets (Opcional pero Recomendado)

1. Ve a **Dashboard → Secrets**
2. Crea un nuevo secret:
   - **Nombre:** `ALERTAS_API_KEY`
   - **Valor:** Tu API key de servicio
3. Guarda el secret

---

## ⚙️ Paso 3: Crear las Automations

### **Automation 1: Bajas Programadas (Cada 4 horas)**

**Configuración:**
- **Nombre:** `Alertas - Bajas Programadas`
- **Trigger:** Schedule
- **Cron:** `0 */4 * * *` (Cada 4 horas, en punto)
- **Zona horaria:** America/Santiago (GMT-3)

**Acción Webhook:**
- **Método:** POST
- **URL:** `https://ventas.sharkfit.info/api/generarAlertasBajasProgramadas`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:** (vacío, no requiere payload)
- **Autenticación:** Service Role (automático en AgentUI)

**Resultado esperado:**
```json
{
  "success": true,
  "alertasCreadas": 3,
  "alertasActualizadas": 1,
  "tareasCreadas": 3,
  "mensaje": "Proceso completado. 3 alertas de bajas programadas creadas, 1 actualizadas, 3 tareas creadas."
}
```

---

### **Automation 2: Clientes en Riesgo (Cada 4 horas)**

**Configuración:**
- **Nombre:** `Alertas - Clientes en Riesgo`
- **Trigger:** Schedule
- **Cron:** `0 */4 * * *` (Cada 4 horas, en punto)
- **Zona horaria:** America/Santiago (GMT-3)

**Acción Webhook:**
- **Método:** POST
- **URL:** `https://ventas.sharkfit.info/api/generarAlertasClientesRiesgo`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:** (vacío)
- **Autenticación:** Service Role

**Resultado esperado:**
```json
{
  "success": true,
  "alertasCreadas": 2,
  "alertasActualizadas": 0,
  "tareasCreadas": 2,
  "mensaje": "Proceso completado. 2 alertas de clientes en riesgo creadas, 0 actualizadas, 2 tareas creadas."
}
```

---

### **Automation 3: Renovaciones Vencidas (Diaria 8:00 AM)**

**Configuración:**
- **Nombre:** `Alertas - Renovaciones Vencidas`
- **Trigger:** Schedule
- **Cron:** `0 8 * * *` (Todos los días a las 8:00 AM)
- **Zona horaria:** America/Santiago (GMT-3)

**Acción Webhook:**
- **Método:** POST
- **URL:** `https://ventas.sharkfit.info/api/generarAlertasRenovacion`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:** (vacío)
- **Autenticación:** Service Role

**Resultado esperado:**
```json
{
  "success": true,
  "alertasCreadas": 15,
  "alertasActualizadas": 8,
  "tareasCreadas": 15,
  "mensaje": "Proceso completado. 15 alertas creadas, 8 alertas actualizadas, 15 tareas creadas."
}
```

---

### **Automation 4: Deudores (Diaria 9:00 AM)**

**Configuración:**
- **Nombre:** `Alertas - Deudores`
- **Trigger:** Schedule
- **Cron:** `0 9 * * *` (Todos los días a las 9:00 AM)
- **Zona horaria:** America/Santiago (GMT-3)

**Acción Webhook:**
- **Método:** POST
- **URL:** `https://ventas.sharkfit.info/api/generarAlertasDeudores`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:** (vacío)
- **Autenticación:** Service Role

**Resultado esperado:**
```json
{
  "success": true,
  "alertasCreadas": 5,
  "alertasActualizadas": 2,
  "tareasCreadas": 5,
  "mensaje": "Proceso completado. 5 alertas de deudores creadas, 2 actualizadas, 5 tareas creadas."
}
```

---

### **Automation 5: Clientes Nuevos (Cada hora)**

**Configuración:**
- **Nombre:** `Alertas - Clientes Nuevos`
- **Trigger:** Schedule
- **Cron:** `0 * * * *` (Cada hora, en punto)
- **Zona horaria:** America/Santiago (GMT-3)

**Acción Webhook:**
- **Método:** POST
- **URL:** `https://ventas.sharkfit.info/api/generarAlertasClienteNuevo`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:** (vacío)
- **Autenticación:** Service Role

**Resultado esperado:**
```json
{
  "success": true,
  "clientesNuevos": 3,
  "tareasCreadas": 6,
  "mensaje": "Proceso completado. 3 clientes nuevos detectados, 6 tareas creadas."
}
```

**Nota:** Esta alerta puede crear múltiples tareas por cliente si está configurada en `Configuracion_Alertas` con `tareas_automaticas`.

---

## 📊 Paso 4: Verificar que Funcionan

### **Opción 1: Ejecutar Manualmente**

1. Ve a **Dashboard → Automations**
2. Encuentra la automation que creaste
3. Haz clic en **"Run Now"** o **"Test"**
4. Revisa los logs para ver el resultado

### **Opción 2: Esperar la Primera Ejecución**

1. Espera a que llegue la hora programada
2. Ve a **Dashboard → Automations → Logs**
3. Verifica que la ejecución fue exitosa
4. Revisa en el **DashboardRS** que se crearon las tareas

### **Opción 3: Verificar en la Base de Datos**

1. Ve a **Dashboard → Database**
2. Abre la tabla `Tareas_RS`
3. Filtra por `estado = 'pendiente'`
4. Verifica que hay tareas nuevas con los tipos correctos:
   - `baja_programada`
   - `cliente_riesgo`
   - `renovacion_vencida`
   - `deudor`
   - `onboarding_cliente_nuevo`

---

## 🔍 Troubleshooting

### **Problema: "No autorizado" o Error 403**

**Solución:**
- Verifica que la automation esté usando **Service Role** authentication
- En AgentUI, las funciones con `isInServiceRole` se ejecutan automáticamente con permisos de servicio

### **Problema: "No se crearon tareas"**

**Posibles causas:**
1. **No hay datos que cumplan los criterios:**
   - Verifica que existan clientes vencidos, bajas programadas, etc.
   - Revisa los umbrales en `Configuracion_Alertas`

2. **Ya existen tareas para esos clientes:**
   - Las funciones previenen duplicados
   - Verifica en `Tareas_RS` si ya hay tareas pendientes

3. **La configuración está inactiva:**
   - Ve a **ConfiguracionAlertas**
   - Verifica que `activa: true` para cada tipo de alerta

### **Problema: "Demasiadas tareas duplicadas"**

**Solución:**
- Las funciones ya tienen lógica anti-duplicados
- Si aún así se duplican, verifica que no tengas múltiples automations ejecutándose
- Revisa los logs de las automations para ver cuántas veces se ejecutan

---

## 📈 Monitoreo y Optimización

### **Revisar Logs Regularmente**

1. Ve a **Dashboard → Automations → Logs**
2. Filtra por cada automation
3. Revisa:
   - ✅ Ejecuciones exitosas
   - ❌ Errores
   - ⏱️ Tiempo de ejecución

### **Ajustar Frecuencias según Necesidad**

Si notas que:
- **Hay muchas alertas:** Reduce la frecuencia (ej: de cada hora a cada 4 horas)
- **Las alertas llegan tarde:** Aumenta la frecuencia (ej: de diaria a cada 4 horas)

### **Optimizar Horarios**

Recomendaciones:
- **Renovaciones y Deudores:** Ejecutar en la mañana (8-9 AM) para que el RS los vea al iniciar su día
- **Clientes Nuevos:** Cada hora para onboarding rápido
- **Bajas y Riesgo:** Cada 4 horas para balance entre rapidez y carga del sistema

---

## 🎯 Configuración Recomendada Final

```
✅ Bajas Programadas    → Cada 4 horas (0 */4 * * *)
✅ Clientes en Riesgo   → Cada 4 horas (0 */4 * * *)
✅ Renovaciones         → Diaria 8:00 AM (0 8 * * *)
✅ Deudores            → Diaria 9:00 AM (0 9 * * *)
✅ Clientes Nuevos     → Cada hora (0 * * * *)
```

**Total de ejecuciones diarias:**
- Bajas Programadas: 6 veces/día
- Clientes en Riesgo: 6 veces/día
- Renovaciones: 1 vez/día
- Deudores: 1 vez/día
- Clientes Nuevos: 24 veces/día

**Total: ~38 ejecuciones/día**

---

## 📞 Soporte

Si tienes problemas configurando los webhooks:
- **Email:** katherine@agentui.ai
- **Documentación:** Dashboard → Help

---

## ✅ Checklist de Configuración

- [ ] Verificar URLs de las funciones en Dashboard → APIs
- [ ] (Opcional) Crear secret `ALERTAS_API_KEY`
- [ ] Crear Automation 1: Bajas Programadas
- [ ] Crear Automation 2: Clientes en Riesgo
- [ ] Crear Automation 3: Renovaciones Vencidas
- [ ] Crear Automation 4: Deudores
- [ ] Crear Automation 5: Clientes Nuevos
- [ ] Ejecutar manualmente cada automation para probar
- [ ] Verificar logs de ejecución
- [ ] Verificar que se crearon tareas en DashboardRS
- [ ] Configurar reglas en ConfiguracionAlertas (opcional)
- [ ] Monitorear durante 1 semana y ajustar frecuencias

---

**¡Listo! Tu sistema de alertas automáticas está configurado y funcionando.** 🎉