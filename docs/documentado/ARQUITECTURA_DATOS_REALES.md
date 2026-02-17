# 🔄 ARQUITECTURA: DATOS REALES - Dashboard Sharkfit

**Nota 2026:** Referencias a SQLite son históricas; la ingestión y microservicios usan MongoDB.

## 📐 RESUMEN EJECUTIVO

Transformar Dashboard Sharkfit de **mock data → datos reales** con:
- ✅ **Ingesta multi-fuente**: Excel, CSV, MongoDB, PostgreSQL, APIs REST (EVO/W12)
- ✅ **Sincronización**: Webhooks (real-time) + Polling (incremental)
- ✅ **Schema unificado**: Clientes, Ventas, Leads, Actividades, Membresías
- ✅ **Backend centralizado**: Node/Express que expone API limpia al frontend
- ✅ **UI de configuración**: Sin exponer tokens, todo por backend

---

## 1️⃣ SCHEMA NORMALIZADO (MongoDB)

### 1.1 Colección: `clientes`

```javascript
{
  _id: ObjectId,
  
  // Identificadores
  clienteId: String,           // ID único interno
  eventoId: String,            // ID de EVO (si existe)
  
  // Datos básicos
  nombre: String,
  email: String,
  telefono: String,
  empresa: String,
  rfc: String,
  
  // Dirección
  direccion: {
    calle: String,
    numero: String,
    ciudad: String,
    estado: String,
    codigoPostal: String,
    pais: String
  },
  
  // Estado
  estado: {
    enum: ['Prospecto', 'Cliente Activo', 'Cliente en Riesgo', 'Inactivo', 'Dado de Baja'],
    default: 'Prospecto'
  },
  
  // Suscripción/Membresía
  membresia: {
    tipo: String,              // 'Plan Básico', 'Plan Pro', 'Plan Premium'
    estado: {
      enum: ['Activa', 'Vencida', 'Cancelada', 'Suspendida'],
      default: 'Activa'
    },
    fechaInicio: Date,
    fechaVencimiento: Date,
    diasPorVencer: Number,     // Calculado
    renovacionAutomatica: Boolean
  },
  
  // Financiero
  financiero: {
    totalGastado: Number,      // Suma de todas las ventas
    ultimaCompra: Date,
    cicloFacturacion: String,  // 'Mensual', 'Trimestral', 'Anual'
    diasSinCompra: Number,     // Calculado
  },
  
  // Relación
  gerente: String,             // Email del responsable
  fuente: String,              // 'importación', 'EVO', 'API-W12', 'manual'
  
  // Indicadores
  indicadores: {
    tasaRetención: Number,     // % (0-100)
    daysToClose: Number,       // Días promedio desde prospecto a cliente
    nps: Number,               // -100 a 100
    calificación: {
      enum: ['A', 'B', 'C', 'D'],
      default: 'B'
    }
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  syncedAt: Date,              // Última sincronización con fuente
  
  // Auditoría
  audit: {
    origen: String,            // 'manuel', 'import', 'sync'
    cambiosRecientes: [{
      campo: String,
      valorAnterior: String,
      valorNuevo: String,
      fecha: Date
    }]
  }
}
```

### 1.2 Colección: `ventas`

```javascript
{
  _id: ObjectId,
  
  // Identificadores
  ventaId: String,
  clienteId: String,           // Referencia a clientes
  eventoVentaId: String,       // ID de EVO/W12 si aplica
  
  // Datos de venta
  concepto: String,            // Producto/servicio
  monto: Number,
  moneda: {
    enum: ['MXN', 'USD', 'EUR'],
    default: 'MXN'
  },
  comisión: Number,            // % o monto fijo
  
  // Fechas
  fecha: Date,                 // Cuando ocurrió
  fechaEntrega: Date,          // Cuando se entregó
  fechaVencimiento: Date,      // Próximo vencimiento (si membresía)
  
  // Estatus
  estatus: {
    enum: ['Completada', 'Pendiente', 'Cancelada', 'Devuelta'],
    default: 'Completada'
  },
  
  // Detalles
  vendedor: String,            // Persona que vendió
  departamento: String,        // Área responsable
  categoría: String,           // Tipo de producto
  
  // Financiero
  pagado: Boolean,
  metodoPago: String,          // 'Efectivo', 'Tarjeta', 'Transferencia'
  
  // Relación y contexto
  fuente: String,              // 'importación', 'EVO', 'API-W12'
  
  createdAt: Date,
  updatedAt: Date,
  syncedAt: Date
}
```

### 1.3 Colección: `leads`

```javascript
{
  _id: ObjectId,
  
  leadId: String,
  clienteId: String,           // Será NULL si no se convirtió en cliente
  
  nombre: String,
  email: String,
  telefono: String,
  empresa: String,
  
  // Interés
  producto: String,            // Qué le interesa
  presupuesto: Number,
  
  // Estatus en el funnel
  estatus: {
    enum: ['Nuevo', 'Contactado', 'Propuesta Enviada', 'Negociando', 'Ganado', 'Perdido'],
    default: 'Nuevo'
  },
  
  // Probabilidad de conversión (0-100)
  probabilidad: Number,
  
  // Score de calificación
  leadScore: Number,           // Basado en engagement
  
  // Seguimiento
  proximaAccion: {
    tipo: String,              // 'llamada', 'email', 'reunión'
    fecha: Date
  },
  
  fuente: String,              // 'LinkedIn', 'Referencia', 'Web', 'EVO'
  createdAt: Date,
  updatedAt: Date,
  convertidoEn: Date           // Cuando se convirtió en cliente
}
```

### 1.4 Colección: `actividades`

```javascript
{
  _id: ObjectId,
  
  actividadId: String,
  clienteId: String,           // A quién le corresponde
  leadId: String,              // O a qué lead
  
  // Tipo de actividad
  tipo: {
    enum: ['Llamada', 'Email', 'Reunión', 'Presentación', 'Demo', 'Contrato Firmado', 'Seguimiento Postventa'],
    default: 'Email'
  },
  
  // Detalles
  descripción: String,
  resultado: String,           // 'Éxito', 'Pendiente seguimiento', 'No interesado'
  
  // Responsable
  responsable: String,         // Email del gerente
  
  // Calendario
  fecha: Date,
  horaInicio: String,          // HH:MM
  horaFin: String,
  recordatorio: Boolean,
  
  // Métricas
  duracion: Number,            // Minutos
  
  // Relación
  fuente: String,              // 'manual', 'EVO', 'calendar_sync'
  
  createdAt: Date,
  updatedAt: Date
}
```

### 1.5 Colección: `membresias`

```javascript
{
  _id: ObjectId,
  
  membresia_id: String,
  clienteId: String,           // Referencia a clientes
  
  // Plan
  plan: {
    nombre: String,            // 'Básico', 'Pro', 'Premium'
    precio: Number,
    moneda: String,
    caracteristicas: [String]
  },
  
  // Período
  fechaInicio: Date,
  fechaVencimiento: Date,
  ciclo: {
    enum: ['Mensual', 'Trimestral', 'Semestral', 'Anual'],
    default: 'Mensual'
  },
  
  // Estado
  estado: {
    enum: ['Activa', 'Vencida', 'Cancelada', 'Suspendida', 'Próxima a Vencer'],
    default: 'Activa'
  },
  
  // Pagos
  pagos: [{
    numero: Number,
    monto: Number,
    fecha: Date,
    estado: String              // 'Pagado', 'Pendiente', 'Fallido'
  }],
  
  // Renovación
  renovacionAutomatica: Boolean,
  proximaRenovacion: Date,
  
  descuentos: [{
    codigo: String,
    descuento: Number,
    aplicado: Boolean
  }],
  
  // Auditoría
  fuente: String,              // 'EVO', 'importación', 'manual'
  createdAt: Date,
  updatedAt: Date,
  syncedAt: Date
}
```

### 1.6 Colección: `syncLog` (Auditoría de sincronizaciones)

```javascript
{
  _id: ObjectId,
  
  syncId: String,
  fuente: String,              // 'EVO', 'W12', 'Excel', 'webhook', 'polling'
  
  // Resultado
  estatus: {
    enum: ['Exitoso', 'Parcial', 'Fallido'],
    default: 'Exitoso'
  },
  
  // Estadísticas
  registosProcesados: Number,
  registosInseridos: Number,
  registosActualizados: Number,
  registosFallidos: Number,
  
  // Detalles
  errores: [{
    registro: String,
    error: String,
    acción: String             // 'reintento', 'ignorar', 'manual'
  }],
  
  // Rendimiento
  iniciado: Date,
  finalizado: Date,
  duracionMs: Number,
  
  // Cambios resultantes
  cambios: {
    clientesNuevos: Number,
    clientesActualizados: Number,
    ventasNuevas: Number,
    leadsNuevos: Number
  },
  
  proximoIntento: Date         // Si falló y hay reintento pendiente
}
```

---

## 2️⃣ ARQUITECTURA TÉCNICA

### 2.1 Stack Recomendado

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  ├─ Configuración → Fuentes de Datos (UI)                  │
│  ├─ Dashboard (leer stats desde API)                        │
│  └─ axios service calls → http://localhost:5000/api/...     │
└────────┬────────────────────────────────────────────────────┘
         │ HTTP/JSON
┌────────▼────────────────────────────────────────────────────┐
│            BACKEND (Node/Express)                            │
│  ├─ POST /api/import/excel                                  │
│  ├─ POST /api/import/csv                                    │
│  ├─ POST /api/sources/db/test & /save                       │
│  ├─ POST /api/sources/api/test & /save                      │
│  ├─ POST /api/webhooks/evo                                  │
│  ├─ POST /api/sync/run (manual)                            │
│  ├─ GET /api/stats/summary                                  │
│  ├─ GET /api/stats/ventas-weekly                            │
│  ├─ GET /api/stats/clientes-estado                          │
│  └─ GET /api/sync/logs                                      │
└────────┬────────────────────────────────────────────────────┘
         │
    ┌────┴────┬──────────┬────────────┐
    │          │          │            │
┌───▼──┐   ┌──▼──┐  ┌────▼─────┐  ┌──▼─────┐
│Mongo │   │Excel│  │ External │  │Webhook │
│  DB  │   │ CSV │  │API (EVO) │  │ Receiver
└──────┘   │    │  └──────────┘  └────────┘
           │    │
           └────┘
           Local
           import

```

### 2.2 Stack Específico

| Capa | Tecnología | Propósito |
|------|-----------|----------|
| **Frontend** | React 18 + Axios | UI de configuración + Dashboard |
| **Backend** | Node.js + Express | API centralizada |
| **BD Principal** | MongoDB | Almacenar datos normalizados |
| **BD Secundaria** | PostgreSQL (opcional) | Si necesitas relaciones complejas |
| **Ingesta Excel/CSV** | exceljs, csv-parser | Parsear y validar archivos |
| **API Calls** | axios (backend) | Consumir EVO/W12 |
| **Webhooks** | Express middleware | Recibir eventos de EVO |
| **Polling** | node-cron | Sincronización incremental |
| **Queues** | Bull para Redis (futuro) | Procesamiento async de sincronizaciones |
| **Validación** | Joi o Zod | Schema validation |
| **Logs** | Winston | Auditoría y debugging |
| **Rate Limiting** | express-rate-limit | Proteger endpoints |

---

## 3️⃣ ENDPOINTS PROPUESTOS

### 3.1 Autenticación (Preliminar)

```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh-token
GET  /api/auth/me
```

### 3.2 Importación de Archivos

```
POST /api/import/excel
  Body: { file: File, mapeo: { encabezado_excel: campo_schema } }
  Response: { registosProcesados, registosInseridos, registosFallidos, errores[] }

POST /api/import/csv
  Body: { file: File, delimitador: ',', mapeo: {...} }
  Response: { id, registosProcesados, registosInseridos, registosFallidos }

POST /api/import/preview
  Body: { file: File, tipo: 'excel'|'csv' }
  Response: { columnas, primerosRegistros }

GET  /api/import/history
  Response: [{ id, archivo, fecha, registos, estatus }]
```

### 3.3 Configuración de Conexiones

```
POST /api/sources/db/test
  Body: { 
    tipo: 'mongodb'|'postgresql',
    connectionString: 'mongodb://...',
    database: 'nombre'
  }
  Response: { conectado: true|false, mensaje, latencia }

POST /api/sources/db/save
  Body: { 
    tipo: 'mongodb',
    connectionString: '***encrypted***',
    nombre: 'Mi BD Principal'
  }
  Response: { id, guardado }

DELETE /api/sources/db/:id
  Response: { eliminado: true }

---

POST /api/sources/api/test
  Body: { 
    baseURL: 'https://api.evo.com',
    headers: { 'Authorization': 'Bearer ***' },
    endpoint: '/clientes',
    metodo: 'GET'
  }
  Response: { conectado: true, status: 200, pruebaResponse: {...} }

POST /api/sources/api/save
  Body: { 
    nombre: 'EVO Sistema',
    baseURL: 'https://api.evo.com',
    headers: { 'Authorization': '***encrypted***' },
    mapeo: { 'eventoId': 'clienteId', 'nombre': 'nombre' }
  }
  Response: { id, guardado }

GET  /api/sources
  Response: [{
    id, nombre, tipo, conectado, ultimaSync, nextSync,
    configuracion: { baseURL, headers, ...}
  }]
```

### 3.4 Sincronización Manual

```
POST /api/sync/run
  Body: { 
    sourceId: 'evo-principal',
    modo: 'full'|'incremental',  // full = todos los registos, incremental = desde syncedAt
    entidades: ['clientes', 'ventas']
  }
  Response: { 
    syncId, estatus: 'iniciando',
    progreso: { clientes: 0, ventas: 0 }
  }

GET  /api/sync/status/:syncId
  Response: { 
    syncId, estatus: 'procesando'|'completado'|'fallido',
    progreso: { clientes: 45, ventas: 10 },
    errores: [],
    estimatedTime: 120
  }

GET  /api/sync/logs
  Query: { sourceId, desde, hasta, limit: 20 }
  Response: [{
    syncId, fuente, estatus, registosProcesados,
    registosInseridos, registosActualizados, registosFallidos,
    iniciado, finalizado, duracionMs
  }]

POST /api/sync/retry/:syncId
  Response: { reintentoIniciado: true }
```

### 3.5 Webhooks (Tiempo Real)

```
POST /api/webhooks/evo
  Headers: { 'X-Signature': '***' }  // Validación de firma
  Body: { 
    evento: 'cliente.creado'|'cliente.actualizado'|'venta.completada',
    timestamp: '2024-02-10T10:30:00Z',
    dato: { eventoId: '123', nombre: 'Acme Corp', ... }
  }
  Response: { procesado: true, syncId: 'webhook-xyz' }

POST /api/webhooks/w12
  { similar al anterior }

POST /api/webhooks/custom
  Body: { fuente: 'stripe'|'zapier', evento: '...', dato: {...} }
```

### 3.6 Estadísticas (Dashboard Real)

```
GET  /api/stats/summary
  Query: { desde: Date, hasta: Date, granularidad: 'dia'|'semana'|'mes' }
  Response: {
    ventas: {
      monto: 45230.50,
      cantidad: 34,
      promedio: 1330.31,
      moneda: 'MXN'
    },
    clientes: {
      activos: 287,
      nuevo: 12,
      porVencer: 8,
      tasaRetención: 92.5
    },
    leads: {
      pendientes: 45,
      encalificación: 12,
      ganados: 5,
      perdidos: 2
    },
    membresías: {
      activas: 287,
      vencidas: 3,
      proximasAVencer7Dias: 8
    }
  }

GET  /api/stats/ventas-weekly
  Query: { desde, hasta }
  Response: [{
    semana: '2024-W06',
    inicioSemana: Date,
    monto: 12500,
    cantidad: 10,
    promedioPorventa: 1250
  }]

GET  /api/stats/clientes-estado
  Response: [{
    estado: 'Activo'|'Riesgo'|'Inactivo'|'Prospecto',
    cantidad: 150,
    porcentaje: 52,
    montoGastado: 250000
  }]

GET  /api/stats/churn-analysis
  Query: { periodo: '30'|'60'|'90' }
  Response: {
    clientesPerdidos: 3,
    tasaChurn: 1.04,
    razonesComunes: [{
      razon: 'Insatisfacción con servicio',
      cantidad: 2,
      porcentaje: 66.7
    }]
  }

GET  /api/stats/membresias-proximasVencer
  Query: { dias: 7, estado: 'activa'|'todos' }
  Response: [{
    clienteId, nombreCliente, membresia, diasParaVencer,
    fechaVencimiento, montoRenovacion
  }]
```

### 3.7 Configuración de Sincronización

```
POST /api/config/sync-schedule
  Body: { 
    sourceId: 'evo-principal',
    modo: 'webhook'|'polling',
    pollingInterval: 300,  // segundos
    entidades: ['clientes', 'ventas']
  }
  Response: { guardado: true, proximaSync: Date }

GET  /api/config/sync-schedule
  Response: [{
    sourceId, modo, pollingInterval, entidades, 
    estadoActual: 'activo'|'pausado', proximaSync
  }]

PATCH /api/config/sync-schedule/:sourceId
  Body: { estado: 'activo'|'pausado' }

DELETE /api/config/sync-schedule/:sourceId
```

---

## 4️⃣ FLUJOS DE SINCRONIZACIÓN

### 4.1 Sincronización por Webhook (Tiempo Real)

```
┌─────────────┐
│  EVO/W12    │
└──────┬──────┘
       │ [evento cliente.actualizado]
       │ POST /api/webhooks/evo
       │
┌──────▼──────────────────────────┐
│  Backend - Webhook Handler       │
│  1. Validar firma X-Signature    │
│  2. Verificar timestamp (no old) │
│  3. Extraer datos                │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│  Data Normalizer                 │
│  - Mapear campos (EVO → Schema)  │
│  - Validar datos                 │
│  - Detectar duplicados           │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│  Database Layer                  │
│  1. Check if exists (clienteId)  │
│  2. If yes: UPDATE with merge    │
│  3. If no: INSERT new            │
│  4. Log en syncLog               │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│  Response to EVO                 │
│  { procesado: true, syncId }     │
└──────────────────────────────────┘
```

**Ventajas**: Datos siempre frescos, latencia < 1s  
**Desventajas**: Depende de que EVO tenga webhooks configurados

---

### 4.2 Sincronización por Polling (Incremental)

```
Cada X minutos (ej. 15 min):

┌──────────────────────────────────┐
│  Scheduler (node-cron)           │
│  Trigger: */15 * * * *           │
└──────┬───────────────────────────┘
       │
┌──────▼──────────────────────────┐
│  Fetch desde EVO/W12             │
│  GET /clientes?updatedAt=>{last} │
│  - Traer registros modificados   │
│    desde última sincronización   │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│  Process & Normalize             │
│  (igual que webhook)             │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│  Upsert (Insert + Update)        │
│  - Si existe por ID: UPDATE      │
│  - Si no existe: INSERT          │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│  Registrar en syncLog            │
│  + próxima ejecución             │
└──────┬───────────────────────────┘
```

**Ventajas**: No requiere webhooks, más control  
**Desventajas**: Latencia de hasta X minutos

---

### 4.3 Manejo de Duplicados e Idempotencia

```javascript
// Buscar por múltiples claves
{
  $or: [
    { eventoId: dato.eventoId },      // Si viene de EVO
    { email: dato.email },             // Si viene de otro lado
    { rfc: dato.rfc }                  // Identificador único
  ]
}

// Si encuentra uno:
objeto_existente = encontrado
objeto_existente.campos = merge(objeto_existente, nuevosDatos)
objeto_existente.updatedAt = ahora
objeto_existente.syncedAt = ahora
objeto_existente.audit.cambiosRecientes.push({
  campo, valorAnterior, valorNuevo, fecha
})
guardar()

// Si no encuentra:
nuevoObjeto.createdAt = ahora
nuevoObjeto.updatedAt = ahora
nuevoObjeto.syncedAt = ahora
guardar()

// Marcar que fue procesado (para reintento)
syncLog.registosProcessados++
```

**Estrategia**: 
- Usar `eventoId` como clave principal (si existe)
- Fallback a `email` + `empresa` (fallback 2)
- Fallback a `rfc` (fallback 3)
- Evitar INSERT duplicados con UNIQUE constraints en MongoDB

---

## 5️⃣ MAPEO DE CAMPOS (Ejemplos)

### 5.1 De Excel → Schema

```json
{
  "excel": {
    "Nom Cliente": "clientes.nombre",
    "Correo": "clientes.email",
    "Teléfono": "clientes.telefono",
    "Empresa": "clientes.empresa",
    "RFC": "clientes.rfc",
    "Estado": "clientes.estado",
    "Fecha Vencimiento": "clientes.membresia.fechaVencimiento",
    "Plan": "clientes.membresia.tipo",
    "Monto Gastado": "clientes.financiero.totalGastado"
  }
}
```

### 5.2 De EVO API → Schema

```json
{
  "evo": {
    "id": "clientes.eventoId",
    "razonSocial": "clientes.nombre",
    "email": "clientes.email",
    "telefonoContacto": "clientes.telefono",
    "rfc": "clientes.rfc",
    "statusCliente": "clientes.estado",
    "subscripcion": {
      "fechaInicio": "clientes.membresia.fechaInicio",
      "fechaProximoVencimiento": "clientes.membresia.fechaVencimiento",
      "plan": "clientes.membresia.tipo"
    }
  }
}
```

### 5.3 De W12 API → Schema

```json
{
  "w12": {
    "id_contacto": "clientes.clienteId",
    "nombre_completo": "clientes.nombre",
    "email_principal": "clientes.email",
    "telefono_celular": "clientes.telefono",
    "nombre_empresa": "clientes.empresa",
    "lista_ventas": "ventas[]"  // Array
  }
}
```

---

## 6️⃣ ESTRATEGIA DE SINCRONIZACIÓN BIDIRECCIONAL

### 6.1 Qué se puede escribir a EVO (Outbound)

| Campo | Permite Write | Estrategia |
|-------|:-------------:|-----------|
| `estado` | ✅ | Actualizar cuando se cambia en Dashboard → POST /evo/clientes/123 |
| `datos contacto` | ✅ | Si cambió email/teléfono → PATCH /evo/clientes/123 |
| `membresia.estado` | ✅ | Si se cancela/renueva → POST /evo/suscripcion/update |
| `membresia.plan` | ⚠️ | Solo si hay acuerdo previo con EVO |
| `timestamp` | ❌ | Nunca escribir (generado en fuente) |
| `pasado histórico` | ❌ | Nunca modificar (auditoría) |

### 6.2 Cambios en Dashboard que sincronizan a EVO

```
Evento en Dashboard               Acción en Backend
─────────────────────────────────────────────────────
Cliente marca "Inactivo"    →  POST /evo/api/clientes/123/estado
                                { estado: 'inactivo' }

Cliente renueva membresía   →  POST /evo/api/suscripcion/renovar
                                { eventoId, plan, ciclo }

Se registra nueva venta     →  POST /evo/api/ventas
                                { eventoId, monto, concepto }
```

### 6.3 Validaciones Anti-conflicto

```javascript
// Antes de escribir a EVO
if (datoLocal.syncedAt < datoRemoto.updatedAt) {
  // Dato remoto es más nuevo → RECHAZAR escritura
  throw new Error('Dato ha sido actualizado en EVO');
}

// Usar versionado
if (datoLocal.version !== datoRemoto.version) {
  // Versión diferente → CONFLICTO
  // Opción: merge automático o notificar usuario
}
```

---

## 7️⃣ MANEJO DE ERRORES Y REINTENTOS

### 7.1 Tipos de Error

| Error | Tipo | Reintento | Acción |
|-------|------|:---------:|--------|
| Invalid JSON | Parse | ❌ | Loguear, ignorar, notificar |
| Campo requerido missing | Validación | ❌ | Loguear en syncLog, notificar admin |
| API Rate Limit (429) | Transient | ✅ | Reintento exponencial (5s, 10s, 20s) |
| Connection Timeout | Transient | ✅ | Reintento (hasta 3 veces) |
| BD Constraint Violation | Datos | ❌ | Inspeccionar duplicado, merge |
| Token EVO expirado | Auth | ⚠️ | Refresh token, reintento |

### 7.2 Estrategia de Reintento

```javascript
// Exponential backoff
const maxRetries = 5;
const baseDelay = 1000;  // 1s

async function retryableSync(fn) {
  for (let intento = 0; intento < maxRetries; intento++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error)) throw error;
      
      if (intento < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, intento);
        await sleep(delay);
      } else {
        // Último reintento falló
        await logFailedSync(error);
        notifyAdmin();
        throw error;
      }
    }
  }
}
```

---

## 8️⃣ LOGS Y AUDITORÍA

### 8.1 Información a Registrar

```javascript
// Cada sincronización
{
  syncId: uuid(),
  fuente: 'EVO',
  tipo: 'webhook'|'polling',
  iniciado: Date.now(),
  
  // Procesamiento
  registosRecibidos: 100,
  registosValidos: 95,
  registosConerrores: 5,
  
  // Cambios en BD
  inserciones: 10,
  actualizaciones: 85,
  
  // Errores detallados
  errores: [
    {
      registro: 'cliente_123',
      error: 'Email inválido',
      acción: 'ignorado'
    }
  ],
  
  finalizado: Date.now(),
  duracionMs: 1200,
  estatus: 'exitoso'|'parcial'|'fallido'
}

// En audit trail de cada registro
cliente.audit.cambiosRecientes = [
  {
    syncId: 'webhook_xyz',
    campo: 'estado',
    valorAnterior: 'Prospecto',
    valorNuevo: 'Cliente Activo',
    fecha: Date.now(),
    fuente: 'EVO'
  }
]
```

---

## 9️⃣ CÁLCULOS DE MÉTRICAS

### 9.1 Tasa de Retención

```javascript
// Retención = (Clientes activos fin período - Nuevos en período) / Clientes activos inicio período
//           = Clientes que continuaron / Clientes que podrían haber ido

const calcularRetención = (período = 'mensual') => {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  
  const clientesInicio = await Cliente.find({
    createdAt: { $lt: inicio }
  });
  
  const clientesNuevos = await Cliente.find({
    createdAt: { $gte: inicio, $lt: fin }
  });
  
  const clientesActivos = await Cliente.find({
    estado: 'Cliente Activo',
    updatedAt: { $lt: fin }
  });
  
  const clientesContinuos = clientesActivos.filter(c => 
    !clientesNuevos.some(cn => cn._id === c._id)
  );
  
  const tasaRetención = (clientesContinuos.length / clientesInicio.length) * 100;
  
  return tasaRetención;  // %
};
```

### 9.2 Clientes próximos a vencer

```javascript
const calcularProximasVencer = (días = 7) => {
  const hoy = new Date();
  const venceEn = new Date(hoy.getTime() + días * 24 * 60 * 60 * 1000);
  
  return await Cliente.find({
    'membresia.estado': 'Activa',
    'membresia.fechaVencimiento': { $lte: venceEn }
  }).select('nombre email membresia');
};
```

### 9.3 Ventas por semana

```javascript
const ventasPorSemana = async (desde, hasta) => {
  return await Venta.aggregate([
    {
      $match: {
        fecha: { $gte: desde, $lte: hasta },
        estatus: 'Completada'
      }
    },
    {
      $group: {
        _id: { $week: '$fecha' },
        semana: { $first: { $week: '$fecha' } },
        monto: { $sum: '$monto' },
        cantidad: { $sum: 1 },
        promedio: { $avg: '$monto' }
      }
    },
    { $sort: { semana: 1 } }
  ]);
};
```

---

## 🔟 CASOS DE USO PRÁCTICOS

### Caso 1: Importar Excel histórico

```
1. Usuario sube Cliente_Histórico_2024.xlsx
2. Backend:
   a. Lee archivo
   b. Extrae columnas
   c. Mapea: "Nombre" → cliente.nombre, etc
   d. Valida datos
   e. Busca duplicados por RFC/Email
   f. Inserta/actualiza
3. Resultado: 500 clientes importados, 10 ignorados (duplicados)
4. Dashboard refresh automático
```

### Caso 2: Conectarse a EVO y sincronizar

```
1. Usuario en Configuración → APIs
2. Ingresa: Base URL + Bearer Token
3. Backend hace test: GET /evo/api/clientes (1 registro)
4. Si OK: Guarda credenciales (encrypted)
5. Usuario activa: "Sincronización automática cada 15 min"
6. Backend activa cron job que cada 15 min:
   a. GET /evo/api/clientes?updatedAt=>{last}
   b. Procesa respuesta
   c. Inserta/actualiza en MongoDB
   d. Loguea resultado
7. Dashboard usa datos en vivo
```

### Caso 3: Webhook tiempo real desde EVO

```
1. User configura en EVO: Webhook → https://dashboard.com/api/webhooks/evo
2. EVO crea cliente nuevo
3. POST /api/webhooks/evo
   { evento: 'cliente.creado', dato: {...} }
4. Backend recibe:
   a. Valida firma
   b. Normaliza dato
   c. Inserta en 200ms
5. Frontend (via polling stats) muestra Cliente nuevo al cabo de 5-10s
```

---

## ✅ PRÓXIMAS FASES

### Fase 1: Schema + Backend setup
- [ ] Definir MongoDB collections (✅ Done luego)
- [ ] Setup Node/Express
- [ ] Crear endpoints básicos

### Fase 2: Importación
- [ ] Excel/CSV parser
- [ ] Mapeo de campos
- [ ] Validación

### Fase 3: APIs externas
- [ ] Integración EVO
- [ ] Integración W12
- [ ] Webhooks receiver

### Fase 4: Sincronización
- [ ] Polling incremental
- [ ] Webhook handler
- [ ] Reintento automático

### Fase 5: UI
- [ ] Configuración → Fuentes de Datos
- [ ] Dashboard con datos reales
- [ ] Logs viewer

### Fase 6: Testing & Deploy
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Docker setup
- [ ] Deployment

---

## 📚 REFERENCIAS Y PRÓXIMAS DECISIONES

**Preguntas para refinar**:

1. ¿EVO y W12 tienen webhooks disponibles? ¿O solo APIs REST?
2. ¿Qué campos específicos necesitas sincronizar de EVO?
3. ¿Necesitas escribir cambios desde Dashboard → EVO?
4. ¿Máxima latencia aceptable para datos? (1s = webhook, 15min = polling)
5. ¿Ya tienes MongoDB/PostgreSQL instalado, o creamos container?
6. ¿Necesitas histórico de cambios (audit trail) completo?

