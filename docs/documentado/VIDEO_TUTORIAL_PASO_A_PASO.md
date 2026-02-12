# 🎬 VIDEO TUTORIAL (en texto) - Configurar Primera Automation

## 🎯 Vamos a configurar juntos la PRIMERA automation

Sigue estos pasos EXACTAMENTE como están escritos.

---

## 📍 PASO 1: Abrir la Plataforma

```
1. Abre tu navegador (Chrome, Firefox, etc.)
2. Ve a: https://ventas.sharkfit.info
3. Inicia sesión con tu usuario y contraseña
```

✅ **Checkpoint:** Deberías estar en la página principal de tu app.

---

## 📍 PASO 2: Ir a Automations

```
1. Busca en el menú lateral izquierdo
2. Busca una opción que diga:
   - "Automations" o
   - "Automatizaciones" o
   - "Workflows" o
   - "Scheduled Tasks"
3. Haz clic en esa opción
```

✅ **Checkpoint:** Deberías ver una página con una lista (puede estar vacía) y un botón para crear nueva.

---

## 📍 PASO 3: Crear Nueva Automation

```
1. Busca un botón que diga:
   - "Create New" o
   - "Nueva" o
   - "Add Automation" o
   - "+" (símbolo de más)
2. Haz clic en ese botón
```

✅ **Checkpoint:** Se abrió un formulario o una nueva página para configurar.

---

## 📍 PASO 4: Poner el Nombre

```
1. Busca un campo que diga "Name" o "Nombre"
2. Escribe exactamente esto:
   Alertas Bajas Programadas
3. (Copia y pega para evitar errores)
```

✅ **Checkpoint:** El nombre está escrito en el campo.

---

## 📍 PASO 5: Configurar el Trigger (Cuándo se ejecuta)

```
1. Busca una sección que diga "Trigger" o "Disparador"
2. Haz clic en un dropdown o selector
3. Selecciona: "Schedule" o "Programado"
4. Busca un campo que diga "Cron" o "Schedule Expression"
5. Escribe exactamente esto:
   0 */4 * * *
6. (Copia y pega para evitar errores)
```

✅ **Checkpoint:** El cron está escrito: `0 */4 * * *`

---

## 📍 PASO 6: Configurar la Acción (Qué hace)

```
1. Busca una sección que diga "Action" o "Acción"
2. Haz clic en "Add Action" o "Agregar Acción"
3. Selecciona: "Webhook" o "HTTP Request"
```

✅ **Checkpoint:** Se abrió un formulario para configurar el webhook.

---

## 📍 PASO 7: Configurar el Método

```
1. Busca un campo que diga "Method" o "Método"
2. Selecciona: POST
```

✅ **Checkpoint:** Dice "POST" en el método.

---

## 📍 PASO 8: Poner la URL

```
1. Busca un campo que diga "URL" o "Endpoint"
2. Escribe exactamente esto:
   https://ventas.sharkfit.info/api/generarAlertasBajasProgramadas
3. (Copia y pega para evitar errores)
```

✅ **Checkpoint:** La URL completa está escrita.

---

## 📍 PASO 9: Agregar Header

```
1. Busca una sección que diga "Headers" o "Cabeceras"
2. Haz clic en "Add Header" o "Agregar"
3. En el campo "Key" o "Clave" escribe:
   Content-Type
4. En el campo "Value" o "Valor" escribe:
   application/json
```

✅ **Checkpoint:** Hay un header con Key: `Content-Type` y Value: `application/json`

---

## 📍 PASO 10: Body (Cuerpo)

```
1. Busca una sección que diga "Body" o "Cuerpo"
2. NO ESCRIBAS NADA
3. Déjalo vacío o selecciona "None" si hay opciones
```

✅ **Checkpoint:** El body está vacío.

---

## 📍 PASO 11: Guardar

```
1. Busca un botón que diga "Save" o "Guardar"
2. Haz clic en ese botón
3. Espera a que se guarde (puede aparecer un mensaje de éxito)
```

✅ **Checkpoint:** La automation se guardó correctamente.

---

## 📍 PASO 12: Activar

```
1. Busca un toggle o switch que diga "Enable" o "Activar"
2. Actívalo (debe ponerse en verde o azul)
```

✅ **Checkpoint:** La automation está ACTIVA.

---

## 📍 PASO 13: Probar (IMPORTANTE)

```
1. Busca un botón que diga:
   - "Run Now" o
   - "Test" o
   - "Ejecutar Ahora" o
   - "Try It"
2. Haz clic en ese botón
3. Espera 5-10 segundos
4. Deberías ver un mensaje de éxito ✅
```

✅ **Checkpoint:** Apareció un mensaje de éxito con algo como:
```
{
  "success": true,
  "alertasCreadas": X,
  "tareasCreadas": X
}
```

---

## 🎉 ¡FELICIDADES! Primera Automation Configurada

Ahora repite los pasos 3-13 para las otras 4 automations, pero cambiando:

### AUTOMATION 2:
- Nombre: `Alertas Clientes Riesgo`
- Cron: `0 */4 * * *`
- URL: `https://ventas.sharkfit.info/api/generarAlertasClientesRiesgo`

### AUTOMATION 3:
- Nombre: `Alertas Renovaciones`
- Cron: `0 8 * * *`
- URL: `https://ventas.sharkfit.info/api/generarAlertasRenovacion`

### AUTOMATION 4:
- Nombre: `Alertas Deudores`
- Cron: `0 9 * * *`
- URL: `https://ventas.sharkfit.info/api/generarAlertasDeudores`

### AUTOMATION 5:
- Nombre: `Alertas Clientes Nuevos`
- Cron: `0 * * * *`
- URL: `https://ventas.sharkfit.info/api/generarAlertasClienteNuevo`

---

## 🔍 Verificar que Todo Funciona

```
1. Ve a: DashboardRS
2. Haz clic en "Mis Tareas"
3. Deberías ver tareas nuevas con botones de colores
```

Si ves tareas, **¡FUNCIONÓ!** 🎊

---

## 🆘 ¿Te trabaste en algún paso?

**Dime EXACTAMENTE en qué paso te trabaste:**

- ¿En qué paso número?
- ¿Qué ves en la pantalla?
- ¿Qué botón no encuentras?

Y te ayudo específicamente con ese paso.

---

## 📸 ¿Necesitas ayuda visual?

Si no encuentras algo:

1. Toma una captura de pantalla de tu pantalla
2. Envíala a: katherine@agentui.ai
3. Dile: "No encuentro dónde poner [lo que sea]"

---

**¿Listo para empezar? ¡Vamos con el Paso 1!** 🚀