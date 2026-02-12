# 🎨 GUÍA VISUAL - Configurar Webhooks

## 🎯 Lo que vas a hacer (en dibujos)

```
TÚ → Plataforma → Crear 5 "Alarmas" → Sistema genera tareas automáticamente
```

---

## 📱 PASO 1: Ir a Automations

```
┌─────────────────────────────────────┐
│  🏠 Dashboard                       │
│                                     │
│  📊 Reportes                        │
│  👥 Clientes                        │
│  ⚙️  Configuración                  │
│  🔔 Automations  ← HAZ CLIC AQUÍ   │
│  📈 Analytics                       │
│                                     │
└─────────────────────────────────────┘
```

---

## 📱 PASO 2: Crear Nueva

```
┌─────────────────────────────────────────────────┐
│  Automations                                    │
│  ┌──────────────────────────────────────────┐  │
│  │  + Create New  ← HAZ CLIC AQUÍ          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Lista de Automations:                          │
│  (vacía por ahora)                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📱 PASO 3: Llenar el Formulario

```
┌─────────────────────────────────────────────────┐
│  Nueva Automation                               │
│                                                 │
│  Nombre:                                        │
│  ┌──────────────────────────────────────────┐  │
│  │ Alertas Bajas Programadas                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Trigger:                                       │
│  ┌──────────────────────────────────────────┐  │
│  │ Schedule ▼                                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Cron:                                          │
│  ┌──────────────────────────────────────────┐  │
│  │ 0 */4 * * *                              │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Action:                                        │
│  ┌──────────────────────────────────────────┐  │
│  │ Webhook ▼                                 │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Method:                                        │
│  ┌──────────────────────────────────────────┐  │
│  │ POST ▼                                    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  URL:                                           │
│  ┌──────────────────────────────────────────┐  │
│  │ https://ventas.sharkfit.info/api/...    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Headers:                                       │
│  ┌──────────────────────────────────────────┐  │
│  │ Content-Type: application/json           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Body:                                          │
│  ┌──────────────────────────────────────────┐  │
│  │ (vacío)                                   │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌────────┐  ┌────────┐                        │
│  │ Save   │  │ Cancel │                        │
│  └────────┘  └────────┘                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📱 PASO 4: Activar y Probar

```
┌─────────────────────────────────────────────────┐
│  Automation: Alertas Bajas Programadas          │
│                                                 │
│  Estado: ⚪ Inactiva  →  🟢 Activa              │
│          ↑                                      │
│          HAZ CLIC AQUÍ PARA ACTIVAR             │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  ▶️ Run Now  ← HAZ CLIC PARA PROBAR      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Resultado:                                     │
│  ✅ Success!                                    │
│  {                                              │
│    "success": true,                             │
│    "alertasCreadas": 2,                         │
│    "tareasCreadas": 2                           │
│  }                                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🎯 RESULTADO FINAL

Después de configurar las 5 automations:

```
┌─────────────────────────────────────────────────┐
│  Automations                                    │
│                                                 │
│  ✅ Alertas Bajas Programadas    🟢 Activa     │
│     Cada 4 horas                                │
│                                                 │
│  ✅ Alertas Clientes Riesgo      🟢 Activa     │
│     Cada 4 horas                                │
│                                                 │
│  ✅ Alertas Renovaciones          🟢 Activa     │
│     Diario 8:00 AM                              │
│                                                 │
│  ✅ Alertas Deudores              🟢 Activa     │
│     Diario 9:00 AM                              │
│                                                 │
│  ✅ Alertas Clientes Nuevos       🟢 Activa     │
│     Cada hora                                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📊 VERIFICAR EN DASHBOARDRS

```
┌─────────────────────────────────────────────────┐
│  DashboardRS - Mis Tareas                       │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 🟣 Contactar Baja Programada             │  │
│  │    Cliente: Juan Pérez                   │  │
│  │    [Gestionar Baja]                      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔴 Cliente en Riesgo Crítico             │  │
│  │    Cliente: María López                  │  │
│  │    [Gestionar Riesgo]                    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 🟠 Contactar por Renovación              │  │
│  │    Cliente: Pedro García                 │  │
│  │    [Gestionar Renovación]                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 🟡 Contactar Cliente con Deuda           │  │
│  │    Cliente: Ana Martínez                 │  │
│  │    [Registrar Cobro]                     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 🟢 Cliente debe registrar tarjeta        │  │
│  │    Cliente: Carlos Ruiz                  │  │
│  │    [Gestionar]                           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🎨 FLUJO VISUAL COMPLETO

```
┌─────────────┐
│   EVENTO    │  Cliente vence, se programa baja, etc.
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   WEBHOOK   │  Se ejecuta automáticamente (cada X horas)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   FUNCIÓN   │  generarAlertas...()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   ALERTA    │  Se crea en Alertas_Renovacion
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   TAREA     │  Se crea en Tareas_RS
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ DASHBOARD   │  RS ve la tarea con botón específico
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ RS GESTIONA │  Hace clic en el botón
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  COMPLETA   │  Tarea se marca como completada
└─────────────┘
```

---

## 📋 CHECKLIST VISUAL

```
Configuración:
[ ] 🟣 Automation 1: Bajas Programadas
[ ] 🔴 Automation 2: Clientes Riesgo
[ ] 🟠 Automation 3: Renovaciones
[ ] 🟡 Automation 4: Deudores
[ ] 🟢 Automation 5: Clientes Nuevos

Verificación:
[ ] Todas están 🟢 Activas
[ ] Probé ejecutar manualmente al menos una
[ ] Vi tareas en DashboardRS
[ ] Los botones de colores funcionan
```

---

## 🎯 ¿QUÉ SIGUE?

```
SI TODO FUNCIONÓ:
✅ ¡Felicidades! El sistema está configurado
✅ Las tareas se generarán automáticamente
✅ Solo espera a que llegue la hora programada

SI ALGO NO FUNCIONÓ:
❌ Revisa el paso donde te trabaste
❌ Verifica que copiaste bien las URLs
❌ Contacta a soporte: katherine@agentui.ai
```

---

**¿Te ayudó esta guía visual? ¡Ahora ve y configura tu primera automation!** 🚀