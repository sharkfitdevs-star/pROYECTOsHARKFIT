# 📚 API REST - DOCUMENTACIÓN COMPLETA

## 🔐 Autenticación

Todos los endpoints requieren JWT token excepto `/api/usuarios/login/`

```bash
# 1. Login
POST /api/usuarios/login/
{
  "username": "admin",
  "password": "admin123"
}

# Response
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "usuario": { ... }
}

# 2. Usar token en headers
Authorization: Bearer <access_token>
```

---

## 👥 CLIENTES

### Listado paginado
```
GET /api/clientes/
Parámetros:
  - page=1 (número de página)
  - page_size=50 (items por página)
  - search=juan (búsqueda en nombre/email)
  - estado=activo (filtrar por estado)
  - ordering=-created_at (ordenar)

Response: { count, next, previous, results: [...] }
```

### Obtener uno
```
GET /api/clientes/{id}/

Response: {
  id, nombre, email, telefono, rut, empresa, estado,
  direccion, ciudad, provincia, codigo_postal,
  contacto_nombre, contacto_email, contacto_telefono,
  fuente, presupuesto_estimado, frecuencia_pago,
  notas, asignado_a, cantidad_ventas, cantidad_alertas,
  created_at, updated_at, fecha_primera_venta,
  es_activo, es_prospecto
}
```

### Crear
```
POST /api/clientes/
{
  "nombre": "string (required)",
  "email": "string@format.com (required, unique)",
  "telefono": "string",
  "rut": "string (formato: XX.XXX.XXX-K)",
  "empresa": "string",
  "estado": "prospecto|activo|suspendido|baja",
  "direccion": "string",
  "ciudad": "string",
  "provincia": "string",
  "codigo_postal": "string",
  "contacto_nombre": "string",
  "contacto_email": "string@format.com",
  "contacto_telefono": "string",
  "fuente": "web|referencia|agencia|feria",
  "presupuesto_estimado": 15000.00,
  "frecuencia_pago": "mensual|trimestral|semestral|anual",
  "notas": "string",
  "asignado_a": 3 (user_id)
}
```

### Actualizar
```
PUT /api/clientes/{id}/
PATCH /api/clientes/{id}/  # Actualización parcial

Envía los campos que quieras actualizar (igual a crear)
```

### Eliminar
```
DELETE /api/clientes/{id}/

Validación: Solo si no tiene ventas en proceso
```

### Acciones custom

#### Búsqueda avanzada
```
GET /api/clientes/buscar/?q=juan
Busca en: nombre, email, teléfono, RUT

Response: [cliente1, cliente2, ...]
```

#### Resumen por estado
```
GET /api/clientes/por_estado/

Response: {
  "prospecto": 15,
  "activo": 42,
  "suspendido": 5,
  "baja": 3
}
```

#### Cambiar estado
```
POST /api/clientes/{id}/cambiar_estado/
{
  "estado": "activo|suspendido|baja"
}
```

#### Asignar a usuario
```
POST /api/clientes/{id}/asignar_a/
{
  "usuario_id": 5
}

// O desasignar
{
  "usuario_id": null
}
```

#### Exportar a CSV
```
GET /api/clientes/exportar/?formato=csv

Headers: Content-Disposition: attachment; filename="clientes.csv"
Body: CSV con columnas: ID, Nombre, Email, Teléfono, RUT, Empresa, ...
```

---

## 💰 VENTAS

### Listado
```
GET /api/ventas/
Parámetros:
  - page=1
  - search=VTA-2024 (búsqueda en número, cliente, descripción)
  - estado=completada|en_proceso|nueva|cancelada|devuelta
  - tipo=nueva_afiliacion|renovacion|upgrade|downgrade|reactivacion
  - vendedor={id} (filtrar por vendedor)
  - cliente={id} (filtrar por cliente)
  - ordering=-fecha_venta
```

### Crear venta
```
POST /api/ventas/
{
  "numero_venta": "VTA-2024-001" (required, unique),
  "cliente": 5 (required, cliente_id),
  "tipo": "nueva_afiliacion|renovacion|upgrade|downgrade|reactivacion",
  "estado": "nueva|en_proceso|completada|cancelada|devuelta",
  "monto_total": 50000.00 (required, > 0),
  "monto_descuento": 5000.00,
  "monto_neto": 45000.00 (calculated),
  "moneda": "ARS|USD|EUR",
  "forma_pago": "efectivo|transferencia|tarjeta_credito|cheque|mp",
  "cuotas": 6,
  "fecha_vencimiento_pago": "2024-02-28",
  "vendedor": 3 (user_id, optional),
  "descripcion": "texto",
  "notas_internas": "texto"
}
```

### Cambiar estado
```
POST /api/ventas/{id}/cambiar_estado/
{
  "estado": "nueva|en_proceso|completada|cancelada|devuelta"
}
```

### Marcar completada
```
POST /api/ventas/{id}/marcar_completada/

Automáticamente:
- Cambia estado a "completada"
- Establece fecha_entrega a hoy
```

### Resumen por estado
```
GET /api/ventas/por_estado/

Response: {
  "nueva": 10,
  "en_proceso": 25,
  "completada": 150,
  "cancelada": 5,
  "devuelta": 2
}
```

### Resumen del mes
```
GET /api/ventas/resumen_mes/

Response: {
  "mes": "February 2024",
  "total_monto": "125000.00",
  "cantidad_ventas": 15,
  "ventas_completadas": 12,
  "porcentaje_completadas": 80
}
```

### Por vendedor
```
GET /api/ventas/por_vendedor/

Response: [
  {
    "vendedor__id": 1,
    "vendedor__first_name": "Juan",
    "vendedor__last_name": "Pérez",
    "total_ventas": 45,
    "monto_total": "525000.00"
  },
  ...
]
```

### Exportar
```
GET /api/ventas/exportar/?formato=csv

CSV con: ID, Número Venta, Cliente, Tipo, Estado, Monto, Moneda, Fecha, Vendedor
```

---

## 📅 AGENDAMIENTOS

### Listado
```
GET /api/agendamientos/
Parámetros:
  - estado=pendiente|confirmada|completada|cancelada|reprogramada
  - tipo=reunion|llamada|visita|demostracion|seguimiento
  - cliente={id}
  - responsable={id}
  - es_virtual=true|false
  - search=titulo|cliente
  - ordering=fecha_hora_inicio
```

### Crear
```
POST /api/agendamientos/
{
  "cliente": 5 (required, cliente_id),
  "tipo": "reunion|llamada|visita|demostracion|seguimiento",
  "estado": "pendiente|confirmada|completada|cancelada|reprogramada",
  "titulo": "Reunión con Acme Corp" (required),
  "descripcion": "Discutir propuesta",
  "fecha_hora_inicio": "2024-02-15T14:30:00Z" (required),
  "fecha_hora_fin": "2024-02-15T15:30:00Z" (required, > inicio),
  "duracion_minutos": 60,
  "ubicacion": "Oficina Centro",
  "es_virtual": false,
  "enlace_reunion": "https://meet.google.com/xxx",
  "responsable": 2 (user_id),
  "participantes_email": "juan@email.com, maria@email.com",
  "recordatorio_minutos_antes": 15
}
```

### Próximas citas (7 días)
```
GET /api/agendamientos/proximas/

Response: [
  {
    id, cliente_nombre, titulo, tipo, estado,
    fecha_hora_inicio, responsable_nombre
  },
  ...
]
```

### Citas de hoy
```
GET /api/agendamientos/hoy/

Response: [...]
```

### Calendario
```
GET /api/agendamientos/calendario/?year=2024&month=2

Response: {
  "mes": "February 2024",
  "dias": {
    "2024-02-15": [
      {
        "id": 1,
        "titulo": "Reunión ACME",
        "hora": "14:30",
        "cliente": "Acme Corp",
        "estado": "confirmada"
      },
      ...
    ],
    ...
  }
}
```

### Confirmar cita
```
POST /api/agendamientos/{id}/confirmar/

Cambia estado a "confirmada"
```

### Completar cita
```
POST /api/agendamientos/{id}/completar/
{
  "resultado": "Se discutieron los puntos X, Y, Z"
}

Cambia estado a "completada"
```

### Cancelar cita
```
POST /api/agendamientos/{id}/cancelar/
{
  "razon_cancelacion": "Cliente no disponible"
}

Cambia estado a "cancelada"
```

---

## 🔔 ALERTAS

### Listado
```
GET /api/alertas/
Parámetros:
  - estado=pendiente|en_proceso|resuelta|ignorada
  - tipo=cliente_nuevo|venta_completada|cita_proxima|deuda_alta|...
  - prioridad=baja|media|alta|critica
  - cliente={id}
  - asignado_a={id}
  - search=titulo|descripcion
  - ordering=-created_at
```

### Crear
```
POST /api/alertas/
{
  "tipo": "cliente_nuevo|venta_completada|cita_proxima|deuda_alta|..." (required),
  "prioridad": "baja|media|alta|critica",
  "estado": "pendiente|en_proceso|resuelta|ignorada",
  "cliente": 5 (opcional, cliente_id),
  "titulo": "Nueva venta > $50k" (required),
  "descripcion": "Se completó venta importante" (required),
  "datos_adicionales": {
    "monto": 55000,
    "vendedor": "Juan Pérez"
  },
  "fecha_vencimiento": "2024-02-20T17:00:00Z"
}
```

### Alertas pendientes
```
GET /api/alertas/pendientes/

Response: [
  {
    id, tipo, prioridad, cliente_nombre,
    titulo, created_at
  },
  ...
]
```

### Alertas críticas
```
GET /api/alertas/criticas/

Response: [alertas con prioridad=critica y estado!=resuelta]
```

### Por prioridad
```
GET /api/alertas/por_prioridad/

Response: {
  "critica": 2,
  "alta": 8,
  "media": 15,
  "baja": 5
}
```

### Por tipo
```
GET /api/alertas/por_tipo/

Response: [
  { "tipo": "cliente_nuevo", "cantidad": 5 },
  { "tipo": "venta_completada", "cantidad": 12 },
  ...
]
```

### Resolver alerta
```
POST /api/alertas/{id}/resolver/
{
  "notas_resolucion": "Se contactó al cliente y se resolvió"
}

Cambia a estado="resuelta"
Establece fecha_resolucion = ahora
Establece resuelto_por = usuario actual
```

### Asignar a usuario
```
POST /api/alertas/{id}/asignar/
{
  "usuario_id": 3
}
```

### Marcar notificada
```
POST /api/alertas/{id}/notificar/
{
  "canales": "email, whatsapp, slack"
}

Cambia notificado=true
```

### Resumen alertas
```
GET /api/alertas/resumen/

Response: {
  "total_alertas": 50,
  "alertas_pendientes": 18,
  "alertas_criticas": 2,
  "tasa_resolucion": 64
}
```

---

## 👤 USUARIOS

### Login JWT
```
POST /api/usuarios/login/
{
  "username": "admin",
  "password": "admin123"
}

Response: {
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "usuario": {
    id, username, email, first_name, last_name,
    is_active, is_staff, date_joined,
    perfil: { rol, estado, ultimo_acceso, ... }
  }
}
```

### Obtener usuario actual
```
GET /api/usuarios/me/

Response: Datos del usuario autenticado
```

### Listar usuarios
```
GET /api/usuarios/
Parámetros:
  - search=juan (username, email, nombre)
  - ordering=-date_joined
```

### Crear usuario
```
POST /api/usuarios/
{
  "username": "juanperez" (required, unique),
  "email": "juan@email.com" (required, unique),
  "first_name": "Juan",
  "last_name": "Pérez",
  "password": "ContraseñaSegura123!" (required, min 8 chars),
  "password_confirm": "ContraseñaSegura123!" (required, debe coincidir)
}
```

### Cambiar contraseña
```
POST /api/usuarios/{id}/cambiar_password/
{
  "old_password": "actual",
  "new_password": "nueva123",
  "new_password_confirm": "nueva123"
}
```

### Actualizar perfil
```
PUT /api/usuarios/{id}/actualizar_perfil/
PATCH /api/usuarios/{id}/actualizar_perfil/
{
  "email": "nuevo@email.com",
  "first_name": "Juan",
  "last_name": "Pérez"
}
```

### Usuarios activos
```
GET /api/usuarios/activos/

Response: [usuarios con is_active=true]
```

### Por rol
```
GET /api/usuarios/por_rol/

Response: [
  { "rol": "admin", "cantidad": 1 },
  { "rol": "gerente", "cantidad": 2 },
  { "rol": "vendedor", "cantidad": 8 },
  ...
]
```

---

## 📊 REPORTES

### Dashboard general
```
GET /api/reportes/dashboard_general/

Response: {
  "clientes": {
    "total": 100,
    "activos": 75,
    "nuevos_mes": 12,
    "tasa_conversion": 75
  },
  "ventas": {
    "total": 250,
    "completadas": 200,
    "monto_mes": "525000.00",
    "promedio_venta": "26250.00"
  },
  "citas": {
    "pendientes": 15
  },
  "alertas": {
    "pendientes": 8,
    "criticas": 1
  }
}
```

### Ventas por vendedor
```
GET /api/reportes/ventas_por_vendedor/

Response: [
  {
    "vendedor__id": 1,
    "vendedor__first_name": "Juan",
    "total_ventas": 45,
    "monto_total": "525000.00",
    "promedio_venta": "11666.67",
    "completadas": 40,
    "tasa_completacion": 88.89
  },
  ...
]
```

### Ventas por tipo
```
GET /api/reportes/ventas_por_tipo/

Response: [
  {
    "tipo": "nueva_afiliacion",
    "cantidad": 100,
    "monto_total": "1500000.00",
    "completadas": 85
  },
  ...
]
```

### Crecimiento clientes
```
GET /api/reportes/crecimiento_clientes/

Response: {
  "2024-01": {
    "nuevos": 15,
    "total_acumulado": 85
  },
  "2024-02": {
    "nuevos": 12,
    "total_acumulado": 97
  },
  ...
}
```

### Efectividad alertas
```
GET /api/reportes/efectividad_alertas/

Response: {
  "por_tipo": [
    {
      "tipo": "cliente_nuevo",
      "total": 20,
      "resueltas": 18,
      "tasa_resolucion": 90
    },
    ...
  ],
  "tiempo_promedio_resolucion_horas": 4.5,
  "alertas_criticas_resueltas": 12
}
```

### Forecast ventas
```
GET /api/reportes/forecast_ventas/

Response: {
  "historial_6_meses": {
    "2023-09": 450000,
    "2023-10": 495000,
    "2023-11": 525000,
    "2023-12": 580000,
    "2024-01": 520000,
    "2024-02": 550000
  },
  "promedio_mensual": 520000,
  "proyeccion_mes_siguiente": 546000
}
```

### Clientes en riesgo
```
GET /api/reportes/clientes_en_riesgo/

Response: {
  "total_en_riesgo": 8,
  "clientes": [
    {
      "id": 5,
      "nombre": "Acme Corp",
      "email": "contacto@acme.com",
      "dias_sin_contacto": 95,
      "asignado_a": "Juan Pérez"
    },
    ...
  ]
}
```

### Exportar reporte
```
GET /api/reportes/exportar/?formato=excel
GET /api/reportes/exportar/?formato=pdf

Response: archivo descargable
```

---

## 🔍 FILTROS Y BÚSQUEDA (Aplicables a todos los listados)

### Paginación
```
?page=2&page_size=20
```

### Búsqueda
```
?search=juan
Busca en campos configurados por ViewSet
```

### Filtrado
```
?estado=activo&tipo=nueva_afiliacion
Filtra por campos configurados
```

### Ordenamiento
```
?ordering=-created_at (descendente)
?ordering=nombre (ascendente)

Ordena por campos configurados
```

### Combinado
```
?page=2&search=juan&estado=activo&ordering=-created_at
```

---

## ❌ CÓDIGOS DE ERROR

### 200 OK
Solicitud exitosa

### 201 Created
Recurso creado exitosamente

### 204 No Content
Solicitud exitosa, sin contenido (DELETE)

### 400 Bad Request
Datos inválidos
```json
{
  "email": ["Already exists"],
  "monto_total": ["Must be > 0"]
}
```

### 401 Unauthorized
No autenticado o token inválido
```json
{
  "detail": "Authentication credentials were not provided"
}
```

### 403 Forbidden
No tiene permisos para esta acción

### 404 Not Found
Recurso no existe

### 409 Conflict
Conflicto (ej: numero_venta duplicado)

### 500 Internal Server Error
Error del servidor

---

## 📝 EJEMPLO COMPLETO: Crear cliente

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/usuarios/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.access')

# 2. Crear cliente
curl -X POST http://localhost:8000/api/clientes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Tech Solutions SA",
    "email": "contacto@techsolutions.com",
    "telefono": "+54 11 1234-5678",
    "empresa": "Tech Solutions SA",
    "estado": "prospecto",
    "fuente": "web"
  }' | jq '.'

# 3. Listar clientes
curl -X GET http://localhost:8000/api/clientes/ \
  -H "Authorization: Bearer $TOKEN" | jq '.results[0:2]'

# 4. Crear venta para ese cliente
curl -X POST http://localhost:8000/api/ventas/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "numero_venta": "VTA-2024-001",
    "cliente": 1,
    "monto_total": 25000,
    "monto_neto": 25000,
    "tipo": "nueva_afiliacion"
  }' | jq '.'

# 5. Ver resumen de ventas
curl -X GET http://localhost:8000/api/reportes/dashboard_general/ \
  -H "Authorization: Bearer $TOKEN" | jq '.ventas'
```

---

**Última actualización:** February 2024  
**Status:** Production Ready  
**Versión:** 3.0 (Stage 3 Completado)
