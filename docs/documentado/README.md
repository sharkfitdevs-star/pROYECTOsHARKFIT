# EVO5 INTEGRATION MIDDLEWARE - DOCUMENTACIÓN TÉCNICA COMPLETA

**Arquitectura de Sincronización Robusta entre EVO5 y Dashboard Sharkfit (v5.0)**

Bienvenido a la documentación completa de la solución de integración EVO5. Esta carpeta contiene toda la información técnica necesaria para implementar un middleware robusto, escalable y seguro.

## 📋 Características

- ✅ **Importación de archivos**: Excel (.xlsx) y CSV
- ✅ **Conexión a bases de datos**: SQLite (proxy local)
- ✅ **Integración con APIs**: EVO, W12 y cualquier API REST externa
- ✅ **Webhooks en tiempo real**: Recibir eventos automáticamente
- ✅ **Sincronización incremental**: Polling con `updatedAt` para eficiencia
- ✅ **Estadísticas calculadas**: Ventas, clientes activos, retención, churn, leads
- ✅ **Validación y mapeo de campos**: Schema unificado para múltiples fuentes
- ✅ **Rate limiting**: Protección contra abuso
- ✅ **Logging avanzado**: Winston con archivos de logs
- ✅ **Auditoría completa**: Registro de cambios y sincronizaciones

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express 4.18 |
| **Base de datos** | MongoDB (proxy + microservicios); `SQLite` referencias históricas |
| **Procesamiento Excel** | ExcelJS |
| **Procesamiento CSV** | csv-parser |
| **HTTP Client** | Axios |
| **Validación** | Joi |
| **Logging** | Winston |
| **Testing** | Jest + Supertest |

---

## 📁 Estructura del Proyecto

```
backend-data-intake/
├── src/
│   ├── models/                # Mongoose schemas
│   │   ├── Cliente.js
│   │   ├── Venta.js
│   │   ├── Lead.js
│   │   └── index.js           # Actividad, Membresia, SyncLog
│   │
│   ├── services/              # Lógica de negocio
│   │   ├── ImportService.js   # Excel/CSV import
│   │   ├── SyncService.js     # API sync + webhooks
│   │   └── StatsService.js    # Cálculo de métricas
│   │
│   ├── controllers/
│   │   └── StatsController.js
│   │
│   ├── routes/                # Endpoints HTTP
│   │   ├── import.js
│   │   ├── sync.js
│   │   ├── stats.js
│   │   ├── webhooks.js
│   │   ├── sources.js
│   │   └── auth.js
│   │
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   │
│   ├── utils/
│   │   └── logger.js
│   │
│   └── server.js              # Punto de entrada
│
├── logs/                      # Archivos de log
├── uploads/                   # Archivos temporales (Excel/CSV)
├── .env.example               # Variables de entorno
├── package.json
└── README.md
```

---

## ⚡ Quick Start

### 1. Requisitos Previos

```bash
node --version   # >= 18.0.0
npm --version    # >= 9.0.0
```

### 2. Instalación

```bash
# Clonar o navegar al directorio
cd backend-data-intake

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus valores
nano .env
```

### 3. Configurar Variables de Entorno

Editar `.env`:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# APIs externas (si aplica)
EVO_BASE_URL=https://api.evo.com
EVO_API_KEY=tu-api-key

W12_BASE_URL=https://api.w12app.com
W12_API_KEY=tu-api-key
```

### 4. Iniciar Servidor

**Modo desarrollo (con hot reload):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

El servidor estará disponible en: http://localhost:5000

---

## 📊 Endpoints Disponibles

### Health Check

```http
GET /health
```

Respuesta:
```json
{
  "status": "OK",
  "timestamp": "2024-02-10T10:30:00Z",
  "sqlite": "connected",
  "uptime": 120
}
```

### 📥 Importación

#### Importar Excel

```http
POST /api/import/excel
Content-Type: multipart/form-data

file: [archivo.xlsx]
mapeo: {
  "Nombre Cliente": "nombre",
  "Correo": "email",
  "Teléfono": "telefono",
  "RFC": "rfc",
  "Estado": "estado"
}
entidad: "clientes"
```

#### Importar CSV

```http
POST /api/import/csv
Content-Type: multipart/form-data

file: [archivo.csv]
mapeo: { ... }
delimitador: ","
entidad: "clientes"
```

#### Vista Previa

```http
POST /api/import/preview
Content-Type: multipart/form-data

file: [archivo.xlsx]
```

### 🔄 Sincronización

#### Ejecutar Sincronización Manual

```http
POST /api/sync/run
Content-Type: application/json

{
  "sourceId": "evo-principal",
  "modo": "incremental",
  "entidades": ["clientes", "ventas"]
}
```

#### Obtener Estado

```http
GET /api/sync/status/:syncId
```

#### Ver Logs

```http
GET /api/sync/logs?limit=20&sourceId=EVO
```

### 📊 Estadísticas

#### Resumen General

```http
GET /api/stats/summary?desde=2024-01-01&hasta=2024-02-10
```

Respuesta:
```json
{
  "exito": true,
  "datos": {
    "ventas": {
      "monto": 45230.50,
      "cantidad": 34,
      "promedio": 1330.31,
      "moneda": "MXN"
    },
    "clientes": {
      "activos": 287,
      "nuevo": 12,
      "porVencer": 8,
      "tasaRetención": 92.5
    },
    "leads": {
      "pendientes": 45,
      "encalificación": 12,
      "ganados": 5,
      "perdidos": 2
    }
  }
}
```

#### Ventas por Semana

```http
GET /api/stats/ventas-weekly
```

#### Clientes por Estado

```http
GET /api/stats/clientes-estado
```

#### Membresías Próximas a Vencer

```http
GET /api/stats/membresias-proximasVencer?dias=7
```

#### Análisis de Churn

```http
GET /api/stats/churn-analysis?periodo=30
```

### 📨 Webhooks

#### EVO Webhook

```http
POST /api/webhooks/evo
X-Signature: firma-secreta

{
  "evento": "cliente.creado",
  "timestamp": "2024-02-10T10:30:00Z",
  "data": {
    "id": "12345",
    "nombre": "Acme Corp",
    "email": "contacto@acme.com"
  }
}
```

---

## 🔐 Seguridad

- **Rate Limiting**: 100 req/15 min (general), 5 req/hora (importaciones)
- **CORS**: Configurado para frontend en `http://localhost:5173`
- **Helmet**: Headers de seguridad HTTP
- **Validación**: Joi para entrada de datos
- **Logs**: Winston con rotación de archivos

---

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Con cobertura
npm test -- --coverage

# Test específico
npm test -- syncService.test.js
```

---

## 🐳 Docker (Opcional)

```bash
# Build imagen
docker build -t sharkfit-backend .

# Ejecutar
docker run -p 5000:5000 \
  sharkfit-backend
```

---

## 📈 Monitoreo y Logs

**Logs disponibles en:**
- `logs/combined.log` - Todos los logs
- `logs/error.log` - Solo errores

**Ver logs en tiempo real:**
```bash
tail -f logs/combined.log
```

---

## 🛠️ Desarrollo

### Agregar Nueva Fuente de Datos

1. Crear mapeo en `config`:
```javascript
const nuevoMapeo = {
  'id_externo': 'eventoId',
  'nombre_completo': 'nombre',
  'correo_electronico': 'email'
};
```

2. Configurar en frontend: **Configuración → Fuentes de Datos**

3. Ejecutar sincronización

### Agregar Nueva Entidad

1. Crear modelo en `src/models/NuevaEntidad.js`
2. Agregar servicio de importación
3. Crear rutas en `src/routes/`

---

## 🚨 Troubleshooting

### Error: "SQLite database not found"

```bash
# Verificar que exista el archivo SQLite
ls backend/db.sqlite3
```

### Error: "File upload limit exceeded"

Aumentar límite en `.env`:
```env
MAX_FILE_SIZE_MB=100
```

### Error: "Rate limit exceeded"

El endpoint está siendo llamado demasiado frecuentemente. Espera 15 minutos.

---

## 📚 Documentación Adicional

- [ARQUITECTURA_DATOS_REALES.md](../ARQUITECTURA_DATOS_REALES.md) - Schema y flujos
- [API_ENDPOINTS.md](docs/API_ENDPOINTS.md) - Documentación completa de API
- [INTEGRACION_EVO.md](docs/INTEGRACION_EVO.md) - Detalles de integración EVO

---

## 👥 Contribuir

1. Fork el proyecto
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Add nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request

---

## 📄 Licencia

MIT
