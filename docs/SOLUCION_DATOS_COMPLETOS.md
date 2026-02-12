# SOLUCIÓN COMPLETA: OBTENCIÓN DE DATOS PARA DASHBOARD SHARKFIT

**Fecha:** 11 de Febrero de 2026  
**Situación:** API W12App limitada - Necesitamos datos completos de clientes

---

## 📊 ESTADO ACTUAL

### ✅ Datos Disponibles en W12App API:

| Endpoint | Datos | Status |
|----------|-------|--------|
| `/api/v1/prospects` | Prospectos/Leads (pre-venta) | ✅ Funciona |
| `/api/v1/entries` | Logs de acceso al gimnasio | ✅ Funciona |

**Campos capturados en PROSPECTS (~33 campos):**
- Datos personales: nombre, email, teléfono, dirección
- Marketing: canal, origen, temperatura
- Estado: paso actual, branch

**Campos capturados en ENTRIES (~16 campos):**
- Miembro: ID, nombre completo
- Acceso: fecha/hora, tipo, dispositivo, sucursal
- Control: motivo de bloqueo, acción

### ❌ Datos NO Disponibles en W12App:

| Tipo de Dato | Status | Impacto en Dashboard |
|--------------|--------|---------------------|
| Clientes activos (members) | ❌ 404 | No podemos listar clientes |
| Membresías activas (memberships) | ❌ 404 | No sabemos qué plan tiene cada uno |
| Ventas detalladas (sales) | ❌ 404 | No tenemos KPIs de ventas |
| Planes disponibles (plans) | ❌ 404 | No sabemos qué planes ofrecer |
| Contratos (contracts) | ❌ 404 | No vemos estado contractual |
| Pagos (payments) | ❌ 404 | No rastreamos cobros |

---

## 🎯 SOLUCIONES PROPUESTAS (4 Opciones)

### OPCIÓN 1: INFERIR CLIENTES DESDE ENTRIES ⭐ (Implementación Inmediata)

**Concepto:** Los logs de acceso contienen nombres e IDs de miembros activos.

**Implementación:**
```python
# Extraer lista de clientes activos desde entries
def get_active_clients_from_entries():
    entries = api.get('/api/v1/entries')
    
    clients = {}
    for entry in entries:
        member_id = entry['idMember']
        if member_id not in clients:
            clients[member_id] = {
                'id': member_id,
                'name': entry['nameMember'],
                'first_access': entry['dateTimeLiberationOrigin'],
                'last_access': entry['dateTimeLiberationOrigin'],
                'total_visits': 0,
                'branch': entry['nameBranch']
            }
        
        clients[member_id]['total_visits'] += 1
        if entry['dateTimeLiberationOrigin'] > clients[member_id]['last_access']:
            clients[member_id]['last_access'] = entry['dateTimeLiberationOrigin']
    
    return list(clients.values())
```

**Ventajas:**
- ✅ Implementación inmediata (2 horas)
- ✅ No requiere credenciales adicionales
- ✅ Identifica clientes activos reales
- ✅ Frecuencia de visitas por cliente
- ✅ última actividad de cada cliente

**Limitaciones:**
- ❌ Solo clientes que han accedido recientemente
- ❌ No incluye plan/membresía
- ❌ No incluye estado de pago

**Dashboard posible:**
- Total clientes activos (últimos 30 días)
- Frecuencia de visitas promedio
- Clientes más activos
- Clientes inactivos (no visitan hace X días)
- Distribución por sucursal

---

### OPCIÓN 2: ACCESO A API NATIVA EVO5 ⭐⭐⭐ (Recomendado)

**Concepto:** Solicitar credenciales para la API EVO5 completa (no W12App).

**URLs de integración EVO5:**
```
Base URL: https://evo-integracao-api.w12app.com.br
Alternativa: https://api.evo.com.br (según país)

Endpoints esperados:
- GET /api/v1/members          # Clientes completos
- GET /api/v1/memberships      # Membresías activas
- GET /api/v1/plans           # Planes disponibles
- GET /api/v1/contracts        # Contratos vigentes
- GET /api/v1/payments         # Historial de pagos
- GET /api/v1/sales           # Ventas detalladas
```

**Pasos para implementar:**

1. **Contactar soporte EVO5:**
   - Email: suporte@evo5.com
   - Solicitar: "API Key para integración con base de datos propia"
   - Mencionar: "Ya tenemos W12App, necesitamos acceso completo"

2. **Información a solicitar:**
   ```
   - API Base URL (EVO5 nativa)
   - API Key / Token
   - API Secret (si aplica)
   - Documentación de endpoints
   - Rate limits
   - Entorno: Producción vs Sandbox
   ```

3. **Actualizar sync_evo.py:**
   ```python
   # Agregar nuevas funciones:
   - _sync_members()      # Clientes completos
   - _sync_memberships()  # Membresías activas
   - _sync_plans()        # Planes disponibles
   - _sync_payments()     # Pagos
   ```

**Ventajas:**
- ✅ 100% de los datos necesarios
- ✅ Información en tiempo real
- ✅ Dashboard completo posible
- ✅ Estado de planes y pagos

**Tiempos:**
- Solicitud API Key: 3-5 días hábiles
- Implementación: 1 semana
- Pruebas: 2-3 días

---

### OPCIÓN 3: EXPORTACIÓN MANUAL + CARGA PERIÓDICA ⭐⭐ (Temporal)

**Concepto:** Exportar datos desde panel EVO5 y cargarlos manualmente.

**Pasos:**

1. **Exportar desde EVO5:**
   - Login → Panel Administrativo
   - Módulo "Clientes" → Exportar todo → CSV/Excel
   - Módulo "Membresías" → Exportar activas → CSV/Excel
   - Módulo "Ventas" → Exportar (últimos 90 días) → CSV/Excel

2. **Crear script de carga:**
   ```bash
   python manage.py import_members --file=clientes.csv
   python manage.py import_memberships --file=membresias.csv
   python manage.py import_sales --file=ventas.csv
   ```

3. **Frecuencia de actualización:**
   - Diaria: Clientes y membresías
   - Semanal: Ventas históricas
   - Mensual: Planes disponibles

**Ventajas:**
- ✅ Datos completos disponibles
- ✅ No depende de API
- ✅ Control total de datos

**Desventajas:**
- ❌ Proceso manual
- ❌ No en tiempo real
- ❌ Propenso a errores humanos

**Estimación:**
- Setup inicial: 1 día
- Carga semanal: 30 minutos

---

### OPCIÓN 4: WEBHOOKS EVO5 ⭐⭐⭐ (Ideal para Production)

**Concepto:** EVO5 envía eventos a nuestro backend automáticamente.

**Eventos útiles:**
```
- member.created       # Nuevo cliente
- member.updated       # Actualización de cliente
- membership.created   # Nueva membresía
- membership.expired   # Membresía vencida
- payment.received     # Pago recibido
- sale.completed       # Venta finalizada
- access.logged        # Acceso registrado
```

**Implementación:**

1. **Configurar webhooks en EVO5:**
   ```
   URL destino: https://tu-servidor.com/webhooks/evo5
   Eventos: members, memberships, sales, payments
   Secret: [token de seguridad]
   ```

2. **Crear endpoint receptor:**
   ```python
   # backend/apps/webhooks/views.py
   
   @csrf_exempt
   def evo5_webhook(request):
       payload = json.loads(request.body)
       event_type = payload['event']
       data = payload['data']
       
       if event_type == 'member.updated':
           Member.objects.update_or_create(
               evo_member_id=data['id'],
               defaults={
                   'name': data['name'],
                   'status': data['status'],
                   # ... más campos
               }
           )
       
       return JsonResponse({'status': 'received'})
   ```

**Ventajas:**
- ✅ Tiempo real
- ✅ Automático (sin trabajo manual)
- ✅ Eficiente (solo cambios)
- ✅ Production-ready

**Desventajas:**
- ❌ Requiere configuración en EVO5
- ❌ Necesita servidor público accesible

**Tiempos:**
- Configuración: 2-3 días
- Pruebas: 1 semana

---

## 🚀 PLAN DE IMPLEMENTACIÓN RECOMENDADO

### FASE 1: INMEDIATO (Esta semana)

**Implementar OPCIÓN 1:** Inferir clientes desde entries

1. ✅ Crear función `extract_clients_from_entries()`
2. ✅ Actualizar modelo `Member` con campos inferidos
3. ✅ Crear vista de dashboard con:
   - Total clientes activos
   - Visitas por semana
   - Top 10 clientes más activos
   - Alertas de inactividad

**Resultado esperado:**
- Dashboard funcional con datos reales
- KPIs básicos de asistencia
- Identificación de clientes en riesgo

---

### FASE 2: CORTO PLAZO (Próximas 2 semanas)

**Solicitar OPCIÓN 2:** API EVO5 nativa

1. Contactar soporte EVO5
2. Mientras esperamos respuesta → Implementar OPCIÓN 3 (exportación manual)
3. Crear scripts de importación CSV
4. Cargar datos históricos

**Resultado esperado:**
- Dashboard con datos completos
- Información de planes y pagos
- Análisis de ventas histórico

---

### FASE 3: LARGO PLAZO (1 mes)

**Implementar OPCIÓN 4:** Webhooks

1. Una vez con API EVO5 → Configurar webhooks
2. Migrar de sync periódico a eventos en tiempo real
3. Production-ready

**Resultado final:**
- Sistema completamente automatizado
- Datos en tiempo real
- Escalable y confiable

---

## 📋 CHECKLIST DE ACCIÓN INMEDIATA

### Hoy (2 horas):
- [ ] Implementar función `extract_clients_from_entries()`
- [ ] Crear modelo `InferredMember` con campos:
  - `evo_member_id`
  - `name`
  - `first_seen`
  - `last_access`
  - `total_visits`
  - `branch`
  - `status` (activo/inactivo)
- [ ] Actualizar `sync_evo.py` para popular esta tabla

### Mañana (4 horas):
- [ ] Crear vista de API `/api/clients/active`
- [ ] Crear endpoint `/api/clients/stats`
- [ ] Actualizar dashboard frontend con:
  - Widget "Clientes Activos"
  - Gráfico "Frecuencia de Visitas"
  - Tabla "Top Clientes"
  - Alertas "Riesgo de Abandono"

### Esta semana (1 día):
- [ ] Contactar soporte EVO5 para API nativa
- [ ] Preparar script de importación CSV
- [ ] Documentar proceso manual de exportación

---

## 💡 DASHBOARD POSIBLE CON DATOS ACTUALES

Con lo que tenemos HOY podemos mostrar:

### 🟢 KPIs Disponibles:

**Clientes:**
- Total clientes activos (basado en accesos últimos 30 días)
- Nuevos clientes (primera visita en período)
- Clientes en riesgo (sin visitas hace 15+ días)
- Tasa de retención (% que siguen visitando)

**Prospectos:**
- Total leads en pipeline
- Conversión de leads (estimada por accesos)
- Leads por canal de marketing
- Temperatura de leads (fríos, tibios, calientes)

**Asistencia:**
- Promedio visitas/cliente/semana
- Días de mayor afluencia
- Horas pico
- Distribución por sucursal

**Tendencias:**
- Crecimiento semanal de clientes activos
- Variación de asistencia
- Patrones de abandono

### 🔴 KPIs NO Disponibles (hasta tener API EVO5):
- Ingresos por ventas
- Valor promedio por cliente
- Planes más vendidos
- Estado de pagos
- Tasa de renovación exacta
- MRR (Monthly Recurring Revenue)

---

## 📞 CONTACTOS PARA SOLICITAR ACCESO

**EVO5 Soporte Técnico:**
- Email: suporte.produto@evo.app
- Teléfono (Brasil): +55 47 3209-1016
- Portal: https://ajuda.evo.app

**Información a mencionar:**
- Cliente: Sharkfit Chile
- DNS: sharkfitchile
- Token actual: FB109206-CE01-4160-BCDF-8389B8725276
- Solicitud: "Acceso a API EVO5 completa para integración con dashboard propietario"

---

## 🎯 RESUMEN EJECUTIVO

**Situación:**
- W12App API es limitada (solo prospects + entries)
- No expone clientes, membresías, ventas

**Solución Inmediata (HOY):**
- Inferir clientes activos desde logs de acceso
- Dashboard parcial funcional

**Solución Completa (2 semanas):**
- Obtener credenciales API EVO5 nativa
- Sincronización completa de todos los datos

**Resultado Final:**
- Dashboard completo con todos los KPIs
- Datos en tiempo real
- Sistema production-ready

---

*Documento generado el 11/02/2026*  
*Próxima actualización: Tras contactar soporte EVO5*
