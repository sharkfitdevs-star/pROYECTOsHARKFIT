# 🆕 NUEVA ALERTA: Cliente Nuevo (Onboarding)

## 🎯 ¿Qué es?

Una alerta especial que detecta **clientes nuevos** y genera automáticamente **múltiples tareas de onboarding** asignadas a diferentes responsables o departamentos.

---

## 🔍 ¿Qué Detecta?

- Clientes recién registrados (últimos X días configurables)
- Clientes que NO tienen tareas de onboarding previas
- Aplica a **TODOS** los tipos de planes (Prepago, Suscripción, Programas)

---

## ✨ Características Únicas

### 1. **Múltiples Tareas Automáticas**
A diferencia de otras alertas que crean 1 tarea, esta puede crear **N tareas** según tu configuración.

### 2. **Diferentes Responsables**
Cada tarea puede asignarse a:
- ✅ Responsable de Sede
- ✅ Staff específico
- ✅ Departamento (Ventas, Financiero, Retención, Soporte, Experiencia Cliente)

### 3. **Variables Dinámicas**
Puedes usar variables en título y descripción:
- `{cliente_nombre}` - Nombre del cliente
- `{plan}` - Plan contratado
- `{whatsapp}` - WhatsApp del cliente
- `{fecha_compra}` - Fecha de primera compra

---

## 💡 Ejemplo de Configuración

### **Escenario:** Onboarding completo para clientes nuevos

```json
{
  "tipo_alerta": "cliente_nuevo",
  "nombre_regla": "Onboarding Cliente Nuevo",
  "activa": true,
  "dias_umbral_activacion": 1,
  "frecuencia_verificacion": "cada_4_horas",
  "tareas_automaticas": [
    {
      "titulo": "Bienvenida y Tour: {cliente_nombre}",
      "descripcion": "Dar bienvenida al cliente {cliente_nombre} y realizar tour de instalaciones. Plan: {plan}. WhatsApp: {whatsapp}",
      "tipo": "comercial",
      "prioridad": "alta",
      "dias_limite": 1,
      "asignar_a": "responsable_sede"
    },
    {
      "titulo": "Registrar Contrato: {cliente_nombre}",
      "descripcion": "Gestionar firma de contrato del cliente {cliente_nombre}. Plan: {plan}",
      "tipo": "administrativa",
      "prioridad": "alta",
      "dias_limite": 3,
      "asignar_a": "departamento",
      "departamento": "soporte"
    },
    {
      "titulo": "Registrar Tarjeta: {cliente_nombre}",
      "descripcion": "Registrar tarjeta de pago del cliente {cliente_nombre} para cobros automáticos",
      "tipo": "administrativa",
      "prioridad": "media",
      "dias_limite": 5,
      "asignar_a": "departamento",
      "departamento": "financiero"
    },
    {
      "titulo": "Seguimiento Primera Semana: {cliente_nombre}",
      "descripcion": "Contactar a {cliente_nombre} para verificar satisfacción y resolver dudas. WhatsApp: {whatsapp}",
      "tipo": "seguimiento",
      "prioridad": "media",
      "dias_limite": 7,
      "asignar_a": "departamento",
      "departamento": "experiencia_cliente"
    }
  ]
}
```

---

## 📊 Resultado del Ejemplo

Cuando se registra **Sofía Martínez** con plan **Mensual Prepago**:

### **Tareas Creadas Automáticamente:**

| # | Tarea | Responsable | Prioridad | Vence en |
|---|-------|-------------|-----------|----------|
| 1 | Bienvenida y Tour: Sofía Martínez | RS de la sede | Alta | 1 día |
| 2 | Registrar Contrato: Sofía Martínez | Depto. Soporte | Alta | 3 días |
| 3 | Registrar Tarjeta: Sofía Martínez | Depto. Financiero | Media | 5 días |
| 4 | Seguimiento Primera Semana: Sofía Martínez | Depto. Experiencia Cliente | Media | 7 días |

---

## 🎯 Casos de Uso

### **Caso 1: Onboarding Básico (3 tareas)**
```
1. Bienvenida (RS) - 1 día
2. Contrato (Soporte) - 3 días
3. Tarjeta (Financiero) - 5 días
```

### **Caso 2: Onboarding Completo (6 tareas)**
```
1. Bienvenida (RS) - 1 día
2. Tour Instalaciones (RS) - 1 día
3. Contrato (Soporte) - 3 días
4. Tarjeta (Financiero) - 5 días
5. Seguimiento Semana 1 (Experiencia Cliente) - 7 días
6. Encuesta NPS (Experiencia Cliente) - 30 días
```

### **Caso 3: Onboarding por Tipo de Plan**
Puedes crear **2 reglas diferentes**:
- Una para **Prepago** (tareas de bienvenida y contrato)
- Una para **Suscripción** (tareas de bienvenida, contrato y tarjeta)

---

## ⚙️ Configuración en la UI

### **Paso 1: Crear Regla**
1. Ve a **Configuración → Configuración de Alertas**
2. Click en **Nueva Regla**
3. Selecciona tipo: **Cliente Nuevo (Onboarding)**

### **Paso 2: Configurar Umbrales**
- **Días para activar:** 1 (detectar clientes de hoy)
- **Frecuencia:** Cada 4 horas (para detectar rápido)

### **Paso 3: Configurar Tareas** (en JSON por ahora)
Edita el campo `tareas_automaticas` con tu configuración de tareas.

---

## 🔧 Webhook Recomendado

```
Nombre: Generar Tareas Cliente Nuevo
URL: /api/generarAlertasClienteNuevo
Método: POST
Frecuencia: Cada 4 horas (para detectar clientes nuevos rápido)
Headers: 
  x-service-role: true
```

---

## ✅ Ventajas

1. **Automatización Total** - No olvidas ningún paso del onboarding
2. **Distribución de Trabajo** - Cada departamento recibe sus tareas
3. **Seguimiento Estructurado** - Todas las tareas en Tareas_RS
4. **Personalización** - Variables dinámicas en cada tarea
5. **Escalabilidad** - Agrega o quita tareas sin tocar código

---

## 📋 Checklist de Implementación

- [ ] Crear regla en ConfiguracionAlertas
- [ ] Configurar lista de tareas en `tareas_automaticas`
- [ ] Definir responsables (RS, staff, departamentos)
- [ ] Configurar webhook cada 4 horas
- [ ] Probar con un cliente nuevo
- [ ] Verificar que se crean las tareas correctamente
- [ ] Ajustar días límite según tu operación

---

## 🆘 Preguntas Frecuentes

**P: ¿Puedo tener diferentes tareas para Prepago vs Suscripción?**  
R: Sí, crea 2 reglas diferentes (una por tipo) y filtra en la función backend.

**P: ¿Qué pasa si no configuro tareas_automaticas?**  
R: Se crea una tarea genérica de bienvenida asignada al RS.

**P: ¿Puedo asignar a un staff específico?**  
R: Sí, usa `"asignar_a": "staff_especifico"` y agrega `"staff_id": "ID_DEL_STAFF"`.

**P: ¿Se duplican las tareas si ejecuto varias veces?**  
R: No, la función verifica si ya existen tareas de tipo `onboarding_cliente_nuevo` para ese cliente.

---

**¡Ahora tienes onboarding automatizado para todos tus clientes nuevos!** 🎉