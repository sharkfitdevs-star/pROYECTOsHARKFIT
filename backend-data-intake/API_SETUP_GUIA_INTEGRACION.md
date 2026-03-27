# 🚀 GUÍA DE INTEGRACIÓN - API SETUP WEB

## ¿Qué se creó?

### Backend (`/backend-data-intake/src/routes/apiSetup.js`)
- ✅ 5 endpoints REST para validar y crear configuraciones
- ✅ Validación de URLs, autenticación y endpoints
- ✅ Protegido con autenticación (JWT)

```
POST /api/setup/validate-url      → Validar URL accesible
POST /api/setup/test-auth        → Probar credenciales
POST /api/setup/test-endpoint    → Verificar endpoint devuelve datos
POST /api/setup/create           → Guardar configuración
GET  /api/setup/list             → Listar APIs configuradas
```

### Frontend (`/frontend/src/components/APIIntegrationSetup.jsx`)
- ✅ Componente React con 4 pasos interactivos
- ✅ Validaciones en tiempo real
- ✅ Interfaz super user-friendly
- ✅ Estilos CSS modernos y responsive

## Como Integrar en el Dashboard

### 1. Importar el Componente

En tu archivo principal del dashboard (ej: `frontend/src/pages/Dashboard.jsx`):

```jsx
import APIIntegrationSetup from '../components/APIIntegrationSetup';

function Dashboard() {
  const [showAPISetup, setShowAPISetup] = useState(false);

  return (
    <div className="dashboard">
      {/* ... resto del dashboard ... */}

      {showAPISetup ? (
        <APIIntegrationSetup />
      ) : (
        <button onClick={() => setShowAPISetup(true)}>
          🚀 Integración de APIs
        </button>
      )}
    </div>
  );
}
```

### 2. Agregar al Menú

En tu navbar/menú principal, agrega un botón:

```jsx
<NavItem>
  <Link to="/setup-api">
    🔌 Conectar APIs
  </Link>
</NavItem>
```

O como ruta en `frontend/src/App.jsx`:

```jsx
import APIIntegrationSetup from './components/APIIntegrationSetup';

<Route path="/setup-api" element={<APIIntegrationSetup />} />
```

### 3. Lugar Lógico en el Dashboard

Sugiero que aparezca en:
- **Menú principal** → "Integraciones" o "Datos"
- **Vista de Configuración** → "Agregar Fuente de Datos"
- **Modal flotante** → Cuando usuario hace click en "Conectar datos"

---

## Flujo de Usuario

```
1️⃣ Usuario hace login
      ↓
2️⃣ Va a Dashboard → "Integración de APIs"
      ↓
3️⃣ Paso 1: Ingresa nombre + URL de API
   - Valida que URL sea accesible
      ↓
4️⃣ Paso 2: Elige tipo de autenticación
   - API Key, Bearer Token, Basic Auth, OAuth
   - Prueba que funciona
      ↓
5️⃣ Paso 3: Define endpoints y campos
   - /productos → colección "productos"
   - /customers → colección "customers"
   - Valida que cada endpoint devuelve datos
      ↓
6️⃣ Paso 4: Resumen y guardar
   - Muestra lo que se va a crear
   - Explica dónde van las credenciales (.env)
   - Guarda configuración JSON
      ↓
7️⃣ Sistema automáticamente:
   - ✅ Crea configs/api-xxx.json (sin credenciales)
   - ✅ Guarda credenciales en .env (local, no GitHub)
   - ✅ Está listo para usar: npm run extract -- --config api-xxx
```

---

## Seguridad Implementada

### ✅ En el Backend
- Autenticación requerida (JWT)
- Validación de URLs y credenciales
- Las credenciales se guardan en `.env` nunca en archivos

### ✅ En el Frontend
- Campos password mostrados como `••••`
- Los tokens nunca se mostraban en consola
- Validación antes de enviar al servidor

### ✅ En GitHub
```
configs/*.json       → ✅ SE VERSIONA (sin credenciales)
.env                → ❌ NO SE VERSIONA (.gitignore)
src/routes/apiSetup.js → ✅ SE VERSIONA (código público)
```

---

## Variables de Entorno Requeridas

En `.env` del backend:

```env
# Autenticación
JWT_SECRET=tu-secret-muy-seguro

# CORS
CORS_ORIGIN=http://localhost:5173

# MongoDB (cuando lo tengas listo)
MONGODB_URI=mongodb://user:pass@host:27017/db

# EVO (opcional, solo si necesitas sincronizar con EVO)
EVO_BASE_URL=https://tu-instancia.com
EVO_API_KEY=tu-key
```

⚠️ **IMPORTANTE:** `EVO_BASE_URL` y `EVO_API_KEY` NO tienen valores por defecto. El código forzará que se definan en `.env` si se usan.

---

## Flujo de Datos

```
Usuario Setup (Web)
    ↓
APIIntegrationSetup.jsx (React Component)
    ↓
POST /api/setup/validate-url    (validar URL)
POST /api/setup/test-auth       (validar auth)
POST /api/setup/test-endpoint   (validar datos)
POST /api/setup/create          (guardar)
    ↓
Backend apiSetup.js
    ↓
Guarda en:
  - configs/api-xxx.json        (configuración)
  - .env                        (credenciales)
    ↓
Listo para usar:
  - npm run extract -- --config api-xxx
  - Sistema extrae datos → MongoDB
```

---

## Testing

### 1. Test Backend Endpoints

```bash
# Instalar en backend
npm install

# Activar servidor
npm run dev

# Test con curl
curl -X POST http://localhost:3001/api/setup/validate-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.shopify.com"}'
```

### 2. Test Frontend Component

Para testing rápido:

```jsx
import APIIntegrationSetup from './components/APIIntegrationSetup';

export default function TestPage() {
  return <APIIntegrationSetup />;
}
```

### 3. Test Completo End-to-End

1. Login en la web
2. Ir a "Integración de APIs"
3. Crear una API de test (ej: jsonplaceholder.typicode.com)
4. Verificar que `configs/api-xxx.json` se creó
5. Verificar que credenciales están en `.env`
6. Ejecutar: `npm run extract -- --config api-xxx`

---

## Limitaciones Actuales

### No Implementado (Para Futuro)
- [ ] Editar configuraciones existentes
- [ ] Eliminar APIs configuradas
- [ ] Sincronización automática en horarios
- [ ] Historial de extracciones
- [ ] Dashboard de monitoreo de APIs

### Estos se pueden agregar fácilmente después.

---

## Archivo Cambiado: server.js

Se agregaron:

```javascript
// Línea 19
const apiSetupRoutes = require("./routes/apiSetup");

// Línea 212
app.use("/api/setup", apiSetupRoutes);
```

---

## Próximos Pasos

1. **Ahora:** Integrar componente en el dashboard
2. **Pronto:** Prueba end-to-end con MongoDB real
3. **Después:** Sincronización automática
4. **Final:** Deploy a producción

---

¿Necesitas ayuda para integrar en tu dashboard específico?
