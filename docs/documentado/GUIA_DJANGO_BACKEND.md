# 🐍 ESTRUCTURA DJANGO - Backend Recomendado

**Nota 2026:** Referencias a SQLite son históricas; la ingestión y microservicios usan MongoDB.

## 📌 ¿Cuándo Necesitas Django?

Necesitas migrar a Django si:
- ✅ Tienes múltiples usuarios con roles diferentes
- ✅ Necesitas base de datos relacional compleja
- ✅ Necesitas autenticación/autorización avanzada
- ✅ Necesitas API segura con permisos por rol
- ✅ Quieres separar completamente frontend y backend

**Si solo tienes webhooks y Firebase/Firestore**, puedes seguir con frontend.

---

## 🏗️ Estructura Propuesta Django

```
backend/
├── manage.py
├── requirements.txt
├── .env.example
├── .gitignore
│
├── config/                              # Configuración Django
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── settings/                        # (Alternativa: modular)
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   └── middleware.py
│
├── apps/                                # Aplicaciones Django
│   │
│   ├── clientes/                        # App: Gestión de Clientes
│   │   ├── migrations/
│   │   ├── models.py                    # Cliente, ContactoCliente
│   │   ├── views.py                     # ClienteViewSet
│   │   ├── serializers.py               # ClienteSerializer
│   │   ├── urls.py                      # /api/v1/clientes/
│   │   ├── filters.py                   # BuscadorClientes
│   │   ├── services.py                  # Lógica de negocio
│   │   ├── tests.py
│   │   ├── admin.py
│   │   └── apps.py
│   │
│   ├── ventas/                          # App: Gestión de Ventas
│   │   ├── models.py                    # Venta, Contrato, Boleta
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tests.py
│   │
│   ├── agendamientos/                   # App: Agendamientos
│   │   ├── models.py                    # Agendamiento, Asistencia
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   └── tests.py
│   │
│   ├── alertas/                         # App: Sistema de Alertas
│   │   ├── models.py                    # Alerta, ConfiguracionAlerta
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── services.py                  # Lógica de generación de alertas
│   │   ├── migrations_helpers.py        # Funciones para webhooks
│   │   └── tests.py
│   │
│   ├── reportes/                        # App: Reportería
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── services.py                  # Cálculo de métricas
│   │   └── tests.py
│   │
│   ├── webhooks/                        # App: Webhooks (integraciones)
│   │   ├── models.py                    # ConfiguracionWebhook, LogWebhook
│   │   ├── views.py
│   │   ├── handlers.py                  # sincronizarEvo5, etc
│   │   └── tests.py
│   │
│   └── usuarios/                        # App: Usuarios y Permisos
│       ├── models.py                    # CustomUser, Rol, Permiso
│       ├── views.py                     # UserViewSet
│       ├── serializers.py
│       ├── permissions.py               # IsRS, IsAdmin
│       └── tests.py
│
├── shared/                              # Código compartido
│   ├── __init__.py
│   ├── models.py                        # AbstractBaseModel, TimestampedModel
│   ├── serializers.py                   # BaseSerializer
│   ├── views.py                         # BaseViewSet
│   ├── permissions.py                   # Permisos personalizados
│   ├── pagination.py                    # CustomPagination
│   ├── filters.py                       # BaseFilterBackend
│   ├── exceptions.py                    # CustomExceptions
│   └── enums.py                         # Enumeraciones compartidas
│
├── utils/                               # Utilidades globales
│   ├── __init__.py
│   ├── validators.py                    # Validadores reutilizables
│   ├── decorators.py                    # @log_action, @validate_data
│   ├── helpers.py                       # Funciones helper
│   ├── logger.py                        # Sistema de logging
│   ├── notifications.py                 # Envío de notificaciones
│   ├── slack_notifier.py                # Integración Slack
│   ├── twilio_notifier.py               # SMS con Twilio
│   └── exceptions.py                    # Excepciones globales
│
├── scripts/                             # Scripts para ejecutar tasks
│   ├── seed_data.py
│   ├── generate_alerts.py
│   ├── sync_evo5.py
│   └── cleanup.py
│
├── tests/                               # Tests centrales
│   ├── conftest.py
│   ├── factories.py
│   └── fixtures/
│
├── docs/                                # Documentación
│   ├── API.md                           # Documentación de APIs
│   ├── DATABASE.md                      # Schema de DB
│   ├── SETUP.md                         # Cómo hacer setup
│   ├── DEPLOYMENT.md                    # Deployment
│   ├── AUTH.md                          # Sistema de auth
│   └── WEBHOOKS.md                      # Webhooks
│
└── docker/                              # Docker
    ├── Dockerfile
    ├── docker-compose.yml
    └── .dockerignore
```

---

## 🚀 Guía Rápida: Estructura Mínima Django

Para empezar rápido, aquí está el mínimo viable:

### 1. requirements.txt

```
Django==4.2.0
djangorestframework==3.14.0
django-cors-headers==4.0.0
django-filter==23.1
djangorestframework-simplejwt==5.2.2
psycopg2-binary==2.9.6
python-decouple==3.8
celery==5.3.0
redis==4.5.4
gunicorn==20.1.0
```

### 2. settings.py (Base)

```python
import os
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='insecure-key')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',
    'django_filters',
    
    # Nuestras apps
    'apps.usuarios',
    'apps.clientes',
    'apps.ventas',
    'apps.agendamientos',
    'apps.alertas',
    'apps.reportes',
    'apps.webhooks',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Debe estar arriba
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='sharkfit'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'shared.pagination.CustomPagination',
    'PAGE_SIZE': 20,
}

# CORS
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',  # Vite
]

# JWT
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
```

### 3. urls.py (Principal)

```python
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Auth
    path('api/v1/token/', TokenObtainPairView.as_view()),
    path('api/v1/token/refresh/', TokenRefreshView.as_view()),
    
    # Apps
    path('api/v1/', include('apps.clientes.urls')),
    path('api/v1/', include('apps.ventas.urls')),
    path('api/v1/', include('apps.agendamientos.urls')),
    path('api/v1/', include('apps.alertas.urls')),
    path('api/v1/', include('apps.reportes.urls')),
    path('api/v1/', include('apps.usuarios.urls')),
    path('api/v1/', include('apps.webhooks.urls')),
]
```

### 4. Modelo de Ejemplo: Cliente

```python
# apps/clientes/models.py
from django.db import models
from shared.models import TimestampedModel

class Cliente(TimestampedModel):
    """Modelo de Cliente"""
    
    ESTADOS = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('pausado', 'Pausado'),
        ('cancelado', 'Cancelado'),
    ]
    
    nombre = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='activo')
    
    # Relaciones
    responsable = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'clientes'
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.nombre
```

### 5. Serializer

```python
# apps/clientes/serializers.py
from rest_framework import serializers
from .models import Cliente

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = [
            'id',
            'nombre',
            'email',
            'telefono',
            'estado',
            'responsable',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
```

### 6. ViewSet

```python
# apps/clientes/views.py
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Cliente
from .serializers import ClienteSerializer

class ClienteViewSet(viewsets.ModelViewSet):
    """
    API ViewSet para operaciones CRUD de Clientes
    """
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado']
    search_fields = ['nombre', 'email']
    ordering_fields = ['nombre', 'created_at']
    
    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        cliente = self.get_object()
        cliente.estado = 'activo'
        cliente.save()
        return Response({'estado': cliente.estado})
    
    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        cliente = self.get_object()
        # Retornar historial
        return Response({'historial': []})
```

### 7. URLs

```python
# apps/clientes/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')

urlpatterns = [
    path('', include(router.urls)),
]
```

---

## 🔐 Sistema de Permisos

### Modelo: Roles y Permisos

```python
# apps/usuarios/models.py
class Rol(models.Model):
    """Roles de usuario"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField()
    permisos = models.ManyToManyField('Permiso')
    
    def __str__(self):
        return self.nombre

class Permiso(models.Model):
    """Permisos granulares"""
    nombre = models.CharField(max_length=100)
    codigo = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField()
    
    def __str__(self):
        return self.nombre

class Usuario(AbstractUser):
    """Modelo de Usuario personalizado"""
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True)
    sede = models.ForeignKey('Sede', on_delete=models.SET_NULL, null=True)
```

### Permisos Personalizados

```python
# apps/usuarios/permissions.py
from rest_framework import permissions

class IsRS(permissions.BasePermission):
    """Solo RS pueden acceder"""
    def has_permission(self, request, view):
        return request.user.rol.codigo == 'rs'

class IsAdmin(permissions.BasePermission):
    """Solo admins"""
    def has_permission(self, request, view):
        return request.user.is_staff

class OwnerOrReadOnly(permissions.BasePermission):
    """Solo el propietario puede editar"""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.usuario == request.user
```

---

## 📊 Estructura de Base de Datos

### Diagrama E-R (Simplificado)

```
Usuario 
├── id
├── email
├── rol_id → Rol

Rol
├── id
├── nombre
└── permisos[] → Permiso

Cliente
├── id
├── nombre
├── email
├── estado
└── responsable_id → Usuario

Venta
├── id
├── cliente_id → Cliente
├── monto
├── fecha_venta
└── estado

Agendamiento
├── id
├── cliente_id → Cliente
├── fecha
├── usuario_id → Usuario
└── estado

Alerta
├── id
├── tipo
├── cliente_id → Cliente
├── mensaje
├── leida
└── fecha
```

---

## 🧪 Testing en Django

### Ejemplo Test Service

```python
# apps/clientes/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from .models import Cliente
from tests.factories import ClienteFactory

class ClienteAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cliente = ClienteFactory(nombre="Acme Corp")
    
    def test_obtener_clientes(self):
        response = self.client.get('/api/v1/clientes/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_crear_cliente(self):
        data = {
            'nombre': 'Test Client',
            'email': 'test@example.com',
            'telefono': '1234567890',
        }
        response = self.client.post('/api/v1/clientes/', data)
        self.assertEqual(response.status_code, 201)
```

---

## 🚀 Deployment

### Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: sharkfit
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  web:
    build: .
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    environment:
      DB_NAME: sharkfit
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_HOST: db
      DEBUG: "True"
    depends_on:
      - db

volumes:
  postgres_data:
```

---

## ✅ Checklist: Django Setup

- [ ] Proyecto Django creado
- [ ] Apps creadas (usuarios, clientes, ventas, etc)
- [ ] Models definidos
- [ ] Serializers creados
- [ ] ViewSets implementados
- [ ] URLs configuradas
- [ ] Base de datos configurada
- [ ] Autenticación JWT implementada
- [ ] CORS configurado
- [ ] Tests escritos
- [ ] Documentación API
- [ ] Docker configurado

---

## 📚 Próximos Pasos

1. **Crear backend Django** (6-8 horas)
2. **Conectar frontend con servicios** (2-3 horas)
3. **Implementar autenticación JWT** (2 horas)
4. **Testing end-to-end** (3-4 horas)
5. **Deployment a producción** (2-3 horas)

