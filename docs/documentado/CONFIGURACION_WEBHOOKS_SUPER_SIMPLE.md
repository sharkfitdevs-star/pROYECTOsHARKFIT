# 🎯 Configuración de Webhooks - VERSIÓN SÚPER SIMPLE

## ❓ ¿Qué vamos a hacer?

Vamos a decirle a la plataforma que ejecute 5 funciones automáticamente cada cierto tiempo.

**Es como poner 5 alarmas en tu celular, pero para el sistema.**

---

## 📝 ANTES DE EMPEZAR

### ¿Dónde está todo?

1. Abre tu navegador
2. Ve a: **https://ventas.sharkfit.info**
3. Inicia sesión
4. Busca en el menú lateral: **"Automations"** o **"Automatizaciones"**

---

## 🔔 ALARMA 1: Bajas Programadas

### Paso 1: Crear Nueva Automation
```
Haz clic en: "Create New" o "Nueva Automatización"
```

### Paso 2: Darle un Nombre
```
Nombre: Alertas Bajas Programadas
```

### Paso 3: Configurar el CUÁNDO (Trigger)
```
Tipo: Schedule (o "Programado")
Cron: 0 */4 * * *
```
**Esto significa:** Cada 4 horas

### Paso 4: Configurar el QUÉ (Action)
```
Tipo: Webhook (o "HTTP Request")
Método: POST
URL: https://ventas.sharkfit.info/api/generarAlertasBajasProgramadas
```

### Paso 5: Headers (Cabeceras)
```
Haz clic en "Add Header" o "Agregar Cabecera"
Key: Content-Type
Value: application/json
```

### Paso 6: Body (Cuerpo)
```
Déjalo VACÍO (no escribas nada)
```

### Paso 7: Guardar
```
Haz clic en "Save" o "Guardar"
Haz clic en "Enable" o "Activar"
```

✅ **¡LISTO! Primera alarma configurada.**

---

## 🔔 ALARMA 2: Clientes en Riesgo

### Repite los mismos pasos, pero cambia:

```
Nombre: Alertas Clientes Riesgo
Cron: 0 */4 * * *
URL: https://ventas.sharkfit.info/api/generarAlertasClientesRiesgo
```

Todo lo demás es IGUAL.

✅ **¡LISTO! Segunda alarma configurada.**

---

## 🔔 ALARMA 3: Renovaciones

### Repite los mismos pasos, pero cambia:

```
Nombre: Alertas Renovaciones
Cron: 0 8 * * *
URL: https://ventas.sharkfit.info/api/generarAlertasRenovacion
```

**Esto significa:** Todos los días a las 8:00 AM

✅ **¡LISTO! Tercera alarma configurada.**

---

## 🔔 ALARMA 4: Deudores

### Repite los mismos pasos, pero cambia:

```
Nombre: Alertas Deudores
Cron: 0 9 * * *
URL: https://ventas.sharkfit.info/api/generarAlertasDeudores
```

**Esto significa:** Todos los días a las 9:00 AM

✅ **¡LISTO! Cuarta alarma configurada.**

---

## 🔔 ALARMA 5: Clientes Nuevos

### Repite los mismos pasos, pero cambia:

```
Nombre: Alertas Clientes Nuevos
Cron: 0 * * * *
URL: https://ventas.sharkfit.info/api/generarAlertasClienteNuevo
```

**Esto significa:** Cada hora

✅ **¡LISTO! Quinta alarma configurada.**

---

## 🎉 ¡TERMINASTE!

Ahora deberías tener 5 automations creadas:

```
✅ Alertas Bajas Programadas (cada 4 horas)
✅ Alertas Clientes Riesgo (cada 4 horas)
✅ Alertas Renovaciones (8 AM diario)
✅ Alertas Deudores (9 AM diario)
✅ Alertas Clientes Nuevos (cada hora)
```

---

## 🧪 PROBAR QUE FUNCIONA

### Opción 1: Ejecutar Manualmente (RECOMENDADO)

1. Ve a la lista de Automations
2. Encuentra "Alertas Bajas Programadas"
3. Busca un botón que diga "Run Now" o "Ejecutar Ahora" o "Test"
4. Haz clic
5. Espera 5-10 segundos
6. Deberías ver un mensaje de éxito ✅

**Repite esto con las 5 automations.**

### Opción 2: Esperar a que se ejecute sola

1. Espera a que llegue la hora (ej: si son las 7:50 AM, espera a las 8:00 AM)
2. Ve a DashboardRS
3. Busca en "Mis Tareas"
4. Deberías ver tareas nuevas

---

## ❓ PREGUNTAS FRECUENTES

### ¿Qué es "Cron"?
Es el horario. Copia y pega exactamente lo que te digo.

### ¿Qué es "Webhook"?
Es como llamar a una función. No te preocupes por el nombre.

### ¿Qué es "POST"?
Es el tipo de llamada. Siempre usa POST.

### ¿Qué pongo en "Body"?
NADA. Déjalo vacío.

### ¿Qué es "Content-Type"?
Es una cabecera técnica. Solo copia: `application/json`

### ¿Necesito poner contraseña o API Key?
NO. La plataforma lo hace automáticamente.

---

## 🆘 SI ALGO SALE MAL

### Error: "No autorizado" o "403"
**Solución:** Verifica que la automation esté usando "Service Role" o que esté activada.

### Error: "URL no encontrada" o "404"
**Solución:** Verifica que copiaste bien la URL. Debe empezar con `https://ventas.sharkfit.info/api/`

### No veo el botón "Create New"
**Solución:** Busca en el menú: "Automations", "Workflows", o "Scheduled Tasks"

### No sé dónde poner el Cron
**Solución:** Busca un campo que diga "Schedule", "Cron Expression", o "Frecuencia"

---

## 📞 AYUDA URGENTE

Si después de leer esto sigues sin poder configurarlo:

1. **Toma capturas de pantalla** de la página de Automations
2. **Envíalas a:** katherine@agentui.ai
3. **Dile:** "Necesito ayuda configurando webhooks para alertas"

Ellos te ayudarán directamente.

---

## ✅ CHECKLIST FINAL

Marca cada una cuando la termines:

- [ ] Creé "Alertas Bajas Programadas"
- [ ] Creé "Alertas Clientes Riesgo"
- [ ] Creé "Alertas Renovaciones"
- [ ] Creé "Alertas Deudores"
- [ ] Creé "Alertas Clientes Nuevos"
- [ ] Probé ejecutar manualmente al menos una
- [ ] Vi que se crearon tareas en DashboardRS

---

## 🎯 RESULTADO ESPERADO

Después de configurar todo:

1. **Ve a DashboardRS**
2. **Haz clic en "Mis Tareas"**
3. **Deberías ver tareas con botones de colores:**
   - 🟣 Gestionar Baja
   - 🔴 Gestionar Riesgo
   - 🟠 Gestionar Renovación
   - 🟡 Registrar Cobro
   - 🟢 Gestionar (cliente nuevo)

Si ves eso, **¡FUNCIONÓ!** 🎉

---

**¿Sigues teniendo dudas? Dime exactamente en qué paso te trabaste y te ayudo.** 💪