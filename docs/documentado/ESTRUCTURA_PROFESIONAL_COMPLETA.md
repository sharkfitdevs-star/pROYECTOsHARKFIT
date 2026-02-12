# 🏗️ ESTRUCTURA PROFESIONAL COMPLETA: Dashboard Sharkfit

**Nota 2026:** El proyecto actual usa SQLite; las referencias a PostgreSQL/Mongo en este documento son historicas.

## Arquitectura General del Proyecto

Esta es la estructura **recomendada** para organizar el proyecto en 3 partes principales:

```
sharkfit-platform/                          # Raíz del proyecto
│
├─ 📱 FRONTEND (React + Vite)
├─ 🐍 BACKEND (Django REST API)
├─ 🌐 LANDING PAGE (Marketing Website)
├─ 🗄️ DATABASE (PostgreSQL)
├─ 🐳 DOCKER & DEVOPS
└─ 📚 DOCUMENTACIÓN
```

---

# 📊 ESTRUCTURA DETALLADA RECOMENDADA

```
sharkfit-platform/                              # Raíz del monorepo
│
├── 📱 frontend/                                # ⭐ APLICACIÓN REACT
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js
│   │   │   ├── endpoints.js
│   │   │   ├── interceptors.js
│   │   │   └── services/
│   │   │       ├── clientesService.js
│   │   │       ├── ventasService.js
│   │   │       ├── alertasService.js
│   │   │       ├── agendamientosService.js
│   │   │       └── index.js
│   │   │
│   │   ├── components/
│   │   │   ├── shared/                    # Componentes genéricos
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Table.jsx
│   │   │   │   └── ...
│   │   │   ├── layout/                    # Layout principal
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Layout.jsx
│   │   │   ├── features/                  # Componentes por feature
│   │   │   │   ├── Clientes/
│   │   │   │   ├── Ventas/
│   │   │   │   └── ...
│   │   │   └── dialogs/                   # Diálogos
│   │   │
│   │   ├── pages/                         # Páginas/Routes
│   │   │   ├── dashboard/
│   │   │   ├── management/
│   │   │   ├── configuration/
│   │   │   └── reports/
│   │   │
│   │   ├── hooks/                         # Custom Hooks
│   │   │   ├── useClientes.js
│   │   │   ├── useVentas.js
│   │   │   ├── useFetch.js
│   │   │   ├── useForm.js
│   │   │   └── index.js
│   │   │
│   │   ├── context/                       # Context API
│   │   │   ├── AuthContext.js
│   │   │   ├── NotificationContext.js
│   │   │   ├── PermissionsContext.js
│   │   │   └── index.js
│   │   │
│   │   ├── utils/
│   │   │   ├── formatters.js
│   │   │   ├── validators.js
│   │   │   ├── helpers.js
│   │   │   └── errorHandler.js
│   │   │
│   │   ├── config/
│   │   │   ├── api.config.js
│   │   │   ├── app.config.js
│   │   │   └── constants.js
│   │   │
│   │   ├── types/
│   │   │   ├── alertas.types.js
│   │   │   ├── clientes.types.js
│   │   │   └── index.js
│   │   │
│   │   ├── middleware/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── 🐍 backend/                               # ⭐ DJANGO API
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── config/                             # Django settings
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   ├── production.py
│   │   │   └── __init__.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   │
│   ├── apps/                               # Aplicaciones Django
│   │   ├── __init__.py
│   │   │
│   │   ├── usuarios/                       # Users & Auth
│   │   │   ├── migrations/
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   ├── serializers.py
│   │   │   ├── urls.py
│   │   │   ├── permissions.py
│   │   │   ├── tests.py
│   │   │   ├── admin.py
│   │   │   └── apps.py
│   │   │
│   │   ├── clientes/                       # Clients
│   │   │   ├── migrations/
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   ├── serializers.py
│   │   │   ├── urls.py
│   │   │   ├── filters.py
│   │   │   ├── services.py
│   │   │   ├── tests.py
│   │   │   ├── admin.py
│   │   │   └── apps.py
│   │   │
│   │   ├── ventas/                         # Sales
│   │   │   ├── migrations/
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   ├── serializers.py
│   │   │   ├── urls.py
│   │   │   └── tests.py
│   │   │
│   │   ├── agendamientos/                  # Appointments
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   ├── serializers.py
│   │   │   └── tests.py
│   │   │
│   │   ├── alertas/                        # Alerts System
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   ├── serializers.py
│   │   │   ├── services.py
│   │   │   ├── urls.py
│   │   │   └── tests.py
│   │   │
│   │   ├── reportes/                       # Reports
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   ├── services.py
│   │   │   └── tests.py
│   │   │
│   │   ├── webhooks/                       # Webhooks
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   ├── handlers.py
│   │   │   └── tests.py
│   │   │
│   │   └── core/                           # Utilities & Shared
│   │       ├── models.py                   # Abstract models
│   │       ├── serializers.py
│   │       ├── views.py
│   │       ├── permissions.py
│   │       ├── pagination.py
│   │       ├── filters.py
│   │       ├── exceptions.py
│   │       └── mixins.py
│   │
│   ├── utils/
│   │   ├── validators.py
│   │   ├── decorators.py
│   │   ├── helpers.py
│   │   ├── logger.py
│   │   ├── notifications.py
│   │   └── exceptions.py
│   │
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── factories.py
│   │   └── fixtures/
│   │
│   ├── scripts/
│   │   ├── seed_data.py
│   │   ├── generate_alerts.py
│   │   └── sync_evo5.py
│   │
│   ├── .gitignore
│   ├── README.md
│   └── docker/
│       └── Dockerfile
│
├── 🌐 landing/                               # ⭐ LANDING PAGE (Marketing)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── Features.jsx
│   │   │   ├── Pricing.jsx
│   │   │   ├── Testimonials.jsx
│   │   │   ├── CTA.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Features.jsx
│   │   │   ├── Pricing.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Contact.jsx
│   │   │   └── NotFound.jsx
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── variables.css
│   │   │   └── tailwind.css
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── 📚 docs/                                  # ⭐ DOCUMENTACIÓN
│   ├── README.md                            # Índice principal
│   ├── COMO_EMPEZAR.md                      # Quick start
│   │
│   ├── arquitectura/
│   │   ├── FRONTEND.md
│   │   ├── BACKEND.md
│   │   ├── DATABASE.md
│   │   ├── FLUJO_DATOS.md
│   │   └── DEPLOYMENT.md
│   │
│   ├── guias/
│   │   ├── COMO_AGREGAR_FEATURE_FRONTEND.md
│   │   ├── COMO_AGREGAR_FEATURE_BACKEND.md
│   │   ├── COMO_USAR_SERVICIOS.md
│   │   ├── COMO_USAR_HOOKS.md
│   │   ├── TESTS.md
│   │   └── GIT_WORKFLOW.md
│   │
│   ├── api/
│   │   ├── ENDPOINTS.md
│   │   ├── AUTENTICACION.md
│   │   └── ERRORES.md
│   │
│   ├── negocio/
│   │   ├── TIPOS_ALERTAS.md
│   │   ├── CONFIGURACION_WEBHOOKS.md
│   │   └── METRICAS.md
│   │
│   └── deployment/
│       ├── DOCKER.md
│       ├── PRODUCCION.md
│       └── CI_CD.md
│
├── 🐳 docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── .dockerignore
│   └── nginx/
│       ├── Dockerfile
│       ├── nginx.conf
│       └── conf.d/
│
├── 📋 .github/
│   ├── workflows/
│   │   ├── ci.yml                          # Tests automáticos
│   │   ├── deploy.yml                      # Deploy automático
│   │   └── lint.yml                        # Code quality
│   └── PULL_REQUEST_TEMPLATE.md
│
├── 🔧 Archivos Raíz
│   ├── docker-compose.yml                  # Dev environment
│   ├── docker-compose.prod.yml             # Production
│   ├── .env.example                        # Variables globales
│   ├── .gitignore
│   ├── .editorconfig
│   ├── README.md                           # README principal
│   ├── CONTRIBUTING.md                     # Contribuciones
│   ├── LICENSE
│   ├── package.json                        # Scripts globales (monorepo)
│   └── Makefile                            # Comandos comunes

└── 🚀 scripts/                              # Scripts automáticos
    ├── setup.sh                            # Setup inicial
    ├── run-dev.sh                          # Correr dev local
    ├── run-tests.sh                        # Ejecutar tests
    ├── build.sh                            # Build producción
    └── deploy.sh                           # Deploy prod
```

---

## 🎯 ESTRUCTURA SIMPLIFICADA POR CARPETA

### 📱 FRONTEND (`frontend/`)
```
Se mudan TODOS estos archivos/carpetas AQUÍ:
├── components/        ← Actual en raíz
├── pages/            ← Actual en raíz
├── utils/            ← Actual en raíz (renombrar a src/utils/)
├── Layout.jsx        ← Actual en raíz
├── entities/         ← (rename a src/types/)
└── functions/        ← (rename a src/config/webhooks/)
```

**Plus crear en `frontend/src/`:**
- `api/` - Axios services
- `hooks/` - Custom hooks
- `context/` - State global
- `config/` - Configuración

### 🐍 BACKEND (`backend/`)
```
Nueva carpeta con:
├── manage.py
├── requirements.txt
├── config/          ← Django settings
├── apps/            ← Django apps (nuevas)
│   ├── usuarios/
│   ├── clientes/
│   ├── ventas/
│   └── ...
├── utils/           ← Funciones comunes
├── scripts/         ← Scripts de management
└── docker/          ← Dockerfile para backend
```

### 🌐 LANDING (`landing/`)
```
Nueva carpeta con página de marketing:
├── public/
├── src/
│   ├── components/  ← Hero, Features, Pricing, etc.
│   ├── pages/       ← Home, About, Contact, etc.
│   └── styles/      ← CSS global y tailwind
├── package.json
└── vite.config.js
```

### 📚 DOCS (`docs/`)
```
Documentación centralizada:
├── arquitectura/     ← Documentos técnicos
├── guias/           ← Tutoriales prácticos
├── api/             ← Documentación API
├── negocio/         ← Reglas de negocio
└── deployment/      ← DevOps
```

---

## 🚀 INSTANCIAS Y PUERTOS

```
┌─────────────────────────────────────────────┐
│         DESARROLLO LOCAL                    │
├─────────────────────────────────────────────┤
│ Landing Page:    http://localhost:3000     │
│ Frontend App:    http://localhost:5173     │
│ Backend API:     http://localhost:8000     │
│ PostgreSQL:      localhost:5432            │
│ Adminer (BD):    http://localhost:8080     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         PRODUCCIÓN                          │
├─────────────────────────────────────────────┤
│ Landing:        sharkfit.com               │
│ App:            app.sharkfit.com           │
│ API:            api.sharkfit.com           │
│ Admin:          admin.sharkfit.com         │
└─────────────────────────────────────────────┘
```

---

## 📦 CÓMO MIGRAR AHORA

### Paso 1: Crear estructura de carpetas

```bash
# En la raíz del proyecto
mkdir -p frontend backend landing docs docker scripts

# Dentro de frontend
mkdir -p frontend/src/{api,hooks,context,components,pages,utils,config,types}

# Dentro de backend
mkdir -p backend/{config,apps/{usuarios,clientes,ventas,alertas,...},utils,scripts}

# Dentro de landing
mkdir -p landing/src/{components,pages,styles}

# Dentro de docs
mkdir -p docs/{arquitectura,guias,api,negocio,deployment}
```

### Paso 2: Mover código actual

```bash
# Frontend (desde raíz) →
mv components/ frontend/src/
mv pages/ frontend/src/
mv utils/ frontend/src/
mv Layout.jsx frontend/src/components/layout/
mv entities/ frontend/src/types/
mv functions/ frontend/docs/  # O frontend/src/config/

# Copiar documentación
cp *.md docs/
```

### Paso 3: Copiar archivos de configuración

```bash
# Frontend
cp .env.example frontend/
cp package.json frontend/
cp vite.config.js frontend/

# Backend (crear nuevo)
touch backend/.env.example
touch backend/requirements.txt
touch backend/manage.py

# Root
touch docker-compose.yml
```

---

## ⚙️ DOCKER COMPOSE: Correr todo junto

### Archivo: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: sharkfit
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Backend (Django)
  backend:
    build:
      context: ./backend
      dockerfile: docker/Dockerfile
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DB_NAME: sharkfit
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_HOST: postgres
      DEBUG: "True"
    depends_on:
      - postgres

  # Frontend (React)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    command: npm run dev
    volumes:
      - ./frontend/src:/app/src
    ports:
      - "5173:5173"
    environment:
      REACT_APP_API_URL: http://localhost:8000/api
    depends_on:
      - backend

  # Landing Page
  landing:
    build:
      context: ./landing
      dockerfile: Dockerfile
    command: npm run dev
    volumes:
      - ./landing/src:/app/src
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

**Usar:**
```bash
# Correr todo
docker-compose up

# O individual
docker-compose up frontend
docker-compose up backend
docker-compose up landing
```

---

## 📊 RESUMEN CAMBIOS

| Área | Antes | Después |
|------|-------|---------|
| **Frontend** | Raíz + `components/`, `pages/` | `frontend/src/` (organizado) |
| **Backend** | Webhooks en `functions/` | `backend/` (Django app) |
| **Landing** | No existe | `landing/` (nuevo) |
| **Docs** | 20 archivos en raíz | `docs/` (organizado) |
| **Config** | .env dispersos | Variables centralizadas |
| **Docker** | No existe | docker-compose.yml |
| **Scripts** | Manual | `scripts/` + Makefile |

---

## ✅ BENEFICIOS

✅ **Separación clara** - Frontend, Backend, Landing separados  
✅ **Escalable** - Fácil agregar servicios  
✅ **Profesional** - Estructura de industria  
✅ **Documentado** - Todo en `docs/`  
✅ **Desarrollo fácil** - Docker-compose para todo  
✅ **Deploy simple** - Cada parte se deploya independientemente  
✅ **Colaboración** - Equipos pueden trabajar en paralelo  

---

## 🎯 PRÓXIMATE PASOS

1. **Crear estructura** (30 min)
2. **Mover código** (1-2 horas)
3. **Actualizar imports** (1-2 horas)
4. **Configurar Docker** (1 hora)
5. **Testear local** (30 min)
6. **Deploy** (1 hora)

**Total:** 5-7 horas para poder trabajar con nuevaestructura

