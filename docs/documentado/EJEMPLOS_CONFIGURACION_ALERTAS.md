# 📝 Ejemplos de Configuración de Alertas

Este documento contiene ejemplos JSON listos para usar en la página **ConfiguracionAlertas**.

---

## 🟣 1. Baja Programada

**Descripción:** Genera tarea cuando un cliente programa su baja.

```json
{
  "tipo_alerta": "baja_programada",
  "nombre_regla": "Contactar Baja Programada - Inmediato",
  "activa": true,
  "dias_umbral_activacion": 0,
  "dias_prioridad_alta": 1,
  "dias_critico": 0,
  "crear_tarea_automatica": true,
  "asignar_a": "responsable_sede",
  "frecuencia_verificacion": "cada_4_horas",
  "mensaje_alerta": "Cliente programó su baja. Requiere gestión de retención urgente.",
  "notas": "Umbral 0 = tarea inmediata cuando se programa la baja"
}
```

**Resultado:**
- ✅ Tarea creada inmediatamente cuando se programa una baja
- 🎯 Asignada al Responsable de Sede
- 🔴 Prioridad: Urgente si la baja es hoy o ya pasó
- 📋 Tipo de tarea: `baja_programada`

---

## 🔴 2. Cliente en Riesgo

**Descripción:** Genera tarea cuando se identifica un cliente en riesgo.

```json
{
  "tipo_alerta": "cliente_riesgo",
  "nombre_regla": "Gestionar Cliente en Riesgo - Inmediato",
  "activa": true,
  "dias_umbral_activacion": 0,
  "dias_prioridad_alta": 7,
  "dias_critico": 14,
  "crear_tarea_automatica": true,
  "asignar_a": "responsable_sede",
  "frecuencia_verificacion": "cada_4_horas",
  "mensaje_alerta": "Cliente identificado en riesgo. Requiere contacto urgente.",
  "notas": "Umbral 0 = tarea inmediata cuando se identifica el riesgo"
}
```

**Resultado:**
- ✅ Tarea creada inmediatamente cuando se identifica el riesgo
- 🎯 Asignada al Responsable de Sede
- 🔴 Prioridad: Urgente si nivel de riesgo es Crítico
- 📋 Tipo de tarea: `cliente_riesgo`

---

## 🟠 3. Renovación Vencida

**Descripción:** Genera tarea cuando un cliente lleva 3+ días vencido sin renovar.

```json
{
  "tipo_alerta": "renovacion",
  "nombre_regla": "Contactar Cliente por Renovación - 3 días",
  "activa": true,
  "dias_umbral_activacion": 3,
  "dias_prioridad_alta": 7,
  "dias_critico": 14,
  "crear_tarea_automatica": true,
  "asignar_a": "responsable_sede",
  "frecuencia_verificacion": "diaria",
  "mensaje_alerta": "Cliente vencido sin renovar. Requiere contacto para renovación.",
  "notas": "Se activa cuando el cliente lleva 3 días vencido"
}
```

**Resultado:**
- ✅ Tarea creada cuando el cliente lleva 3 días vencido
- 🎯 Asignada al Responsable de Sede
- 🟠 Prioridad: Alta si lleva 7+ días, Crítica si lleva 14+ días
- 📋 Tipo de tarea: `renovacion_vencida`

**Variante - Inmediato:**
```json
{
  "dias_umbral_activacion": 0,
  "notas": "Umbral 0 = tarea inmediata cuando el cliente vence"
}
```

---

## 🟡 4. Deudor

**Descripción:** Genera tarea cuando un cliente lleva 2+ días como deudor.

```json
{
  "tipo_alerta": "deudor",
  "nombre_regla": "Contactar Cliente con Deuda - 2 días",
  "activa": true,
  "dias_umbral_activacion": 2,
  "dias_prioridad_alta": 15,
  "dias_critico": 30,
  "crear_tarea_automatica": true,
  "asignar_a": "responsable_sede",
  "frecuencia_verificacion": "diaria",
  "mensaje_alerta": "Cliente con deuda pendiente. Requiere gestión de cobro.",
  "notas": "Se activa cuando el cliente lleva 2 días en estado deudor"
}
```

**Resultado:**
- ✅ Tarea creada cuando el cliente lleva 2 días como deudor
- 🎯 Asignada al Responsable de Sede
- 🟡 Prioridad: Alta si lleva 15+ días, Crítica si lleva 30+ días
- 📋 Tipo de tarea: `deudor`

**Variante - Inmediato:**
```json
{
  "dias_umbral_activacion": 0,
  "notas": "Umbral 0 = tarea inmediata cuando se marca como deudor"
}
```

---

## 🟢 5. Cliente Nuevo (Onboarding)

**Descripción:** Genera múltiples tareas cuando se crea un cliente nuevo.

### **Opción A: Tarea Genérica Simple**

```json
{
  "tipo_alerta": "cliente_nuevo",
  "nombre_regla": "Onboarding Cliente Nuevo - Simple",
  "activa": true,
  "dias_umbral_activacion": 0,
  "crear_tarea_automatica": true,
  "asignar_a": "responsable_sede",
  "frecuencia_verificacion": "cada_hora",
  "mensaje_alerta": "Cliente nuevo registrado. Requiere onboarding.",
  "notas": "Crea una tarea genérica de bienvenida"
}
```

**Resultado:**
- ✅ 1 tarea genérica de bienvenida
- 🎯 Asignada al Responsable de Sede

---

### **Opción B: Múltiples Tareas Específicas (RECOMENDADO)**

```json
{
  "tipo_alerta": "cliente_nuevo",
  "nombre_regla": "Onboarding Cliente Nuevo - Completo",
  "activa": true,
  "dias_umbral_activacion": 0,
  "crear_tarea_automatica": true,
  "frecuencia_verificacion": "cada_hora",
  "mensaje_alerta": "Cliente nuevo registrado. Iniciando onboarding automático.",
  "notas": "Crea 2 tareas: registrar tarjeta y firmar contrato",
  "tareas_automaticas": [
    {
      "titulo": "Cliente debe registrar tarjeta: {cliente_nombre}",
      "descripcion": "Contactar a {cliente_nombre} para registrar su tarjeta de pago. Plan: {plan}. WhatsApp: {whatsapp}",
      "tipo": "administrativa",
      "prioridad": "alta",
      "dias_limite": 3,
      "asignar_a": "departamento",
      "departamento": "soporte"
    },
    {
      "titulo": "Cliente debe firmar contrato: {cliente_nombre}",
      "descripcion": "Enviar contrato a {cliente_nombre} para firma. Plan: {plan}. Fecha compra: {fecha_compra}",
      "tipo": "administrativa",
      "prioridad": "media",
      "dias_limite": 5,
      "asignar_a": "responsable_sede"
    }
  ]
}
```

**Resultado:**
- ✅ 2 tareas por cada cliente nuevo
- 🎯 Tarea 1: Asignada a departamento Soporte (registrar tarjeta)
- 🎯 Tarea 2: Asignada al Responsable de Sede (firmar contrato)
- 📋 Tipo de tarea: `onboarding_cliente_nuevo`

**Variables disponibles:**
- `{cliente_nombre}` → Nombre del cliente
- `{plan}` → Nombre del plan contratado
- `{whatsapp}` → WhatsApp del cliente
- `{fecha_compra}` → Fecha de primera compra

---

### **Opción C: Onboarding Extendido (3 Tareas)**

```json
{
  "tipo_alerta": "cliente_nuevo",
  "nombre_regla": "Onboarding Cliente Nuevo - Extendido",
  "activa": true,
  "dias_umbral_activacion": 0,
  "crear_tarea_automatica": true,
  "frecuencia_verificacion": "cada_hora",
  "tareas_automaticas": [
    {
      "titulo": "Bienvenida y orientación: {cliente_nombre}",
      "descripcion": "Dar bienvenida a {cliente_nombre}, explicar funcionamiento del gimnasio y beneficios del plan {plan}",
      "tipo": "comercial",
      "prioridad": "alta",
      "dias_limite": 1,
      "asignar_a": "responsable_sede"
    },
    {
      "titulo": "Registrar tarjeta de pago: {cliente_nombre}",
      "descripcion": "Contactar a {cliente_nombre} para registrar tarjeta. WhatsApp: {whatsapp}",
      "tipo": "administrativa",
      "prioridad": "alta",
      "dias_limite": 3,
      "asignar_a": "departamento",
      "departamento": "soporte"
    },
    {
      "titulo": "Firmar contrato: {cliente_nombre}",
      "descripcion": "Enviar y hacer firmar contrato a {cliente_nombre}. Plan: {plan}",
      "tipo": "administrativa",
      "prioridad": "media",
      "dias_limite": 5,
      "asignar_a": "responsable_sede"
    }
  ]
}
```

**Resultado:**
- ✅ 3 tareas por cada cliente nuevo
- 🎯 Tarea 1: Bienvenida (RS) - 1 día
- 🎯 Tarea 2: Registrar tarjeta (Soporte) - 3 días
- 🎯 Tarea 3: Firmar contrato (RS) - 5 días

---

## 🎨 Personalización Avanzada

### **Asignar a Staff Específico**

```json
{
  "asignar_a": "staff_especifico",
  "staff_asignado_id": "ID_DEL_STAFF_AQUI"
}
```

### **Asignar a Departamento**

```json
{
  "asignar_a": "departamento",
  "departamento": "soporte"
}
```

Departamentos disponibles:
- `ventas`
- `financiero`
- `retencion`
- `soporte`
- `experiencia_cliente`

### **Aplicar Solo a Ciertas Sedes**

```json
{
  "aplicar_a_sedes": ["ID_SEDE_1", "ID_SEDE_2"]
}
```

Si está vacío `[]`, aplica a todas las sedes.

---

## 📊 Configuración Recomendada Completa

Para tener un sistema completo, crea estas 5 reglas:

```
✅ Baja Programada (umbral 0)
✅ Cliente en Riesgo (umbral 0)
✅ Renovación Vencida (umbral 3 días)
✅ Deudor (umbral 2 días)
✅ Cliente Nuevo (con 2-3 tareas automáticas)
```

---

## 🔍 Cómo Crear una Regla

1. Ve a **ConfiguracionAlertas**
2. Haz clic en **"Nueva Regla"**
3. Copia y pega el JSON del ejemplo
4. Ajusta los valores según tu necesidad
5. Guarda y activa la regla

---

## ✅ Verificación

Después de crear las reglas:

1. Ve a **AnalisisReglasAlertas** para verificar que estén correctas
2. Ejecuta manualmente las funciones backend para probar
3. Verifica en **DashboardRS** que se crean las tareas

---

## 📞 Soporte

Si necesitas ayuda personalizando las reglas:
- **Email:** katherine@agentui.ai
- **Guía Completa:** Ver `GUIA_TIPOS_ALERTAS.md`

---

**¡Listo! Con estas configuraciones tu sistema de alertas estará completamente automatizado.** 🎉