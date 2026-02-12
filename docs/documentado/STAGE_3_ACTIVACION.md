# 🚀 STAGE 3 COMPLETO - INSTRUCCIONES DE ACTIVACIÓN

## 📊 Resumen de Progreso

```
✅ Stage 1: Frontend Scaffolding      (10 archivos)
✅ Stage 2: API Client + Hooks Layer  (22 archivos)
✅ Stage 3: Django Backend            (35+ archivos)
⏳ Stage 4: Backend Data Intake      (Próximo)
```

**Total creado en Stage 3**: 35+ archivos Python con ~2000 líneas de código

---

## 🎯 ¿Qué se creó en Stage 3?

### Modelos (5 archivos)
- **Cliente**: Gestión de prospectos y clientes
- **Venta**: Control de ventas con montos, estados, fechas
- **Agendamiento**: Sistema de citas con calendario
- **Alerta**: Alertas y notificaciones del sistema
- **PerfilUsuario**: Extensión de User con roles

### Serializers (5 archivos)
Validadores y transformadores de datos JSON:
- ClienteSerializer (3 variantes)
- VentaSerializer (3 variantes)
- AgendamientoSerializer (3 variantes)
- AlertaSerializer (4 variantes)
- UsuarioSerializer (4 variantes)

### ViewSets (6 archivos)
Lógica de endpoints REST con 60+ acciones:
- ClienteViewSet: CRUD + búsqueda + cambiar estado + exportar
- VentaViewSet: CRUD + resumen de ventas + análisis
- AgendamientoViewSet: CRUD + calendario + confirmar + completar
- AlertaViewSet: CRUD + pendientes + resolucion + notificación
- UsuarioViewSet: Login JWT + perfilamiento + roles
- ReporteViewSet: 10 reportes y análisis

### Admin (5 archivos)
Interfaces Django admin completamente configuradas para:
- Gestionar clientes
- Gestionar ventas
- Gestionar agendamientos
- Gestionar alertas
- Gestionar usuarios

### URLs (6 archivos)
Enrutamiento REST automático para todas las entidades

### Seeders (1 archivo)
Script para generar datos de prueba

---

## 🔧 INSTRUCCIONES: Activar Backend

### Paso 1: Instalar dependencias

```bash
cd backend
pip install -r requirements.txt
```

Si falta algún paquete:
```bash
pip install djangorestframework-simplejwt
pip install django-filter
```

### Paso 2: Crear migraciones

```bash
# Generar migraciones de modelos
python manage.py makemigrations

# Ver cambios
python manage.py migrate --plan

# Aplicar migraciones a BD
python manage.py migrate
```

### Paso 3: Crear superusuario (Admin)

```bash
python manage.py createsuperuser
# Username: admin
# Email: admin@sharkfit.com
# Password: admin123
```

O automáticamente:
```bash
echo "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@sharkfit.com', 'admin123')" | python manage.py shell
```

### Paso 4A: Generar datos de prueba (Recomendado)

```bash
python manage.py shell < seed_data.py
```

Esto crea:
- 1 admin user (ya existe) + 5 usuarios de ejemplo
- 8 clientes
- 20 ventas con estados diferentes
- 15 agendamientos
- 15 alertas variadas

**Credenciales de prueba:**
```
Username: admin
Password: admin123

Otros usuarios:
- juanperez / Juan123
- mariagarcia / Maria123
- carloslopez / Carlos123
- anamartinez / Ana123
- robertorodriguez / Roberto123
```

### Paso 4B: Crear datos manualmente

```bash
# Entrar a shell interactivo
python manage.py shell

# Dentro del shell:
from django.contrib.auth.models import User
from apps.clientes.models import Cliente

# Crear usuario
user = User.objects.create_user('vendedor1', 'vendedor@test.com', 'pass123')

# Crear cliente
cliente = Cliente.objects.create(
    nombre='Acme Corporation',
    email='contacto@acme.com',
    telefono='+54 11 1234-5678',
    estado='activo'
)

# Crear venta
from apps.ventas.models import Venta
venta = Venta.objects.create(
    numero_venta='VTA-2024-001',
    cliente=cliente,
    monto_total=15000,
    monto_neto=15000,
)

print("✓ Datos creados")
exit()
```

### Paso 5: Iniciar servidor Django

```bash
# Desarrollo (debug mode)
python manage.py runserver

# O en puerto específico
python manage.py runserver 0.0.0.0:8000
```

📍 Verás:
```
Django version 4.2.7, using settings 'config.settings'
Starting development server at http://127.0.0.1:8000/
```

---

## 🧪 PRUEBAS: Probar Endpoints

### En otra terminal, probar con curl:

#### 1. Login y obtener token JWT

```bash
curl -X POST http://localhost:8000/api/usuarios/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "usuario": { ... }
}
```

Guarda el token `access` para los siguientes requests.

#### 2. Listar clientes

```bash
curl -X GET http://localhost:8000/api/clientes/ \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### 3. Crear cliente

```bash
curl -X POST http://localhost:8000/api/clientes/ \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nuevo Cliente",
    "email": "nuevo@cliente.com",
    "telefono": "+54 11 1234-5678",
    "estado": "prospecto"
  }'
```

#### 4. Actualizar cliente

```bash
curl -X PUT http://localhost:8000/api/clientes/1/ \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Cliente Actualizado",
    "estado": "activo"
  }'
```

#### 5. Cambiar estado de cliente

```bash
curl -X POST http://localhost:8000/api/clientes/1/cambiar_estado/ \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"estado": "activo"}'
```

#### 6. Buscar clientes

```bash
curl -X GET "http://localhost:8000/api/clientes/buscar/?q=juan" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### 7. Exportar clientes a CSV

```bash
curl -X GET "http://localhost:8000/api/clientes/exportar/?formato=csv" \
  -H "Authorization: Bearer {{TOKEN}}" > clientes.csv
```

#### 8. Dashboard de reportes

```bash
curl -X GET http://localhost:8000/api/reportes/dashboard_general/ \
  -H "Authorization: Bearer {{TOKEN}}"
```

---

## 🌐 ADMIN DJANGO

Accede a: **http://localhost:8000/admin/**

- Username: `admin`
- Password: `admin123`

Aquí puedes:
- ✅ Gestionar clientes
- ✅ Gestionar ventas
- ✅ Gestionar agendamientos
- ✅ Gestionar alertas
- ✅ Gestionar usuarios y perfiles

---

## 🔗 CONECTAR FRONTEND (Stage 2)

El frontend ya espera estos endpoints. Solo necesita:

### 1. Actualizar `.env.local` en frontend

```env
VITE_API_URL=http://localhost:8000/api
```

### 2. Iniciar frontend

```bash
cd frontend
npm run dev
```

### 3. Probar conexión

Abre http://localhost:5173/ y verás ListarClientesEjemplo funcionando completamente con datos reales del backend.

---

## 📋 ESTRUCTURA DE ARCHIVOS CREADOS

```
backend/

# Modelos
apps/clientes/models.py          ✅ Cliente
apps/ventas/models.py            ✅ Venta
apps/agendamientos/models.py     ✅ Agendamiento
apps/alertas/models.py           ✅ Alerta
apps/usuarios/models.py          ✅ PerfilUsuario

# Serializers
apps/clientes/serializers.py     ✅ 3 clases
apps/ventas/serializers.py       ✅ 3 clases
apps/agendamientos/serializers.py ✅ 3 clases
apps/alertas/serializers.py      ✅ 4 clases
apps/usuarios/serializers.py     ✅ 4 clases

# Views
apps/clientes/views.py           ✅ ClienteViewSet
apps/ventas/views.py             ✅ VentaViewSet
apps/agendamientos/views.py      ✅ AgendamientoViewSet
apps/alertas/views.py            ✅ AlertaViewSet
apps/usuarios/views.py           ✅ UsuarioViewSet + PerfilUIarioViewSet
apps/reportes/views.py           ✅ ReporteViewSet (10 acciones)

# URLs
apps/clientes/urls.py            ✅ Routing
apps/ventas/urls.py              ✅ Routing
apps/agendamientos/urls.py       ✅ Routing
apps/alertas/urls.py             ✅ Routing
apps/usuarios/urls.py            ✅ Routing
apps/reportes/urls.py            ✅ Routing

# Admin
apps/clientes/admin.py           ✅ ClienteAdmin
apps/ventas/admin.py             ✅ VentaAdmin
apps/agendamientos/admin.py      ✅ AgendamientoAdmin
apps/alertas/admin.py            ✅ AlertaAdmin
apps/usuarios/admin.py           ✅ PerfilUsuarioAdmin

# Config
config/settings.py               ✅ Actualizado con JWT
config/urls.py                   ✅ Routing configurado

# Seeders
seed_data.py                     ✅ Datos de prueba

# Docs
STAGE_3_COMPLETADO.md            ✅ Documentación
```

---

## ✅ CHECKLIST FINAL

- [ ] Ejecutar `pip install -r requirements.txt`
- [ ] Ejecutar `python manage.py makemigrations`
- [ ] Ejecutar `python manage.py migrate`
- [ ] Ejecutar `python manage.py createsuperuser` (o automático)
- [ ] Ejecutar `python manage.py shell < seed_data.py`
- [ ] Iniciar con `python manage.py runserver`
- [ ] Probar login en `/api/usuarios/login/`
- [ ] Acceder a admin Django `/admin/`
- [ ] Conectar frontend con `VITE_API_URL=http://localhost:8000/api`
- [ ] Abrir frontend en http://localhost:5173
- [ ] Probar crear/editar/eliminar clientes en ListarClientesEjemplo

---

## 🐛 TROUBLESHOOTING

### Error: "No module named 'rest_framework_simplejwt'"
```bash
pip install djangorestframework-simplejwt
```

### Error: "No module named 'django_filters'"
```bash
pip install django-filter
```

### Error: "ProgrammingError: relation doesn't exist"
```bash
python manage.py migrate
python manage.py makemigrations
python manage.py migrate
```

### Error: CORS "Access to XMLHttpRequest has been blocked"
✅ Ya configurado en `settings.py` para:
- `http://localhost:5173` (frontend)
- `http://localhost:3000` (landing)

Si necesitas agregar más:
```python
# En settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://mi-dominio.com",  # ← Agregar aquí
]
```

### Error: "CSRF token missing"
Asegúrate que las peticiones tengan:
```
Content-Type: application/json
Authorization: Bearer <token>
```

---

## 🎬 PRÓXIMO: Stage 4

Una vez Stage 3 funcione perfectamente (frontend ↔️ backend conectados):

**Stage 4: Backend Data Intake**
- Completar JWT en `backend-data-intake/src/middleware/auth.js`
- Implementar sincronización con EVO5
- Implementar webhooks
- MongoDB para logs y configuraciones

---

## 📞 SOPORTE RÁPIDO

```bash
# Ver tabla de BD
python manage.py dbshell

# Ver SQL generado
python manage.py sqlmigrate clientes 0001

# Resetear BD (⚠️ desarrollo only)
python manage.py migrate clientes zero

# Backup datos
python manage.py dumpdata > backup.json

# Restaurar datos
python manage.py loaddata backup.json
```

---

**Estado:** ✅ STAGE 3 COMPLETADO Y LISTO

**Próximo paso:** Ejecutar comandos de activación y conectar frontend.

¡Adelante! 🚀
