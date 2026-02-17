# 📦 GUÍA PRÁCTICA: Migración a Estructura Profesional

**Nota 2026:** Referencias a SQLite son históricas; la ingestión y microservicios usan MongoDB.

## 🎯 Objetivo

Reorganizar el proyecto de una carpeta única a una estructura profesional:
- **Frontend** (`frontend/`) - React + Vite
- **Backend** (`backend/`) - Django API
- **Landing** (`landing/`) - Página de marketing
- **Documentación** (`docs/`) - Centralizada

**Tiempo estimado:** 4-6 horas

---

## 📋 CHECKLIST POR FASE

### FASE 1: Crear Estructura Base (30 min)
- [ ] Crear carpetas principales
- [ ] Crear subcarpetas por servicio
- [ ] Crear archivos de configuración base

### FASE 2: Mover Frontend (1-1.5 horas)
- [ ] Mover componentes a `frontend/src/components/`
- [ ] Mover páginas a `frontend/src/pages/`
- [ ] Mover utils a `frontend/src/utils/`
- [ ] Actualizar imports en archivos React

### FASE 3: Preparar Backend (1-1.5 horas)
- [ ] Crear estructura Django
- [ ] Crear apps Django
- [ ] Mover funciones webhook a backend

### FASE 4: Crear Landing Page (30 min)
- [ ] Estructura básica React
- [ ] Componentes de marketing

### FASE 5: Reorganizar Documentación (30 min)
- [ ] Mover docs a `docs/`
- [ ] Crear índice centralizado

### FASE 6: Configurar Docker (1 hora)
- [ ] Crear docker-compose.yml
- [ ] Crear Dockerfiles por servicio
- [ ] Testear con Docker

---

# 🚀 IMPLEMENTACIÓN PASO A PASO

## FASE 1: Crear Estructura Base (30 min)

### Paso 1.1: Abre PowerShell en la raíz del proyecto

```powershell
cd "c:\Users\vecch\OneDrive\Escritorio\Dashboard Sharkfit 30 enero - Copy-export (1)"
```

### Paso 1.2: Crear carpetas principales

```powershell
# Carpetas principales
New-Item -ItemType Directory -Path "frontend/src" -Force
New-Item -ItemType Directory -Path "backend" -Force
New-Item -ItemType Directory -Path "landing/src" -Force
New-Item -ItemType Directory -Path "docs" -Force
New-Item -ItemType Directory -Path "docker" -Force
New-Item -ItemType Directory -Path "scripts" -Force
```

### Paso 1.3: Crear subcarpetas de frontend

```powershell
# APIs y servicios
New-Item -ItemType Directory -Path "frontend/src/api/services" -Force
New-Item -ItemType Directory -Path "frontend/src/hooks" -Force
New-Item -ItemType Directory -Path "frontend/src/context" -Force
New-Item -ItemType Directory -Path "frontend/src/config" -Force
New-Item -ItemType Directory -Path "frontend/src/types" -Force
New-Item -ItemType Directory -Path "frontend/src/middleware" -Force
New-Item -ItemType Directory -Path "frontend/src/assets" -Force

# Componentes organizados
New-Item -ItemType Directory -Path "frontend/src/components/shared" -Force
New-Item -ItemType Directory -Path "frontend/src/components/layout" -Force
New-Item -ItemType Directory -Path "frontend/src/components/features" -Force
New-Item -ItemType Directory -Path "frontend/src/components/dialogs" -Force

# Páginas
New-Item -ItemType Directory -Path "frontend/src/pages/dashboard" -Force
New-Item -ItemType Directory -Path "frontend/src/pages/management" -Force
New-Item -ItemType Directory -Path "frontend/src/pages/configuration" -Force
New-Item -ItemType Directory -Path "frontend/src/pages/reports" -Force

# Tests
New-Item -ItemType Directory -Path "frontend/tests/unit" -Force
New-Item -ItemType Directory -Path "frontend/tests/integration" -Force
New-Item -ItemType Directory -Path "frontend/tests/e2e" -Force
```

### Paso 1.4: Crear subcarpetas de backend

```powershell
# Configuración Django
New-Item -ItemType Directory -Path "backend/config/settings" -Force
New-Item -ItemType Directory -Path "backend/apps/usuarios" -Force
New-Item -ItemType Directory -Path "backend/apps/clientes" -Force
New-Item -ItemType Directory -Path "backend/apps/ventas" -Force
New-Item -ItemType Directory -Path "backend/apps/agendamientos" -Force
New-Item -ItemType Directory -Path "backend/apps/alertas" -Force
New-Item -ItemType Directory -Path "backend/apps/reportes" -Force
New-Item -ItemType Directory -Path "backend/apps/webhooks" -Force
New-Item -ItemType Directory -Path "backend/apps/core" -Force

# Utils y tests
New-Item -ItemType Directory -Path "backend/utils" -Force
New-Item -ItemType Directory -Path "backend/scripts" -Force
New-Item -ItemType Directory -Path "backend/tests" -Force
New-Item -ItemType Directory -Path "backend/docker" -Force
```

### Paso 1.5: Crear subcarpetas de landing

```powershell
New-Item -ItemType Directory -Path "landing/src/components" -Force
New-Item -ItemType Directory -Path "landing/src/pages" -Force
New-Item -ItemType Directory -Path "landing/src/styles" -Force
New-Item -ItemType Directory -Path "landing/public" -Force
```

### Paso 1.6: Crear subcarpetas de documentación

```powershell
New-Item -ItemType Directory -Path "docs/arquitectura" -Force
New-Item -ItemType Directory -Path "docs/guias" -Force
New-Item -ItemType Directory -Path "docs/api" -Force
New-Item -ItemType Directory -Path "docs/negocio" -Force
New-Item -ItemType Directory -Path "docs/deployment" -Force
```

---

## FASE 2: Mover Frontend (1-1.5 horas)

### Paso 2.1: Mover componentes

```powershell
# Copiar carpeta components a frontend/src/
Copy-Item -Path "components" -Destination "frontend/src/components/features" -Recurse -Force

# Reorganizar: mover componentes genéricos a shared/
# (Esto se hace en el siguiente paso)
```

### Paso 2.2: Mover páginas

```powershell
# Copiar carpeta pages
Copy-Item -Path "pages" -Destination "frontend/src/pages" -Recurse -Force
```

### Paso 2.3: Mover utilities

```powershell
# Copiar carpeta utils
Copy-Item -Path "utils" -Destination "frontend/src/utils" -Recurse -Force
```

### Paso 2.4: Mover entidades (renombrar a types)

```powershell
# Copiar entities como types
Copy-Item -Path "entities" -Destination "frontend/src/types" -Recurse -Force
```

### Paso 2.5: Copiar Layout.jsx

```powershell
# Copiar Layout a componentes de layout
Copy-Item -Path "Layout.jsx" -Destination "frontend/src/components/layout/Layout.jsx" -Force
```

### Paso 2.6: Crear archivo de configuración frontend

**Crear:** `frontend/package.json`

```json
{
  "name": "sharkfit-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src/ --ext .js,.jsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2",
    "lucide-react": "^latest"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.8",
    "vitest": "^1.0.4",
    "eslint": "^8.55.0"
  }
}
```

### Paso 2.7: Crear .env.example para frontend

**Crear:** `frontend/.env.example`

```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
REACT_APP_LOG_LEVEL=debug
```

---

## FASE 3: Preparar Backend (1-1.5 horas)

### Paso 3.1: Crear estructura Django base

**Crear:** `backend/requirements.txt`

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

### Paso 3.2: Crear .env.example para backend

**Crear:** `backend/.env.example`

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=sharkfit
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Paso 3.3: Copiar funciones webhook a backend

```powershell
# Copiar funciones a backend/apps/webhooks/handlers.py
Copy-Item -Path "functions" -Destination "backend/apps/webhooks" -Recurse -Force
```

**Después:** Refactorizar como módulos Django

---

## FASE 4: Crear Landing Page (30 min)

### Paso 4.1: Crear package.json para landing

**Crear:** `landing/package.json`

```json
{
  "name": "sharkfit-landing",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.8",
    "tailwindcss": "^3.4.0"
  }
}
```

### Paso 4.2: Crear componentes básicos

**Crear:** `landing/src/App.jsx`

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Header from './components/Header';
import Footer from './components/Footer';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
```

---

## FASE 5: Organizar Documentación (30 min)

### Paso 5.1: Mover documentación existente

```powershell
# Mover documentos de negocio
Copy-Item -Path "README_SISTEMA_ALERTAS.md" -Destination "docs/negocio/" -Force
Copy-Item -Path "GUIA_TIPOS_ALERTAS.md" -Destination "docs/negocio/" -Force
Copy-Item -Path "GUIA_CONFIGURACION_WEBHOOKS.md" -Destination "docs/negocio/" -Force
Copy-Item -Path "GUIA_CONFIGURACION_ALERTAS.md" -Destination "docs/negocio/" -Force

# Mover documentos técnicos
Copy-Item -Path "ARQUITECTURA_DETALLADA.md" -Destination "docs/arquitectura/" -Force
Copy-Item -Path "GUIA_SERVICIOS_Y_HOOKS.md" -Destination "docs/guias/" -Force
Copy-Item -Path "PLAN_MIGRACION_PASO_A_PASO.md" -Destination "docs/guias/" -Force
Copy-Item -Path "ESTRUCTURA_PROFESIONAL_COMPLETA.md" -Destination "docs/arquitectura/" -Force
Copy-Item -Path "GUIA_DJANGO_BACKEND.md" -Destination "docs/backend/" -Force
```

### Paso 5.2: Crear índice de documentación

**Crear:** `docs/README.md`

```markdown
# 📚 Documentación del Proyecto

## 🎯 Inicio Rápido
- [COMO_EMPEZAR.md](./COMO_EMPEZAR.md)

## 🏗️ Arquitectura
- [Frontend](./arquitectura/FRONTEND.md)
- [Backend](./arquitectura/BACKEND.md)
- [Database](./arquitectura/DATABASE.md)
- [Flujo de Datos](./arquitectura/FLUJO_DATOS.md)

## 📖 Guías Prácticas
- [Agregar Feature Frontend](./guias/COMO_AGREGAR_FEATURE_FRONTEND.md)
- [Agregar Feature Backend](./guias/COMO_AGREGAR_FEATURE_BACKEND.md)
- [Usar Servicios](./guias/COMO_USAR_SERVICIOS.md)
- [Usar Hooks](./guias/COMO_USAR_HOOKS.md)
- [Testing](./guias/TESTS.md)

## 🔌 API
- [Endpoints](./api/ENDPOINTS.md)
- [Autenticación](./api/AUTENTICACION.md)
- [Manejo de Errores](./api/ERRORES.md)

## 💼 Negocio
- [Tipos de Alertas](./negocio/TIPOS_ALERTAS.md)
- [Configuración Webhooks](./negocio/CONFIGURACION_WEBHOOKS.md)

## 🚀 Deployment
- [Docker](./deployment/DOCKER.md)
- [Producción](./deployment/PRODUCCION.md)
```

---

## FASE 6: Configurar Docker (1 hora)

### Paso 6.1: Crear docker-compose.yml

**Crear:** `docker-compose.yml` en raíz

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    container_name: sharkfit_postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-sharkfit}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Django Backend
  backend:
    build:
      context: ./backend
      dockerfile: docker/Dockerfile
    container_name: sharkfit_backend
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DEBUG: "True"
      DB_NAME: ${DB_NAME:-sharkfit}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-postgres}
      DB_HOST: postgres
      DB_PORT: 5432
    depends_on:
      postgres:
        condition: service_healthy

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sharkfit_frontend
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
    container_name: sharkfit_landing
    command: npm run dev
    volumes:
      - ./landing/src:/app/src
    ports:
      - "3000:3000"

  # Adminer (DB UI)
  adminer:
    image: adminer
    ports:
      - "8080:8080"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Paso 6.2: Crear Dockerfile para Frontend

**Crear:** `frontend/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
```

### Paso 6.3: Crear Dockerfile para Backend

**Crear:** `backend/docker/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Paso 6.4: Crear .env global

**Crear:** `.env` en raíz

```env
# Database
DB_NAME=sharkfit
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=postgres
DB_PORT=5432

# Django
DEBUG=True
SECRET_KEY=django-insecure-your-secret-key

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=5173
LANDING_PORT=3000
DATABASE_PORT=5432
ADMINER_PORT=8080
```

---

## FASE 7: Actualizar Imports (1-2 horas)

### Paso 7.1: Actualizar imports en componentes React

**Buscar y reemplazar en todos los archivos .jsx:**

```javascript
// ANTES
import { User } from '@/entities/User';
import { createPageUrl } from '@/utils';

// DESPUÉS
import { User } from '@/types/User';
import { createPageUrl } from '@/utils/helpers';
```

### Paso 7.2: Script para ayudar con imports

**Crear:** `scripts/fix-imports.js`

```javascript
const fs = require('fs');
const path = require('path');

// Reemplazos
const replacements = [
  {
    from: /from ['"]@\/entities\//g,
    to: "from '@/types/"
  },
  {
    from: /from ['"]\.\.\/utils\//g,
    to: "from '@/utils/"
  },
  {
    from: /from ['"]\.\/utils\//g,
    to: "from '@/utils/"
  },
];

function processFiles(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git'].includes(file)) {
        processFiles(fullPath);
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      replacements.forEach(({ from, to }) => {
        content = content.replace(from, to);
      });
      fs.writeFileSync(fullPath, content);
      console.log(`✓ Fixed: ${fullPath}`);
    }
  });
}

processFiles('./frontend/src');
console.log('✅ Import fixes complete!');
```

**Ejecutar:**
```powershell
node scripts/fix-imports.js
```

---

## ✅ VERIFICACIÓN (30 min)

### Paso 8.1: Verificar estructura

```powershell
# Verificar que todo está en su lugar
tree /F frontend/src | head -50   # Ver estructura frontend
tree /F backend | head -50         # Ver estructura backend
tree /F landing | head -50         # Ver estructura landing
tree /F docs | head -50            # Ver estructura docs
```

### Paso 8.2: Testear localmente

```powershell
# Abrir 4 terminales en VS Code

# Terminal 1: Backend
cd backend
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Landing
cd landing
npm run dev

# Terminal 4: Monitor
docker ps  # Si usas Docker
```

### Paso 8.3: Verificar en browser

- Landing: http://localhost:3000
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- Admin: http://localhost:8000/admin

---

## 🎯 CHECKLIST FINAL

- [ ] Todas las carpetas creadas
- [ ] Código movido a `frontend/`
- [ ] Documentación en `docs/`
- [ ] Docker configurado
- [ ] Imports actualizados
- [ ] Frontend corre en localhost:5173
- [ ] Backend corre en localhost:8000
- [ ] Landing corre en localhost:3000
- [ ] Database conectada
- [ ] Todos los tests pasan
- [ ] Git commit: "refactor: Migrar a estructura profesional"

---

## 🆘 TROUBLESHOOTING

### "Los imports no funcionan"
→ Verificar que `vite.config.js` tiene `alias` para `@`

### "Backend dice 'migrate' no encontrado"
→ Asegurar que estés en correcta subcarpeta

### "Port 8000 ya en uso"
→ `lsof -i :8000` → `kill -9 <PID>`

### "Docker no funciona"
→ `docker ps` → `docker-compose down` → `docker-compose up --build`

---

**Tiempo total:** 4-6 horas
**Resultado:** Proyecto profesional y escalable ✅

