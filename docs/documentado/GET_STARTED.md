# 🦈 Dashboard Sharkfit v2.0 - Guía de Inicio

**Estado:** ✅ Etapa 1 Completada (Scaffold Frontend + Landing)  
**Fecha:** Febrero 2026

---

## 🚀 Quick Start (5 minutos)

### Opción 1: Con Docker (Recomendado)
```bash
# Copiar variables de entorno
cp .env.example .env

# Instalar y correr todo
docker-compose up --build
```

Espacios disponibles:
- **Frontend Dashboard:** http://localhost:5173
- **Landing Page:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Admin Django:** http://localhost:8000/admin

---

### Opción 2: Local (Sin Docker)

#### 1️⃣ Frontend (puerto 5173)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# http://localhost:5173
```

#### 2️⃣ Landing (puerto 3000)
```bash
cd landing
npm install
cp .env.example .env
npm run dev
# http://localhost:3000
```

#### 3️⃣ Backend (puerto 8000)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Migrations (primera vez)
python manage.py migrate

# Crear superuser
python manage.py createsuperuser

# Correr
python manage.py runserver 0.0.0.0:8000
# http://localhost:8000
```

#### 4️⃣ Data Intake (puerto 5000 - Opcional)
```bash
cd backend-data-intake
npm install
npm start
# http://localhost:5000
```

---

## 📁 Estructura Creada (Esta Semana)

```
✅ ETAPA 1: Scaffold Frontend + Landing
├── frontend/
│   ├── vite.config.js                    ✨ Nuevo
│   ├── index.html                        ✨ Nuevo
│   ├── src/main.jsx                      ✨ Nuevo
│   ├── src/App.jsx                       ✨ Nuevo
│   ├── src/index.css                     ✨ Nuevo
│   ├── src/App.css                       ✨ Nuevo
│   ├── src/pages/
│   │   ├── Home.jsx                      ✨ Nuevo
│   │   └── dashboard/
│   │       └── Dashboard.jsx             ✨ Nuevo (placeholder)
│   └── src/styles/
│       ├── Home.css                      ✨ Nuevo
│       └── Dashboard.css                 ✨ Nuevo
│
├── landing/
│   ├── vite.config.js                    ✨ Nuevo
│   ├── index.html                        ✨ Nuevo
│   ├── src/main.jsx                      ✨ Nuevo
│   ├── src/App.jsx                       ✨ Nuevo
│   ├── src/index.css                     ✨ Nuevo
│   ├── src/App.css                       ✨ Nuevo
│   └── src/components/
│       ├── Header.jsx/.css               ✨ Nuevo
│       ├── Hero.jsx/.css                 ✨ Nuevo
│       ├── Features.jsx/.css             ✨ Nuevo
│       ├── Pricing.jsx/.css              ✨ Nuevo
│       └── Footer.jsx/.css               ✨ Nuevo
│
├── .env.example                          ✨ Nuevo (global)
├── .gitignore                            ✨ Nuevo
└── README.md                             ✨ Este archivo
```

---

## ✨ Qué hace cada parte

### 🎨 Frontend Dashboard (`frontend/`)
- **Tabla de control:** Overview con métricas
- **Navegación lateral:** Clientes, Ventas, Alertas
- **Estructura lista:** Para integrar APIs reales (próxima etapa)
- **Responsive:** Funciona en desktop y mobile

### 🌐 Landing Page (`landing/`)
- **Marketing website:** Presentación del producto
- **SEO friendly:** Estructura HTML5 clara
- **Responsive design:** Mobile-first
- **Componentes reutilizables:** Header, Hero, Features, Pricing, Footer

### 🔌 Backend (`backend/`)
- **Django REST API:** Estructura lista para modelos/vistas
- **8 apps:** Core, Usuarios, Clientes, Ventas, Agendamientos, Alertas, Reportes, Webhooks
- **SQLite:** Base de datos local (`db.sqlite3`)
- **CORS configurado:** Para conectar con frontend

### 📊 Data Intake (`backend-data-intake/`)
- **API Express.js:** Sincronización de datos
- **Soporte:** EVO, W12, APIs custom
- **SQLite:** Persistencia local para sync
- **Webhooks:** Recibir eventos en tiempo real

---

## 🎯 Próximos Pasos (Etapa 2)

En las próximas horas:
- [ ] Crear **API services** centralizados en frontend
- [ ] Crear **custom hooks** reutilizables
- [ ] Conectar frontend ↔ backend
- [ ] Crear modelos Django reales
- [ ] Migrar 60+ componentes a nuevos hooks

---

## 🐛 Troubleshooting

### ❌ Error: "Cannot find module 'react-router-dom'"
```bash
cd frontend
npm install react-router-dom
npm run dev
```

### ❌ Puerto 5173 ya en uso
```bash
# Cambiar puerto en vite.config.js
server: {
  port: 5174,  // ← cambiar aquí
}
```

### ❌ Docker compose falla
```bash
# Limpiar y reintentar
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### ❌ Base de datos no se conecta
```bash
# Verificar que exista el archivo SQLite
ls backend/db.sqlite3
```

---

## 📚 Documentación de Referencia

- [INDICE_MAESTRO.md](./INDICE_MAESTRO.md) - Navegar documentación
- [ARQUITECTURA_DETALLADA.md](./docs/arquitectura/ARQUITECTURA_DETALLADA.md) - Cómo funciona todo
- [PLAN_MIGRACION_PASO_A_PASO.md](./docs/arquitectura/PLAN_MIGRACION_PASO_A_PASO.md) - Pasos implementación
- [EJEMPLOS_CODIGO_LISTOS.md](./docs/arquitectura/EJEMPLOS_CODIGO_LISTOS.md) - Copy-paste código

---

## 🛠️ Tech Stack

| Componente | Tech | Versión |
|-----------|------|---------|
| Frontend | React + Vite | 18 + 5 |
| Landing | React + Vite | 18 + 5 |
| Backend | Django REST | 4.2 |
| Data Intake | Express.js | 4.18 |
| Database | SQLite | 3 |
| Sync DB | SQLite | 3 |
| Cache/Queue | Redis | 5.0+ |
| Deploy | Docker | 20+ |

---

## 🔐 Seguridad

⚠️ **IMPORTANTE:**
- `.env` es ignorado por Git (no commitear)
- Copiar `.env.example` → `.env`
- **Nunca** usar las claves de desarrollo en producción
- Cambiar `SECRET_KEY` en producción

---

## 👥 Contribuir

1. Crear branch: `git checkout -b feature/tu-feature`
2. Hacer cambios y commit
3. Push: `git push origin feature/tu-feature`
4. Crear PR en GitHub

---

## 📞 Soporte

- **Docs:** Leer [INDICE_MAESTRO.md](./INDICE_MAESTRO.md)
- **Issues:** Crear en GitHub
- **Contacto:** tech@sharkfit.com

---

## 📄 Licencia

Todos los derechos reservados © 2026 Sharkfit
