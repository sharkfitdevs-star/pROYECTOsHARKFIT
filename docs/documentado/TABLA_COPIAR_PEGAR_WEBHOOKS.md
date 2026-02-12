# 📋 TABLA PARA COPIAR Y PEGAR - Configuración de Webhooks

## 🎯 Instrucciones

Para cada fila de la tabla, crea UNA automation nueva.

**Solo tienes que copiar y pegar los valores de cada columna.**

---

## 📊 TABLA DE CONFIGURACIÓN

| # | NOMBRE (copia esto) | CRON (copia esto) | URL (copia esto) |
|---|---------------------|-------------------|------------------|
| 1 | Alertas Bajas Programadas | `0 */4 * * *` | `https://ventas.sharkfit.info/api/generarAlertasBajasProgramadas` |
| 2 | Alertas Clientes Riesgo | `0 */4 * * *` | `https://ventas.sharkfit.info/api/generarAlertasClientesRiesgo` |
| 3 | Alertas Renovaciones | `0 8 * * *` | `https://ventas.sharkfit.info/api/generarAlertasRenovacion` |
| 4 | Alertas Deudores | `0 9 * * *` | `https://ventas.sharkfit.info/api/generarAlertasDeudores` |
| 5 | Alertas Clientes Nuevos | `0 * * * *` | `https://ventas.sharkfit.info/api/generarAlertasClienteNuevo` |

---

## 🔧 VALORES QUE SON IGUALES PARA TODAS

Estos valores son los MISMOS para las 5 automations:

```
Trigger Type: Schedule
Method: POST
Header Key: Content-Type
Header Value: application/json
Body: (vacío - no escribas nada)
```

---

## 📝 EJEMPLO COMPLETO - AUTOMATION #1

Aquí está TODO lo que necesitas para la primera automation:

```
═══════════════════════════════════════════════════
AUTOMATION #1: BAJAS PROGRAMADAS
═══════════════════════════════════════════════════

NOMBRE:
Alertas Bajas Programadas

TRIGGER:
Type: Schedule
Cron: 0 */4 * * *

ACTION:
Type: Webhook
Method: POST
URL: https://ventas.sharkfit.info/api/generarAlertasBajasProgramadas

HEADERS:
Key: Content-Type
Value: application/json

BODY:
(vacío)

═══════════════════════════════════════════════════
```

---

## 📝 EJEMPLO COMPLETO - AUTOMATION #2

```
═══════════════════════════════════════════════════
AUTOMATION #2: CLIENTES EN RIESGO
═══════════════════════════════════════════════════

NOMBRE:
Alertas Clientes Riesgo

TRIGGER:
Type: Schedule
Cron: 0 */4 * * *

ACTION:
Type: Webhook
Method: POST
URL: https://ventas.sharkfit.info/api/generarAlertasClientesRiesgo

HEADERS:
Key: Content-Type
Value: application/json

BODY:
(vacío)

═══════════════════════════════════════════════════
```

---

## 📝 EJEMPLO COMPLETO - AUTOMATION #3

```
═══════════════════════════════════════════════════
AUTOMATION #3: RENOVACIONES
═══════════════════════════════════════════════════

NOMBRE:
Alertas Renovaciones

TRIGGER:
Type: Schedule
Cron: 0 8 * * *

ACTION:
Type: Webhook
Method: POST
URL: https://ventas.sharkfit.info/api/generarAlertasRenovacion

HEADERS:
Key: Content-Type
Value: application/json

BODY:
(vacío)

═══════════════════════════════════════════════════
```

---

## 📝 EJEMPLO COMPLETO - AUTOMATION #4

```
═══════════════════════════════════════════════════
AUTOMATION #4: DEUDORES
═══════════════════════════════════════════════════

NOMBRE:
Alertas Deudores

TRIGGER:
Type: Schedule
Cron: 0 9 * * *

ACTION:
Type: Webhook
Method: POST
URL: https://ventas.sharkfit.info/api/generarAlertasDeudores

HEADERS:
Key: Content-Type
Value: application/json

BODY:
(vacío)

═══════════════════════════════════════════════════
```

---

## 📝 EJEMPLO COMPLETO - AUTOMATION #5

```
═══════════════════════════════════════════════════
AUTOMATION #5: CLIENTES NUEVOS
═══════════════════════════════════════════════════

NOMBRE:
Alertas Clientes Nuevos

TRIGGER:
Type: Schedule
Cron: 0 * * * *

ACTION:
Type: Webhook
Method: POST
URL: https://ventas.sharkfit.info/api/generarAlertasClienteNuevo

HEADERS:
Key: Content-Type
Value: application/json

BODY:
(vacío)

═══════════════════════════════════════════════════
```

---

## ✅ CHECKLIST

Marca cada una cuando la crees:

```
[ ] Automation #1: Bajas Programadas
[ ] Automation #2: Clientes Riesgo
[ ] Automation #3: Renovaciones
[ ] Automation #4: Deudores
[ ] Automation #5: Clientes Nuevos
```

---

## 🎯 RESUMEN VISUAL

```
┌─────────────────────────────────────────────────┐
│  AUTOMATION 1: Bajas Programadas                │
│  ⏰ Cada 4 horas                                 │
│  🔗 /api/generarAlertasBajasProgramadas         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  AUTOMATION 2: Clientes Riesgo                  │
│  ⏰ Cada 4 horas                                 │
│  🔗 /api/generarAlertasClientesRiesgo           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  AUTOMATION 3: Renovaciones                     │
│  ⏰ Diario 8:00 AM                               │
│  🔗 /api/generarAlertasRenovacion               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  AUTOMATION 4: Deudores                         │
│  ⏰ Diario 9:00 AM                               │
│  🔗 /api/generarAlertasDeudores                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  AUTOMATION 5: Clientes Nuevos                  │
│  ⏰ Cada hora                                    │
│  🔗 /api/generarAlertasClienteNuevo             │
└─────────────────────────────────────────────────┘
```

---

## 💡 CONSEJO

**Abre este archivo en una ventana y la plataforma en otra.**

Así puedes copiar y pegar sin cambiar de ventana.

---

**¿Listo para empezar? Ve a la plataforma y crea la primera automation.** 🚀