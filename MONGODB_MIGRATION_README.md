# SharkFit Dashboard - Node.js + MongoDB

## 🏗️ Arquitectura

**Stack Tecnológico:**
- Backend: Node.js + Express + MongoDB (Mongoose)
- Frontend: React 18 + Vite
- Base de Datos: MongoDB 7.0
- Autenticación: JWT + bcrypt

## 🏗️ Estructura del Backend

### Backend (Node.js + Express + MongoDB)
- **Framework**: Express.js
- **Base de Datos**: MongoDB con Mongoose ODM
- **Autenticación**: JWT (JSON Web Tokens)
- **Puerto**: 8000

### Módulos Implementados

1. **Auth** (`/api/auth`)
   - Login
   - Register
   - Me (usuario autenticado)
   - Logout

2. **Usuarios** (`/api/usuarios`)
   - CRUD completo de usuarios
   - Roles: admin, manager, instructor, recepcionista, vendedor

3. **Clientes** (`/api/clientes`)
   - CRUD completo de clientes
   - Búsqueda y filtros
   - Estadísticas

4. **Ventas** (`/api/ventas`)
   - CRUD completo de ventas
   - Estados de pago
   - Tipos de venta
   - Estadísticas

5. **Agendamientos** (`/api/agendamientos`)
   - CRUD completo de citas/clases
   - Estados y tipos
   - Gestión de capacidad

6. **Alertas** (`/api/alertas`)
   - Sistema de alertas
   - Prioridades
   - Resolución de alertas

7. **Reportes** (`/api/reportes`)
   - Generación de reportes
   - Múltiples tipos
   - Programación

8. **Sync** (`/api/sync`)
   - Sincronización con APIs externas (EVO, W12)
   - Logs de sincronización
   - Status en tiempo real

## 📦 Modelos MongoDB con Índices Optimizados

### ⚡ Índices de Base de Datos

**SÍ, mantenemos índices en MongoDB** y son cruciales para el rendimiento:

#### ✅ Beneficios de los Índices:
1. **Reducen I/O dramáticamente**: En lugar de escanear toda la colección (Table Scan), MongoDB usa el índice para ir directamente a los documentos relevantes
2. **Búsquedas 10-100x más rápidas**: Queries con filtros usan índices B-tree
3. **Ordenamiento eficiente**: Evita sorting en memoria
4. **Agregaciones optimizadas**: Pipelines aprovechan índices
5. **Menos CPU y memoria**: El servidor trabaja menos

#### 📊 Ejemplo de Impacto:

**Sin índice** en `email`:
- Buscar cliente por email → Escanea 100,000 documentos → 500ms
- I/O: Lee todos los documentos de disco

**Con índice** en `email`:
- Buscar cliente por email → Usa índice → 5ms

// Índices definidos:
- idSale: unique index
- idMember: index (ventas por cliente)
- idBranch: index (ventas por sucursal)
- saleType: index (filtro por tipo)
- amount: index (ordenar por monto)
- saleDate: index (ordenar por fecha)
- paymentStatus: index (filtro estado pago)
- paymentMethod: index (filtro método pago)
- { idBranch: 1, saleDate: -1 } compound
- { idMember: 1, saleDate: -1 } compound
- { paymentStatus: 1, dueDate: 1 } compound
- { saleType: 1, saleDate: -1 } compound
- I/O: Solo lee el índice + documento encontrado (2-3 lecturas)

### Cliente
```javascript
{
  uniqueId, idMember, name, email, cellPhone,
  birthDate, cpf, sex, active, status,
  idBranch, branchName, membershipStatus,
  planName, address, emergencyContact,
  registrationDate, lastUpdate, source
}

// Índices definidos:
- uniqueId: unique index (búsqueda por ID único)
- idMember: index (búsqueda por member ID)
- name: index (búsqueda por nombre)
- email: index, sparse (búsqueda por email)
- active: index (filtro activo/inactivo)
- status: index (filtro por estado)
- idBranch: index (filtro por sucursal)
- { idBranch: 1, active: 1 } compound (queries mixtas)
- { name: 'text', email: 'text' } text index (búsqueda texto)
```

### Venta
```javascript
{
  idSale, idMember, memberName, idBranch,
  saleType, amount, discount, totalAmount,
  saleDate, paymentStatus, paymentMethod,
  items, source
}
```

### Usuario
```javascript
{
  username, email, password (hashed),
  firstName, lastName, role, permissions,
  idBranch, active, phone, hireDate,
  lastLogin, preferences
}
```

### Agendamiento
```javascript
{
  idAppointment, idMember, idBranch,
  appointmentType, title, className,
  startDate, endDate, status, maxCapacity,
  confirmed, checkedIn
}
```

### Alerta
```javascript
{
  idAlert, type, priority, status,
  title, description, idMember, idBranch,
  alertData, assignedTo, resolvedAt
}
```

### Reporte
```javascript
{
  idReport, reportType, title, periodType,
  startDate, endDate, data, config,
  status, generatedAt
}

```powershell
# 1. Instalar MongoDB (si no lo tienes)
choco install mongodb
# O descargar: https://www.mongodb.com/try/download/community

# 2. Iniciar MongoDB
mongod

# 3. Backend - Instalar e iniciar
cd backend-data-intake
npm install
cp .env.example .env  # Editar si es necesario
npm run dev

# 4. Frontend - Instalar e iniciar (otra terminal)
cd frontend
npm install
npm run dev
```

**Acceder:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- MongoDB: localhost:27017

### Opción 2: Docker

```powershell
docker-compose up --build

# Detener
docker-compose down

# Reset DBe up --build
```

#### 2. Acceder a la aplicación
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- MongoDB: localhost:27017

#### 3. Detener servicios
```powershell
docker-compose down
```

#### 4.Eliminar volúmenes (reset DB)
```powershell
docker-compose down -v
```

## 📚 API Endpoints

### Autenticación
```
POST   /api/auth/login      - Iniciar sesión
POST   /api/auth/register   - Registrar usuario
GET    /api/auth/me         - Usuario autenticado
POST   /api/auth/logout     - Cerrar sesión
```

### Usuarios
```
GET    /api/usuarios        - Listar usuarios
GET    /api/usuarios/:id    - Obtener usuario
POST   /api/usuarios        - Crear usuario
PUT    /api/usuarios/:id    - Actualizar usuario
DELETE /api/usuarios/:id    - Eliminar usuario
```

### Clientes
```
GET    /api/clientes        - Listar clientes
GET    /api/clientes/:id    - Obtener cliente
POST   /api/clientes        - Crear cliente
PUT    /api/clientes/:id    - Actualizar cliente
DELETE /api/clientes/:id    - Eliminar cliente
GET    /api/clientes/stats/resumen - Estadísticas
```

### Ventas
```
GET    /api/ventas          - Listar ventas
GET    /api/ventas/:id      - Obtener venta
POST   /api/ventas          - Crear venta
PUT    /api/ventas/:id      - Actualizar venta
DELETE /api/ventas/:id      - Eliminar venta
GET    /api/ventas/stats/resumen - Estadísticas
```

### Agendamientos
```
GET    /api/agendamientos        - Listar agendamientos
GET    /api/agendamientos/:id    - Obtener agendamiento
POST   /api/agendamientos        - Crear agendamiento
PUT    /api/agendamientos/:id    - Actualizar agendamiento
DELETE /api/agendamientos/:id    - Eliminar agendamiento
```

### Alertas
```
GET    /api/alertas          - Listar alertas
GET    /api/alertas/:id      - Obtener alerta
POST   /api/alertas          - Crear alerta
PUT    /api/alertas/:id      - Actualizar alerta
POST   /api/alertas/:id/resolver - Resolver alerta
```

### Reportes
```
GET    /api/reportes        - Listar reportes
GET    /api/reportes/:id    - Obtener reporte
POST   /api/reportes        - Generar reporte
DELETE /api/reportes/:id    - Eliminar reporte
```

### Sync
```
POST   /api/sync/start      - Iniciar sincronización
GET    /api/sync/logs       - Logs de sincronización
GET    /api/sync/status     - Estado de sync
```

## 🔧 Configuración

### Variables de Entorno

```env
# Node
NODE_ENV=development
PORT=8000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sharkfit

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# EVO API
EVO_API_URL=https://api.evofitness.com
EVO_API_TOKEN=your-token-here
```

## 🗄️ Base de Datos

### Conectar a MongoDB (local)
```powershell
mongosh
use sharkfit
```

### Ver colecciones
```javascript
show collections
```

### Consultas ejemplo
```javascript
// Ver clientes
db.clientes.find().pretty()

// Ver ventas
db.ventas.find().pretty()

// Ver usuarios
db.usuarios.find().pretty()

// Estadísticas
db.clientes.countDocuments()
db.ventas.countDocuments()
```

## 📝 Migración de D MongoDB

### Conectar y consultas básicas
```powershell
mongosh
use sharkfit

# Ver colecciones
show collections

# Ver clientes
db.clientes.find().pretty()

# Contar documentos
db.clientes.countDocuments()

# Ver índices de una colección
db.clientes.getIndexes()

# Estadísticas de índices (ver uso)
db.clientes.stats()
```

### 📈 Verificar uso de índices

```javascript
// Ver si una query usa índice
db.clientes.find({ email: "test@test.com" }).explain("executionStats")

// Resultado esperado:
// - "executionStages.stage": "IXSCAN" (usa índice)
// - NO "COLLSCAN" (escaneo completo = malo)

// Ver índices más usados
db.clientes.aggregate([
  { $indexStats: {} }
])
```

### ⚡ Impacto de Índices en Performance

**Query sin índice:**
```javascript
// Sin índice en "status"
db.clientes.find({ status: "activo" })
// Escanea TODOS los documentos
// I/O: ~500ms con 100k docs
```

**Query con índice:**
```javascript
// Con índice en "status"
db.clientes.find({ status: "activo" })
// Usa índice B-tree
// I/O: ~5ms con 100k docs
// Reducción: 99% menos I/O
```

**Índices compuestos para queries complejas:**
```javascript
// Query: clientes activos de una sucursal
db.clientes.find({ idBranch: "SUC001", active: true })

// Con índice compuesto { idBranch: 1, active: 1 }
// MongoDB usa ambos campos del índice
// I/O: Solo lee documentos que cumplen AMBAS condiciones
// Sin índice: Leería todos de la sucursal, luego filtraría active
### Agregar nuevo modelo
1. Crear esquema en `src/models/NuevoModelo.js`
2. Exportar en `src/models/index.js`
3. Crear rutas en `src/routes/nuevoModelo.js`
4. Montar rutas en `src/app.js`

### Agregar nuevo endpoint
1. Editar archivo de rutas correspondiente
2. Implementar lógica del controller
3. Actualizar documentación API

## 📦 Dependencias Principales

```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.0",
  "cors": "^2.8.5",
  "helmet": "^7.0.0",
  "dotenv": "^16.3.1",
  "winston": "^3.11.0"
}
```

## 🎯 Próximos Pasos

1. ✅ Modelos MongoDB completos
2. ✅ Rutas API implementadas
3. ✅ Autenticación JWT
4. ✅ Docker Compose con MongoDB
5. ⏳ Actualizar frontend para usar nueva API
6. ⏳ Documentación actualizada
7. ⏳ Tests completos

## 📖 Documentación Adicional

- [MongoDB Docs](https://docs.mongodb.com/)
- [Mongoose Docs](https://mongoosejs.com/)
- [Express Docs](https://expressjs.com/)
- [JWT Docs](https://jwt.io/)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT

## ✨ Autor

SharkFit Team
