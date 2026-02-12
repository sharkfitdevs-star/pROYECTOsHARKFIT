# 📘 Guía Detallada: ¿Qué Hace Cada Tipo de Alerta?

## 🎯 Introducción

Cada tipo de alerta detecta una situación específica en tu operación. Esta guía te explica **exactamente qué detecta cada alerta** y **cuándo deberías configurarla**.

---

## 1️⃣ ALERTA: Renovación

### 🔍 ¿Qué Detecta?
Clientes con **planes PREPAGO vencidos** que no han renovado.

### 📋 Criterios Específicos:
- ✅ Cliente tiene `fecha_fin_plan_actual` (fecha de vencimiento)
- ✅ La fecha de vencimiento ya pasó
- ✅ Han transcurrido más de X días desde el vencimiento (configurable)
- ✅ NO ha renovado recientemente (últimos 7 días)
- ✅ Aplica a **PREPAGO** (planes de 1, 6, 12 meses pagados por adelantado)

### ❌ NO Detecta:
- ❌ Planes de **Suscripción** (esos se renuevan automáticamente mes a mes)
- ❌ Clientes que ya renovaron en los últimos 7 días
- ❌ Servicios puntuales (solo Planes/Programas)

### 💡 Ejemplo de Configuración:

**Escenario:** Quieres alertar cuando un cliente prepago lleva 3+ días vencido

```
Tipo: Renovación
Nombre: Alerta Renovación Prepago Estándar
Activa: ✓

Umbrales:
- Días para activar: 3 (crea alerta a los 3 días de vencido)
- Días prioridad alta: 7 (marca urgente a los 7 días)
- Días crítico: 14 (marca crítico a los 14 días)

Acciones:
- Crear tarea automática: ✓ (genera tarea para el RS)
- Asignar a: Responsable de Sede

Frecuencia: Diaria (revisa cada día a las 8 AM)
```

### 📊 Ejemplo Real:
```
Cliente: Juan Pérez
Plan: Mensual Prepago (1 mes)
Fecha inicio: 01/01/2025
Fecha fin: 31/01/2025
Hoy: 05/02/2025

→ Días vencido: 5 días
→ Alerta creada: ✓ (superó los 3 días)
→ Prioridad: Media (aún no llega a 7 días)
→ Tarea creada: ✓ "Alerta Renovación: Juan Pérez - 5 días vencido"
```

---

## 2️⃣ ALERTA: Deudor

### 🔍 ¿Qué Detecta?
Clientes con **deudas pendientes** que superan ciertos días de atraso.

### 📋 Criterios Específicos:
- ✅ Cliente está en la tabla `Deudores`
- ✅ Estado: Pendiente, En gestión o Contactado
- ✅ Días de atraso > X días (configurable)
- ✅ Aplica a **Suscripciones** principalmente (clientes que no pagaron su cuota mensual)

### ❌ NO Detecta:
- ❌ Deudores ya recuperados
- ❌ Deudores marcados como irrecuperables
- ❌ Planes prepago vencidos (esos van a "Renovación")

### 💡 Ejemplo de Configuración:

**Escenario:** Quieres alertar cuando un deudor lleva 7+ días sin pagar

```
Tipo: Deudor
Nombre: Alerta Deudores Morosos
Activa: ✓

Umbrales:
- Días para activar: 7 (crea alerta a los 7 días de atraso)
- Días prioridad alta: 15 (marca urgente a los 15 días)
- Días crítico: 30 (marca crítico a los 30 días)

Acciones:
- Crear tarea automática: ✓
- Asignar a: Responsable de Sede

Frecuencia: Diaria
```

### 📊 Ejemplo Real:
```
Cliente: María González
Plan: Suscripción Mensual
Último pago: 01/01/2025
Hoy: 20/01/2025

→ Días de atraso: 19 días
→ Alerta creada: ✓ (superó los 7 días)
→ Prioridad: Alta (superó los 15 días)
→ Monto adeudado: $25,000
→ Tarea creada: ✓ "Gestión Deudor: María González - $25,000"
```

---

## 3️⃣ ALERTA: Contrato Pendiente

### 🔍 ¿Qué Detecta?
Contratos que llevan **días pendientes de firma** después de la venta.

### 📋 Criterios Específicos:
- ✅ Contrato en estado "Pendiente"
- ✅ Días desde la venta > X días (configurable)
- ✅ Aplica a **todas las ventas** que requieren contrato

### ❌ NO Detecta:
- ❌ Contratos ya firmados
- ❌ Contratos rechazados

### 💡 Ejemplo de Configuración:

**Escenario:** Quieres alertar cuando un contrato lleva 3+ días sin firmar

```
Tipo: Contrato Pendiente
Nombre: Alerta Contratos Sin Firmar
Activa: ✓

Umbrales:
- Días para activar: 3 (crea alerta a los 3 días de la venta)
- Días prioridad alta: 7 (marca urgente a los 7 días)
- Días crítico: 14 (marca crítico a los 14 días)

Acciones:
- Crear tarea automática: ✓
- Asignar a: Responsable de Sede

Frecuencia: Diaria
```

### 📊 Ejemplo Real:
```
Cliente: Carlos Ruiz
Plan: Anual Prepago
Fecha venta: 01/02/2025
Hoy: 10/02/2025

→ Días pendiente: 9 días
→ Alerta creada: ✓ (superó los 3 días)
→ Prioridad: Alta (superó los 7 días)
→ Método esperado: Digital
→ Tarea creada: ✓ "Contrato Pendiente: Carlos Ruiz - 9 días"
```

---

## 4️⃣ ALERTA: Tarjeta Pendiente

### 🔍 ¿Qué Detecta?
Tarjetas de pago con **intentos fallidos** de registro.

### 📋 Criterios Específicos:
- ✅ Tarjeta en estado "Pendiente" o "Fallida"
- ✅ Intentos de registro > X intentos (configurable)
- ✅ Aplica a **Suscripciones** principalmente (para cobro automático)

### ❌ NO Detecta:
- ❌ Tarjetas ya registradas exitosamente
- ❌ Tarjetas rechazadas definitivamente

### 💡 Ejemplo de Configuración:

**Escenario:** Quieres alertar cuando una tarjeta lleva 2+ intentos fallidos

```
Tipo: Tarjeta Pendiente
Nombre: Alerta Tarjetas Fallidas
Activa: ✓

Umbrales:
- Días para activar: 2 (crea alerta a los 2 intentos)
- Días prioridad alta: 4 (marca urgente a los 4 intentos)
- Días crítico: 6 (marca crítico a los 6 intentos)

Acciones:
- Crear tarea automática: ✓
- Asignar a: Responsable de Sede

Frecuencia: Cada 4 horas (más frecuente)
```

### 📊 Ejemplo Real:
```
Cliente: Ana Torres
Plan: Suscripción Mensual
Intentos fallidos: 3
Último motivo: "Fondos insuficientes"

→ Intentos: 3
→ Alerta creada: ✓ (superó los 2 intentos)
→ Prioridad: Media (aún no llega a 4 intentos)
→ Tarea creada: ✓ "Tarjeta Pendiente: Ana Torres - 3 intentos"
```

---

## 5️⃣ ALERTA: Cliente en Riesgo

### 🔍 ¿Qué Detecta?
Clientes identificados como **en riesgo de pérdida** que llevan días sin gestión.

### 📋 Criterios Específicos:
- ✅ Cliente en tabla `Clientes_Riesgo`
- ✅ Estado: Identificado, En gestión o Contactado
- ✅ Días desde identificación > X días (configurable)
- ✅ Nivel de riesgo: Bajo, Medio, Alto o Crítico
- ✅ Motivos: Baja programada, NPS bajo, Deuda, No uso, Queja, Otro

### ❌ NO Detecta:
- ❌ Clientes ya recuperados
- ❌ Clientes perdidos definitivamente

### 💡 Ejemplo de Configuración:

**Escenario:** Quieres alertar cuando un cliente en riesgo lleva 3+ días sin gestión

```
Tipo: Cliente en Riesgo
Nombre: Alerta Clientes en Riesgo
Activa: ✓

Umbrales:
- Días para activar: 3 (crea alerta a los 3 días sin gestión)
- Días prioridad alta: 7 (marca urgente a los 7 días)
- Días crítico: 14 (marca crítico a los 14 días)

Acciones:
- Crear tarea automática: ✓
- Asignar a: Responsable de Sede

Frecuencia: Diaria
```

### 📊 Ejemplo Real:
```
Cliente: Pedro Sánchez
Nivel riesgo: Alto
Motivo: Baja programada
Fecha identificación: 01/02/2025
Hoy: 06/02/2025

→ Días sin gestión: 5 días
→ Alerta creada: ✓ (superó los 3 días)
→ Prioridad: Alta (nivel de riesgo Alto)
→ Tarea creada: ✓ "Cliente en Riesgo Alto: Pedro Sánchez"
```

---

## 6️⃣ ALERTA: Seguimiento Online

### 🔍 ¿Qué Detecta?
Clientes en **seguimiento online** (0-3 días vencidos) que necesitan contacto.

### 📋 Criterios Específicos:
- ✅ Cliente en tabla `Seguimiento_Online`
- ✅ Estado: Seguimiento Online o Pendiente
- ✅ Días vencido: entre 0 y 3 días (ventana corta)
- ✅ Aplica a **Prepago** recién vencido (antes de pasar a alerta de renovación)

### ❌ NO Detecta:
- ❌ Clientes con +3 días vencidos (esos pasan a "Renovación")
- ❌ Clientes que ya pasaron a alerta

### 💡 Ejemplo de Configuración:

**Escenario:** Quieres alertar cuando un cliente lleva 2+ días vencido en seguimiento online

```
Tipo: Seguimiento Online
Nombre: Alerta Seguimiento Online
Activa: ✓

Umbrales:
- Días para activar: 2 (crea alerta a los 2 días vencido)
- Días prioridad alta: 3 (marca urgente a los 3 días)
- Días crítico: 4 (marca crítico, pero ya pasaría a Renovación)

Acciones:
- Crear tarea automática: ✓
- Asignar a: Responsable de Sede

Frecuencia: Cada 4 horas (más frecuente)
```

### 📊 Ejemplo Real:
```
Cliente: Laura Díaz
Plan: Mensual Prepago
Fecha vencimiento: 01/02/2025
Hoy: 03/02/2025

→ Días vencido: 2 días
→ Alerta creada: ✓ (superó los 2 días)
→ Prioridad: Media
→ Estado: Seguimiento Online (ventana de oportunidad)
→ Tarea creada: ✓ "Seguimiento Online: Laura Díaz - 2 días"
```

---

## 7️⃣ ALERTA: Baja Programada

### 🔍 ¿Qué Detecta?
Bajas programadas que se **acercan a su fecha** de ejecución.

### 📋 Criterios Específicos:
- ✅ Baja en tabla `Bajas_Programadas`
- ✅ Estado: Programada o En gestión
- ✅ Días hasta la baja ≤ X días (configurable)
- ✅ Aplica a **Suscripciones** principalmente (clientes que solicitaron baja)

### ❌ NO Detecta:
- ❌ Bajas ya ejecutadas
- ❌ Clientes recuperados (continúan activos)

### 💡 Ejemplo de Configuración:

**Escenario:** Quieres alertar 2 días antes de una baja programada

```
Tipo: Baja Programada
Nombre: Alerta Bajas Próximas
Activa: ✓

Umbrales:
- Días para activar: 2 (crea alerta 2 días antes de la baja)
- Días prioridad alta: 1 (marca urgente 1 día antes)
- Días crítico: 0 (marca crítico el día de la baja)

Acciones:
- Crear tarea automática: ✓ (por defecto SÍ para retención)
- Asignar a: Responsable de Sede

Frecuencia: Diaria (temprano, 7 AM)
```

### 📊 Ejemplo Real:
```
Cliente: Roberto Vega
Plan: Suscripción Mensual
Fecha baja programada: 10/02/2025
Hoy: 08/02/2025

→ Días hasta baja: 2 días
→ Alerta creada: ✓ (llegó al umbral de 2 días)
→ Prioridad: Media
→ Motivo baja: "Mudanza"
→ Tarea creada: ✓ "Baja Programada: Roberto Vega - en 2 días"
```

---

## 🎯 Resumen Rápido: ¿Cuál Configurar?

| Tipo de Alerta | ¿Cuándo Usarla? | Frecuencia Recomendada |
|----------------|-----------------|------------------------|
| **Renovación** | Planes PREPAGO vencidos | Diaria (8 AM) |
| **Deudor** | Suscripciones sin pagar | Diaria (8 AM) |
| **Contrato Pendiente** | Contratos sin firmar | Diaria (9 AM) |
| **Tarjeta Pendiente** | Tarjetas con fallos | Cada 4 horas |
| **Cliente en Riesgo** | Clientes identificados en riesgo | Diaria (8 AM) |
| **Seguimiento Online** | Prepago recién vencido (0-3 días) | Cada 4 horas |
| **Baja Programada** | Bajas próximas a ejecutarse | Diaria (7 AM) |

---

## 💡 Consejos de Configuración

### 1. **Empieza con lo Crítico**
Configura primero:
- ✅ Renovación (recuperar ingresos)
- ✅ Baja Programada (prevenir pérdidas)
- ✅ Deudor (cobros pendientes)

### 2. **Ajusta los Umbrales a tu Realidad**
- Gimnasio pequeño: umbrales más cortos (3, 7, 14 días)
- Gimnasio grande: umbrales más largos (7, 15, 30 días)

### 3. **Activa Tareas Automáticas**
- ✅ Siempre activa `crear_tarea_automatica` para que el RS tenga trabajo asignado
- ✅ Asigna a "Responsable de Sede" para distribución automática

### 4. **Frecuencia Inteligente**
- **Diaria**: Renovación, Deudor, Contratos, Clientes Riesgo, Bajas
- **Cada 4 horas**: Tarjetas, Seguimiento Online (más urgentes)

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo tener múltiples reglas del mismo tipo?**  
R: Sí, pero solo se usará la primera regla activa. Desactiva las demás.

**P: ¿Qué pasa si no configuro ninguna regla?**  
R: Las funciones usan valores por defecto (3, 7, 14 días).

**P: ¿Las alertas se duplican?**  
R: No, el sistema verifica antes de crear y solo actualiza si ya existe.

**P: ¿Puedo desactivar una alerta temporalmente?**  
R: Sí, solo desmarca "Activa" en la regla.

---

**¿Listo para configurar tus alertas?** 🚀  
Ve a **ConfiguracionAlertas** y empieza con las 3 críticas: Renovación, Baja Programada y Deudor.