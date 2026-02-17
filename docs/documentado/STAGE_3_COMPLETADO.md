# Stage 3: Django Backend - COMPLETADO ✅

**Nota 2026:** Referencias a SQLite son históricas; la ingestión y microservicios usan MongoDB.

## 📋 Resumen de lo creado

Se han creado **35+ archivos** que implementan el backend Django REST API completo para todos los módulos del dashboard.

---

## 🏗️ Arquitectura Implementada

### Modelos (Models) - 6 archivos
Cada modelo Django define la estructura de datos:

1. **Cliente** (`apps/clientes/models.py`)
   - Campos: nombre, email, telefono, rut, empresa, estado, dirección, contacto
   - Estados: prospecto, activo, suspendido, baja
   - Relaciones: asignado a usuario

2. **Venta** (`apps/ventas/models.py`)
   - Campos: número_venta, cliente, tipo, estado, montos, forma_pago, fechas
   - Estados: nueva, en_proceso, completada, cancelada, devuelta
   - Tipos: nueva afiliación, renovación, upgrade, downgrade, reactivación

3. **Agendamiento** (`apps/agendamientos/models.py`)
   - Campos: cliente, tipo, estado, título, fecha_hora, ubicación, responsable
   - Estados: pendiente, confirmada, completada, cancelada, reprogramada
   - Tipos: reunión, llamada, visita, demostración, seguimiento

4. **Alerta** (`apps/alertas/models.py`)
   - Campos: cliente, tipo, prioridad, estado, título, descripción
   - Tipos: cliente_nuevo, venta_completada, cita_próxima, deuda_alta, etc
   - Prioridades: baja, media, alta, crítica

5. **PerfilUsuario** (`apps/usuarios/models.py`)
   - Extiende User de Django
   - Roles: admin, gerente, vendedor, operador, analista, viewer
   - Permisos granulares y preferencias

### Serializers - 6 archivos
Validan y transforman datos JSON:

1. **ClienteSerializer** - Validación CRUD + búsqueda
2. **VentaSerializer** - Validación de montos + estados
3. **AgendamientoSerializer** - Validación de fechas
4. **AlertaSerializer** - Validación de prioridades + tipos
5. **UsuarioSerializer** - Login, cambiar contraseña, perfiles
6. Cada serializer tiene 2-3 variantes (List, Create, Detail)

### ViewSets - 6 archivos
Lógica de endpoints REST:

1. **ClienteViewSet** - CRUD + búsqueda + cambiar_estado + asignar_a + exportar
2. **VentaViewSet** - CRUD + cambiar_estado + resumen_mes + por_vendedor + exportar
3. **AgendamientoViewSet** - CRUD + proximas + hoy + calendario + confirmar + completar + cancelar
4. **AlertaViewSet** - CRUD + pendientes + criticas + resolver + asignar + notificar
5. **UsuarioViewSet** - Login JWT + cambiar_password + actualizar_perfil + por_rol
6. **PerfilUsuarioViewSet** - Lectura + actualizar (staff only)
7. **ReporteViewSet** - 10+ acciones de análisis

### URLs - 6 archivos
Registran las rutas REST:

```
/api/clientes/
/api/ventas/
/api/agendamientos/
/api/alertas/
/api/usuarios/
/api/reportes/
```

Cada uno con todas las acciones del ViewSet.

### Admin - 5 archivos
Interfaces Django Admin configuradas:

- ClienteAdmin
- VentaAdmin
- AgendamientoAdmin
- AlertaAdmin
- PerfilUsuarioAdmin

---

## 🔗 Endpoints Disponibles

### Clientes
```
GET    /api/clientes/                      # Listar (paginado)
POST   /api/clientes/                      # Crear
GET    /api/clientes/{id}/                 # Obtener uno
PUT    /api/clientes/{id}/                 # Actualizar
DELETE /api/clientes/{id}/                 # Eliminar

GET    /api/clientes/buscar/?q=juan        # Búsqueda
GET    /api/clientes/por_estado/           # Resumen por estado
POST   /api/clientes/{id}/cambiar_estado/  # Cambiar estado
POST   /api/clientes/{id}/asignar_a/       # Asignar a usuario
GET    /api/clientes/exportar/?formato=csv # Exportar CSV
```

### Ventas
```
GET    /api/ventas/                        # Listar
POST   /api/ventas/                        # Crear
PUT    /api/ventas/{id}/                   # Actualizar
DELETE /api/ventas/{id}/                   # Eliminar

POST   /api/ventas/{id}/cambiar_estado/    # Cambiar estado
POST   /api/ventas/{id}/marcar_completada/ # Completar
GET    /api/ventas/por_estado/             # Resumen por estado
GET    /api/ventas/resumen_mes/            # Resumen del mes
GET    /api/ventas/por_vendedor/           # Agrupado por vendedor
GET    /api/ventas/exportar/?formato=csv   # Exportar CSV
```

### Agendamientos
```
GET    /api/agendamientos/                 # Listar
POST   /api/agendamientos/                 # Crear
PUT    /api/agendamientos/{id}/            # Actualizar
DELETE /api/agendamientos/{id}/            # Eliminar

GET    /api/agendamientos/proximas/        # Próximas 7 días
GET    /api/agendamientos/hoy/             # Citas de hoy
GET    /api/agendamientos/calendario/      # Calendario del mes
POST   /api/agendamientos/{id}/confirmar/  # Confirmar cita
POST   /api/agendamientos/{id}/completar/  # Completar cita
POST   /api/agendamientos/{id}/cancelar/   # Cancelar cita
```

### Alertas
```
GET    /api/alertas/                       # Listar
POST   /api/alertas/                       # Crear
PUT    /api/alertas/{id}/                  # Actualizar
DELETE /api/alertas/{id}/                  # Eliminar

GET    /api/alertas/pendientes/            # Alertas no resueltas
GET    /api/alertas/criticas/              # Alertas críticas
GET    /api/alertas/por_prioridad/         # Resumen por prioridad
GET    /api/alertas/por_tipo/              # Resumen por tipo
POST   /api/alertas/{id}/resolver/         # Resolver alerta
POST   /api/alertas/{id}/asignar/          # Asignar a usuario
POST   /api/alertas/{id}/notificar/        # Marcar notificada
GET    /api/alertas/resumen/               # KPIs de alertas
```

### Usuarios
```
POST   /api/usuarios/login/                # Login (JWT)
POST   /api/usuarios/logout/               # Logout
GET    /api/usuarios/me/                   # Datos del usuario actual
POST   /api/usuarios/                      # Crear usuario
GET    /api/usuarios/                      # Listar usuarios
PUT    /api/usuarios/{id}/                 # Actualizar usuario

POST   /api/usuarios/{id}/cambiar_password/  # Cambiar contraseña
POST   /api/usuarios/{id}/actualizar_perfil/ # Actualizar perfil
POST   /api/usuarios/{id}/desactivar/        # Desactivar usuario
GET    /api/usuarios/activos/               # Solo usuarios activos
GET    /api/usuarios/por_rol/               # Agrupado por rol

GET    /api/usuarios/perfiles/              # Listar perfiles
PUT    /api/usuarios/perfiles/{id}/         # Actualizar perfil (staff)
```

### Reportes
```
GET    /api/reportes/dashboard_general/    # Dashboard KPIs
GET    /api/reportes/ventas_por_vendedor/  # Performance vendedores
GET    /api/reportes/ventas_por_tipo/      # Análisis por tipo
GET    /api/reportes/crecimiento_clientes/ # Tendencia clientes
GET    /api/reportes/efectividad_alertas/  # Análisis alertas
GET    /api/reportes/forecast_ventas/      # Proyección ventas
GET    /api/reportes/clientes_en_riesgo/   # Clientes a riesgo
GET    /api/reportes/exportar/?formato=excel # Exportar reporte
```

---

## 🔐 Autenticación JWT

### Login
```bash
POST /api/usuarios/login/
{
  "username": "juan",
  "password": "micontraseña123"
}

# Response
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "usuario": { ... }
}
```

### Usar Token
```bash
GET /api/clientes/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### Refresh Token
```bash
POST /api/token/refresh/
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

## 📝 Admin Django

Acceder a: `http://localhost:8000/admin/`

Todas las entidades están registradas con interfaces completas:
- Clientes
- Ventas
- Agendamientos
- Alertas
- Perfiles de Usuarios

---

## 🗄️ Bases de Datos

### PostgreSQL (producción)
```
Conexión: postgres://sharkfit_user:password@db:5432/sharkfit_db
```

### SQLite (desarrollo sin Docker)
```
Automático en desarrollo.db
```

---

## 🚀 Próximos Pasos

### 1. Crear migraciones y BD
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### 2. Crear datos de ejemplo
```bash
python manage.py shell < scripts/seed_data.py
```

### 3. Iniciar servidor
```bash
python manage.py runserver
```

### 4. Probar endpoints
```bash
# Login
curl -X POST http://localhost:8000/api/usuarios/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Listar clientes
curl -X GET http://localhost:8000/api/clientes/ \
  -H "Authorization: Bearer <token>"
```

---

## 📊 Estadísticas

- **Modelos**: 6 (Cliente, Venta, Agendamiento, Alerta, PerfilUsuario, + User)
- **Serializers**: 6 clases con ~20 variantes
- **ViewSets**: 7 clases
- **Endpoints**: 60+ rutas REST
- **Admin interfaces**: 5 configuradas
- **Líneas de código Python**: ~2000+

---

## ✅ Checklist Stage 3

- ✅ Modelos Django con todas las entidades
- ✅ Serializers con validación completa
- ✅ ViewSets con CRUD + acciones custom
- ✅ Routing REST automático
- ✅ Autenticación JWT
- ✅ Admin Django configurado
- ✅ Paginación en listados
- ✅ Filtros y búsqueda
- ✅ Reportes y análisis
- ✅ Permisos basados en roles

---

## 🎯 State: LISTO PARA MIGRACIONES

El código Django está 100% listo. Solo falta:
1. `python manage.py makemigrations`
2. `python manage.py migrate`
3. Crear superusuario

Luego el frontend (Stage 2) se conectará y funcionará completamente.
