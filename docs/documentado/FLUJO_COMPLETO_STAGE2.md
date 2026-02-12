# 🔌 FLUJO COMPLETO: FRONTEND → HOOKS → SERVICIOS → API → DJANGO

**Nota 2026:** El proyecto actual usa SQLite; las referencias a PostgreSQL/Mongo en este documento son historicas.

## Resumen Visual

```
UI COMPONENT (ListarClientesEjemplo.jsx)
         ↓
       HOOK (useClientes.js)
         ↓
      SERVICE (clientesService.js)
         ↓
    HTTP CLIENT (client.js con interceptores)
         ↓
   BACKEND API (Django REST Framework)
         ↓
      DATABASE (SQLite)
```

---

## 1. COMPONENTE (ListarClientesEjemplo.jsx)

El componente es **puramente de presentación**:

```jsx
function ListarClientes() {
  const {
    clientes,           // Datos
    loading,            // Estado
    error,              // Errores
    handleCreate,       // Acciones
    handleUpdate,
    handleDelete,
  } = useClientes()      // ← Toda la lógica aquí

  return (
    <div>
      {clientes.map(c => (
        <button onClick={() => handleUpdate(c.id, data)}>
          Actualizar
        </button>
      ))}
    </div>
  )
}
```

### Responsabilidades del Componente:
- ✅ Renderizar UI
- ✅ Manejar eventos (clicks, form changes)
- ✅ Llamar funciones del hook
- ❌ NO llamar axios directamente
- ❌ NO hacer lógica de negocio
- ❌ NO administrar estado complejo

---

## 2. HOOK PERSONALIZADO (useClientes.js)

El hook **orquesta la lógica**: conecta el componente con los servicios

```jsx
function useClientes() {
  // Estado local
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  // Obtener datos (usando hook genérico useFetch)
  const { data, loading: fetchLoading, error: fetchError, refetch } = useFetch(
    () => clientesService.getAll({ page })
  )

  // Sincronizar datos
  useEffect(() => {
    setClientes(data || [])
  }, [data])

  // Crear cliente
  const handleCreate = useCallback(async (clienteData) => {
    try {
      setLoading(true)
      const resultado = await clientesService.create(clienteData)
          //                 ↑↑↑ Aquí llama al servicio
      setClientes([...clientes, resultado])
      return resultado
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [clientes])

  // Exportar funciones y estado al componente
  return {
    clientes,
    loading,
    error,
    page,
    setPage,
    handleCreate,
    handleUpdate: async (id, data) => { /* ... */ },
    handleDelete: async (id) => { /* ... */ },
    handleSearch: async (q) => { /* ... */ },
    refetch,
  }
}
```

### Responsabilidades del Hook:
- ✅ Administrar estado (clientes, loading, error, page)
- ✅ Orquestar servicios
- ✅ Manejar errores
- ✅ Refetch/sincronización
- ✅ Caché local
- ❌ NO renderizar componentes
- ❌ NO hacer peticiones HTTP directamente

---

## 3. SERVICIO (clientesService.js)

El servicio **agrupa operaciones CRUD** para una entidad

```javascript
class ClientesService {
  async getAll({ page = 1, limit = 20 } = {}) {
    const response = await client.get(
      endpoints.CLIENTES.LIST,
      { params: { page, limit } }
    )
    return response.data
  }

  async getById(id) {
    const response = await client.get(
      endpoints.CLIENTES.DETAIL(id)  // "/api/clientes/123"
    )
    return response.data
  }

  async create(clienteData) {
    const response = await client.post(
      endpoints.CLIENTES.CREATE,     // "/api/clientes/"
      clienteData
    )
    return response.data
  }

  async update(id, clienteData) {
    const response = await client.put(
      endpoints.CLIENTES.UPDATE(id), // "/api/clientes/123"
      clienteData
    )
    return response.data
  }

  async delete(id) {
    await client.delete(
      endpoints.CLIENTES.DELETE(id)  // "/api/clientes/123"
    )
  }

  async search(query) {
    const response = await client.get(
      endpoints.CLIENTES.SEARCH,     // "/api/clientes/search"
      { params: { q: query } }
    )
    return response.data
  }

  async exportar(formato = 'csv') {
    const response = await client.get(
      endpoints.CLIENTES.EXPORT,
      { params: { format: formato } }
    )
    return response.data
  }
}

export default new ClientesService()
```

### Responsabilidades del Servicio:
- ✅ Agrupar CRUD de una entidad
- ✅ Usar endpoints definidos
- ✅ Usar cliente HTTP
- ✅ Parsear respuestas
- ✅ Lanzar excepciones
- ❌ NO administrar componentes
- ❌ NO guardar estado
- ❌ NO hacer lógica UI

---

## 4. CLIENTE HTTP (client.js)

El cliente **maneja la comunicación HTTP** con una sola vez configuración

```javascript
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de REQUEST: Agregar token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Interceptor de RESPONSE: Manejar errores globales
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 → Logout
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    
    // 500 → Log
    if (error.response?.status === 500) {
      console.error('Error de servidor:', error)
    }

    return Promise.reject(error)
  }
)

export default client
```

### Responsabilidades del Cliente:
- ✅ Configurar axios (base URL, timeouts)
- ✅ Inyectar token de autenticación
- ✅ Manejar errores comunes
- ✅ Refrescar tokens
- ❌ NO saber ni care qué endpoint es

---

## 5. DEFINICIÓN DE ENDPOINTS (endpoints.js)

Los endpoints **centralizan las URLs del API**

```javascript
export const endpoints = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  
  CLIENTES: {
    LIST: '/clientes/',
    CREATE: '/clientes/',
    DETAIL: (id) => `/clientes/${id}`,
    UPDATE: (id) => `/clientes/${id}`,
    DELETE: (id) => `/clientes/${id}`,
    SEARCH: '/clientes/search',
    EXPORT: '/clientes/export',
  },
  
  VENTAS: {
    LIST: '/ventas/',
    CREATE: '/ventas/',
    DETAIL: (id) => `/ventas/${id}`,
    CAMBIAR_ESTADO: (id) => `/ventas/${id}/cambiar-estado`,
  },
  // ... más entidades
}
```

### Beneficios:
- ✅ **Tipografía segura**: No hay URLs hardcodeadas
- ✅ **Fácil refactoring**: Cambiar URL en 1 lugar
- ✅ **Documentación**: Lista clara de endpoints disponibles
- ✅ **Evita typos**: IDE autocompleta

---

## 6. BACKEND DJANGO (TODO)

El backend **procesa las peticiones y persiste datos**

```python
# backend/apps/clientes/models.py
from django.db import models

class Cliente(models.Model):
    ESTADOS = [
        ('prospecto', 'Prospecto'),
        ('activo', 'Activo'),
        ('suspendido', 'Suspendido'),
        ('baja', 'Baja'),
    ]
    
    nombre = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='prospecto')
    
    class Meta:
        ordering = ['-created_at']
```

```python
# backend/apps/clientes/serializers.py
from rest_framework import serializers
from .models import Cliente

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'
```

```python
# backend/apps/clientes/views.py
from rest_framework.viewsets import ModelViewSet
from .models import Cliente
from .serializers import ClienteSerializer

class ClienteViewSet(ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    
    def create(self, request, *args, **kwargs):
        # POST /api/clientes/ → aquí llega
        return super().create(request, *args, **kwargs)
```

```python
# backend/config/urls.py
from rest_framework.routers import DefaultRouter
from apps.clientes.views import ClienteViewSet

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
```

---

## 🔄 FLUJO COMPLETO DE UNA OPERACIÓN

### Escenario: Usuario hace click en "Crear Cliente"

```
┌─────────────────────────────────────────────────┐
│ 1. COMPONENTE: Click en botón                   │
│    onClick={() => handleCreate(formData)}       │
└───────────────┬─────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────┐
│ 2. HOOK: Recibe el llamado                      │
│    handleCreate(clienteData) {                  │
│      await clientesService.create(clienteData)  │
│    }                                            │
└───────────────┬─────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────┐
│ 3. SERVICIO: Prepara y envía                   │
│    async create(data) {                         │
│      return await client.post(                  │
│        endpoints.CLIENTES.CREATE,               │
│        data                                     │
│      )                                          │
│    }                                            │
└───────────────┬─────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────┐
│ 4. CLIENTE HTTP: Inyecta token y envía         │
│    POST /api/clientes/                          │
│    Headers: {                                   │
│      Authorization: Bearer <token>,             │
│      Content-Type: application/json             │
│    }                                            │
│    Body: { nombre, email, ... }                 │
└───────────────┬─────────────────────────────────┘
                ↓
         [INTERNET]
                ↓
┌─────────────────────────────────────────────────┐
│ 5. DJANGO BACKEND: Procesa                      │
│    ClienteViewSet.create()                      │
│      - Valida con ClienteSerializer             │
│      - Guarda en con save()                     │
│      - Devuelve JSON                            │
└───────────────┬─────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────┐
│ 6. CLIENTE HTTP: Recibe respuesta               │
│    Status: 201 Created                          │
│    Body: { id, nombre, email, estado, ... }    │
└───────────────┬─────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────┐
│ 7. SERVICIO: Retorna datos                      │
│    return response.data                         │
└───────────────┬─────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────┐
│ 8. HOOK: Actualiza estado                       │
│    setClientes([...clientes, resultado])        │
│    setLoading(false)                            │
└───────────────┬─────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────┐
│ 9. COMPONENTE: Re-renderiza con nuevo cliente   │
│    {clientes.map(c => <ClienteRow client={c}/> │
└─────────────────────────────────────────────────┘
```

---

## ✅ VENTAJAS DE ESTA ARQUITECTURA

### 1. **Separación de Responsabilidades**
- Componentes: UI pura
- Hooks: Lógica de negocio
- Servicios: Operaciones de API
- Cliente: Comunicación HTTP
- Backend: Persistencia

### 2. **Testeable**
```javascript
// test/hooks/useClientes.test.js
jest.mock('../../services/clientesService')

test('useClientes crea cliente correctamente', async () => {
  clientesService.create.mockResolvedValue({ id: 1, nombre: 'Test' })
  
  const { result } = renderHook(() => useClientes())
  
  await act(async () => {
    await result.current.handleCreate({ nombre: 'Test' })
  })
  
  expect(result.current.clientes).toHaveLength(1)
})
```

### 3. **Reutilizable**
- Múltiples componentes pueden usar `useClientes()`
- Múltiples servicios pueden usar `client`
- Múltiples apps (frontend/landing) comparten servicios

### 4. **Mantenible**
- Cambiar endpoint de clientes: 1 cambio en `endpoints.js`
- Cambiar lógica de validación: 1 cambio en `useClientes.js`
- Cambiar token auth: 1 cambio en `client.js`

### 5. **Escalable**
- Agregar nuevas entidades: Copiar patrón de `ClientesService`
- Agregar nuevas páginas: Copiar patrón de `ListarClientesEjemplo`
- Agregar cache: 1 línea en `useClientes()`

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Frontend (Stage 2) - ✅ COMPLETADO
- ✅ `api/client.js` - Cliente HTTP configurado
- ✅ `api/endpoints.js` - URLs centralizadas
- ✅ `api/services/*.js` - 6 servicios con CRUD
- ✅ `hooks/useFetch.js` - Hook genérico
- ✅ `hooks/useForm.js` - Manejo de formularios
- ✅ `hooks/useAuth.js` + 4 más - Hooks por entidad
- ✅ `components/features/ListarClientesEjemplo.jsx` - Componente ejemplo
- ✅ `config/constants.js` - Constantes de app

### Backend (Stage 3) - ⚠️ PENDIENTE
- ⬜ `apps/clientes/models.py` - Modelo Cliente
- ⬜ `apps/clientes/serializers.py` - Serializador
- ⬜ `apps/clientes/views.py` - ViewSet
- ⬜ `apps/clientes/urls.py` - Rutas
- ⬜ Repetir para ventasService, alertasService, agendamientosService, usuariosService, reportesService

### Backend Data Intake (Stage 4) - ⚠️ PENDIENTE
- ⬜ Completar `src/controllers/auth.js`
- ⬜ Completar `src/services/sync.js`
- ⬜ Completar `src/webhooks.js`
- ⬜ MongoDB models para sincronización

---

## 🚀 PRÓXIMO PASO

**Stage 3: Django Backend**

Crear modelos, serializadores y viewsets para cada entidad:
1. `apps/clientes/` - Gestión de clientes
2. `apps/ventas/` - Gestión de ventas
3. `apps/agendamientos/` - Gestión de citas
4. `apps/alertas/` - Sistema de alertas
5. `apps/usuariosService/` - Gestión de usuarios
6. `apps/reportes/` - Reportes y análisis

Cada uno seguirá el mismo patrón:
- `models.py` → Definir structure de datos
- `serializers.py` → Validar entrada/salida
- `views.py` → Lógica endpoint (CRUD + custom)
- `urls.py` → Registrar rutas

---

## 📚 REFERENCIAS

- [React Hooks Docs](https://react.dev/reference/react/hooks)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Service Layer Pattern](https://en.wikipedia.org/wiki/Service_locator_pattern)
