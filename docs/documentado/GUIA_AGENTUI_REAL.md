# 🎯 Configuración de Webhooks en AgentUI - GUÍA REAL

## ✅ UBICACIÓN CORRECTA

Las automations en AgentUI **NO están en el menú lateral**.

**Están en el EDITOR de la app**, en la sección de **Skills** debajo del chat.

---

## 📍 PASO 1: Abrir el Editor

```
1. Ve a: https://ventas.sharkfit.info
2. Inicia sesión
3. Busca un botón que diga "Edit" o "Editar" (generalmente arriba a la derecha)
4. Haz clic para entrar al modo de edición
```

✅ **Checkpoint:** Deberías ver el editor de la app con un chat en la parte inferior.

---

## 📍 PASO 2: Encontrar la Sección de Skills

```
1. Mira la parte inferior de la pantalla
2. Busca el campo de entrada del chat (donde escribes mensajes)
3. DEBAJO del chat hay una sección de "Skills" o "Herramientas"
4. Ahí está la opción para crear Automations
```

✅ **Checkpoint:** Ves una sección con opciones de skills/herramientas.

---

## 📍 PASO 3: Crear Nueva Automation

```
1. En la sección de Skills, busca:
   - "Nueva Automatización" o
   - "New Automation" o
   - Un botón "+" para agregar
2. Haz clic en esa opción
```

✅ **Checkpoint:** Se abrió un formulario para crear la automation.

---

## 📍 PASO 4: Configurar el Trigger (Schedule)

```
1. En "Trigger Type" selecciona: "Schedule" o "Programado"
2. En "Cron Expression" o "Horario" escribe:
   0 */4 * * *
   (Esto significa: cada 4 horas)
```

✅ **Checkpoint:** El trigger está configurado como Schedule.

---

## 📍 PASO 5: Configurar la Acción (Llamar tu función)

```
1. En "Action" selecciona: "Webhook" o "Call Backend Function"
2. En "URL" escribe:
   /api/generarAlertasBajasProgramadas
   (Nota: es una URL RELATIVA, sin https://)
3. En "Method" selecciona: POST
4. En "Body" déjalo vacío
```

✅ **Checkpoint:** La acción está configurada para llamar tu función.

---

## 📍 PASO 6: Guardar y Activar

```
1. Haz clic en "Save" o "Guardar"
2. Activa la automation (toggle o switch)
```

✅ **Checkpoint:** La automation está guardada y activa.

---

## 🔁 REPETIR PARA LAS OTRAS 4

Crea 4 automations más con estos valores:

### AUTOMATION 2:
```
Trigger: Schedule
Cron: 0 */4 * * *
Action: Webhook
URL: /api/generarAlertasClientesRiesgo
Method: POST
```

### AUTOMATION 3:
```
Trigger: Schedule
Cron: 0 8 * * *
Action: Webhook
URL: /api/generarAlertasRenovacion
Method: POST
```

### AUTOMATION 4:
```
Trigger: Schedule
Cron: 0 9 * * *
Action: Webhook
URL: /api/generarAlertasDeudores
Method: POST
```

### AUTOMATION 5:
```
Trigger: Schedule
Cron: 0 * * * *
Action: Webhook
URL: /api/generarAlertasClienteNuevo
Method: POST
```

---

## 🧪 PROBAR QUE FUNCIONA

### Opción 1: Ejecutar Manualmente
```
1. En la lista de automations
2. Busca un botón "Run" o "Ejecutar"
3. Haz clic y espera el resultado
```

### Opción 2: Llamar directamente la función
```
1. Ve a: Dashboard → APIs
2. Busca tus funciones
3. Prueba ejecutarlas manualmente desde ahí
```

---

## 🆘 SI NO ENCUENTRAS LA SECCIÓN DE SKILLS

**Posibles ubicaciones:**

1. **En el editor:** Debajo del chat
2. **En el panel lateral del editor:** Busca un tab de "Automations" o "Workflows"
3. **En el dashboard:** Ve a Dashboard → Overview → busca "Automations"

**Si aún no lo encuentras:**

Contacta a soporte: **katherine@agentui.ai**

Dile: "No encuentro dónde crear automations programadas (scheduled triggers) en mi app"

---

## 📸 ALTERNATIVA: Usar el Dashboard

Si no encuentras la opción en el editor:

```
1. Ve a: Dashboard (el panel de administración de AgentUI)
2. Busca tu app en la lista
3. Haz clic en "Settings" o "Configuración"
4. Busca una sección de "Automations" o "Scheduled Tasks"
```

---

## ✅ VERIFICACIÓN FINAL

Después de configurar:

```
1. Ve a DashboardRS en tu app
2. Haz clic en "Mis Tareas"
3. Deberías ver tareas nuevas con botones de colores
```

Si ves tareas, **¡FUNCIONÓ!** 🎉

---

## 💡 NOTA IMPORTANTE

En AgentUI, las URLs de las funciones son **RELATIVAS**:

✅ **CORRECTO:** `/api/generarAlertasBajasProgramadas`  
❌ **INCORRECTO:** `https://ventas.sharkfit.info/api/generarAlertasBajasProgramadas`

---

**¿Encontraste el editor y la sección de Skills? Dime qué ves y te ayudo con el siguiente paso.** 🚀