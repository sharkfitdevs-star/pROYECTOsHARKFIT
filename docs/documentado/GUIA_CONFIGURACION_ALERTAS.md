# 📋 Sistema de Alertas Automáticas - Guía de Configuración

## 🎯 Resumen del Sistema

Has implementado un **sistema completo de alertas configurables** para el Responsable de Sede (RS). Este sistema incluye:

### ✅ Componentes Implementados:

1. **Entidad**: `Configuracion_Alertas.json` - Almacena reglas configurables
2. **Página**: `ConfiguracionAlertas.jsx` - Panel de administración de reglas
3. **7 Funciones Backend** que generan alertas automáticamente:
   - `generarAlertasRenovacion.js` - Clientes vencidos sin renovar
   - `generarAlertasDeudores.js` - Deudores con días de atraso
   - `generarAlertasContratos.js` - Contratos pendientes de firma
   - `generarAlertasTarjetas.js` - Tarjetas con intentos fallidos
   - `generarAlertasClientesRiesgo.js` - Clientes en riesgo sin gestión
   - `generarAlertasSeguimientoOnline.js` - Seguimiento online sin contacto
   - `generarAlertasBajasProgramadas.js` - Bajas programadas próximas

---

## 🚀 Cómo Activar las Alertas Automáticas

### Paso 1: Configurar Reglas de Alertas

1. Ve a la página **ConfiguracionAlertas** (agrégala al menú del Layout)
2. Crea una regla para cada tipo de alerta que necesites:

**Ejemplo: Regla de Renovación**
```
Tipo: Renovación
Nombre: Alerta de renovación estándar
Activa: ✓
Días para activar: 3
Días prioridad alta: 7
Días crítico: 14
Crear tarea automática: ✓
Asignar a: Responsable de Sede
Frecuencia: Diaria
```

**Ejemplo: Regla de Deudores**
```
Tipo: Deudor
Nombre: Alerta de deudores morosos
Activa: ✓
Días para activar: 7
Días prioridad alta: 15
Días crítico: 30
Crear tarea automática: ✓
Asignar a: Responsable de Sede
Frecuencia: Diaria
```

### Paso 2: Configurar Webhooks/Triggers (CRÍTICO)

Las funciones backend están listas pero **necesitan ser ejecutadas automáticamente**. Tienes 2 opciones:

---

## 🔧 OPCIÓN A: Webhooks Programados (Recomendado)

### En AgentUI Platform:

1. **Ve a Settings → Webhooks/Triggers**
2. **Crea un nuevo Webhook Programado** para cada función:

**Webhook 1: Alertas de Renovación**
```
Nombre: Generar Alertas Renovación
URL: /api/generarAlertasRenovacion
Método: POST
Frecuencia: Diaria (cada día a las 8:00 AM)
Headers: 
  x-service-role: true
```

**Webhook 2: Alertas de Deudores**
```
Nombre: Generar Alertas Deudores
URL: /api/generarAlertasDeudores
Método: POST
Frecuencia: Diaria (cada día a las 8:00 AM)
Headers: 
  x-service-role: true
```

**Webhook 3: Alertas de Contratos**
```
Nombre: Generar Alertas Contratos
URL: /api/generarAlertasContratos
Método: POST
Frecuencia: Diaria (cada día a las 9:00 AM)
Headers: 
  x-service-role: true
```

**Webhook 4: Alertas de Tarjetas**
```
Nombre: Generar Alertas Tarjetas
URL: /api/generarAlertasTarjetas
Método: POST
Frecuencia: Cada 4 horas
Headers: 
  x-service-role: true
```

**Webhook 5: Alertas de Clientes en Riesgo**
```
Nombre: Generar Alertas Clientes Riesgo
URL: /api/generarAlertasClientesRiesgo
Método: POST
Frecuencia: Diaria (cada día a las 8:00 AM)
Headers: 
  x-service-role: true
```

**Webhook 6: Alertas de Seguimiento Online**
```
Nombre: Generar Alertas Seguimiento Online
URL: /api/generarAlertasSeguimientoOnline
Método: POST
Frecuencia: Cada 4 horas
Headers: 
  x-service-role: true
```

**Webhook 7: Alertas de Bajas Programadas**
```
Nombre: Generar Alertas Bajas Programadas
URL: /api/generarAlertasBajasProgramadas
Método: POST
Frecuencia: Diaria (cada día a las 7:00 AM)
Headers: 
  x-service-role: true
```

---

## 🔧 OPCIÓN B: Ejecutar Manualmente (Para Pruebas)

Puedes ejecutar las funciones manualmente desde el navegador o Postman:

```bash
# Ejemplo con curl
curl -X POST https://tu-dominio.agentui.app/api/generarAlertasRenovacion \
  -H "x-service-role: true"
```

O desde el código frontend (solo para pruebas):
```javascript
// SOLO PARA PRUEBAS - NO USAR EN PRODUCCIÓN
await axios.post('/api/generarAlertasRenovacion', {}, {
  headers: {
    'x-service-role': 'true'
  }
});
```

---

## 📊 Cómo Verificar que Funciona

### 1. Después de configurar los webhooks:

Espera a que se ejecute el primer ciclo (según la frecuencia configurada).

### 2. Verifica en la base de datos:

Ve a **Settings → Database → Alertas_Renovacion**
- Deberías ver registros nuevos con `estado: "Pendiente"`

### 3. Verifica en el DashboardRS:

El Responsable de Sede debería ver:
- **Mi Día**: Alertas urgentes
- **Gestión Financiera**: Alertas de renovación, deudores, etc.
- **Mis Tareas**: Tareas automáticas creadas (si configuraste `crear_tarea_automatica: true`)

---

## 🎨 Personalización de Reglas

Puedes ajustar las reglas desde **ConfiguracionAlertas**:

### Cambiar Umbrales:
- **Días para activar**: Cuándo se crea la alerta
- **Días prioridad alta**: Cuándo se marca como urgente
- **Días crítico**: Cuándo se marca como crítico

### Acciones Automáticas:
- ✓ **Crear tarea automática**: Genera tarea en Tareas_RS
- ✓ **Notificar supervisor**: Envía notificación (requiere configuración adicional)
- ✓ **Escalar automáticamente**: Escala después de X días sin gestión

### Asignación:
- **Responsable de Sede**: Asigna al RS de la sede del cliente
- **Staff Específico**: Asigna a un staff en particular
- **Departamento**: Asigna a un departamento completo

---

## 🔍 Monitoreo y Logs

### Ver resultados de ejecución:

Cada función devuelve un resumen:
```json
{
  "success": true,
  "alertasCreadas": 15,
  "alertasActualizadas": 8,
  "tareasCreadas": 12,
  "mensaje": "Proceso completado. 15 alertas creadas, 8 actualizadas, 12 tareas creadas."
}
```

### Revisar logs:

Ve a **Settings → Logs** para ver:
- Ejecuciones exitosas
- Errores
- Cantidad de alertas generadas

---

## ⚠️ Importante

1. **Las funciones requieren `isInServiceRole: true`** - Solo se ejecutan desde webhooks programados o con el header correcto
2. **No duplican alertas** - Verifican si ya existe una alerta activa antes de crear
3. **Actualizan alertas existentes** - Si cambia la prioridad o días, actualiza la alerta
4. **Previenen sobrecarga** - Solo procesan registros que cumplen los umbrales

---

## 🆘 Troubleshooting

### Las alertas no aparecen en el DashboardRS:

1. ✓ Verifica que los webhooks estén configurados y activos
2. ✓ Verifica que las reglas estén activas en ConfiguracionAlertas
3. ✓ Revisa los logs de ejecución
4. ✓ Verifica que existan registros que cumplan los umbrales

### Las tareas no se crean automáticamente:

1. ✓ Verifica que `crear_tarea_automatica: true` en la regla
2. ✓ Verifica que las sedes tengan `responsable_sede` asignado
3. ✓ Revisa los logs de la función

### Alertas duplicadas:

- No debería pasar, pero si ocurre, revisa la lógica de verificación en la función

---

## 📞 Soporte

Si necesitas ayuda adicional:
1. Revisa los logs en Settings → Logs
2. Verifica la configuración de webhooks
3. Prueba ejecutar las funciones manualmente primero

---

## 🎉 ¡Listo!

Tu sistema de alertas está completo y listo para usar. Solo falta:
1. ✅ Configurar las reglas en ConfiguracionAlertas
2. ✅ Configurar los webhooks programados
3. ✅ Esperar a que se ejecuten automáticamente

**El RS ahora tendrá visibilidad completa de todos los movimientos críticos de su sucursal.**