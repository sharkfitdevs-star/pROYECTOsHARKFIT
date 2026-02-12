# 🏗️ GUÍA DE ARQUITECTURA - Dashboard Sharkfit

## Descripción General del Proyecto

**Dashboard Sharkfit** es una plataforma de gestión comercial para empresas de servicios basada en suscripción. Incluye gestión de clientes, ventas, agendamientos, alertas inteligentes y reportería avanzada.

---

## Principios de Arquitectura

### 1. **Separación de Responsabilidades**
- **API Services**: Toda comunicación con el backend
- **Hooks Custom**: Lógica de datos y estado
- **Components**: Solo renderizado y UI
- **Utils**: Funciones puras sin side effects

### 2. **DRY (Don't Repeat Yourself)**
- Servicios reutilizables para cada entidad
- Hooks genéricos para casos comunes
- Componentes shared para elementos comunes

### 3. **Single Responsibility Principle**
Cada archivo tiene una única responsabilidad:
- `clientesService.js` → Solo operaciones CRUD de clientes
- `useClientes.js` → Hook para cargar y manipular clientes
- `ClienteList.jsx` → Componente para mostrar lista

### 4. **Composición sobre Herencia**
- Usar hooks para compartir lógica
- Composición de componentes en lugar de herencia

---

## Flujo de Datos: De Backend a UI

```
Backend (Django/API)
        ↓
   Axios Request
        ↓
   API Service (clientesService.js)
        ↓
   Custom Hook (useClientes.js)
        ↓
   Component (ClienteList.jsx)
        ↓
   UI Render
```

### Ejemplo Práctico:

```
Usuario hace clic en "Cargar Clientes"
    ↓
Component llama: useClientes()
    ↓
Hook llama: clientesService.getAll()
    ↓
Service hace: axios.get('/clientes')
    ↓
Interceptor agrega: Authorization header
    ↓
Backend responde con: [{ id: 1, nombre: "Acme", ... }]
    ↓
Hook actualiza estado: setClientes(data)
    ↓
Component re-renderiza con nuevos datos
    ↓
Usuario ve lista actualizada
```

---

## Capas de la Aplicación

### **Capa 1: API Integration**
📁 `src/api/`

**Responsabilidad**: Comunicarse con el backend
**No hacer**: Lógica de negocio, manejo de estado

```
api/
├── client.js              # Axios instancia configurada
├── endpoints.js           # URLs de endpoints
├── interceptors.js        # Middleware de requests
└── services/
    ├── clientesService.js
    ├── ventasService.js
    ├── alertasService.js
    └── [...]
```

**Ejemplo - clientesService.js:**
```javascript
// ✅ CORRECTO: Simple y enfocado
export const clientesService = {
  getAll: (params) => client.get('/clientes', { params }),
  getById: (id) => client.get(`/clientes/${id}`),
  create: (data) => client.post('/clientes', data),
};
```

### **Capa 2: State & Logic**
📁 `src/hooks/` + `src/context/`

**Responsabilidad**: Manejo de estado y lógica de datos
**No hacer**: Renderizado, peticiones HTTP directas

```
hooks/
├── useClientes.js         # cargar, filtrar clientes
├── useVentas.js
├── useFetch.js            # Hook genérico de fetch
└── [...]

context/
├── AuthContext.js
├── NotificationContext.js
└── [...]
```

**Ejemplo - hooks/useClientes.js:**
```javascript
export const useClientes = (filtros) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientesService.getAll(filtros)
      .then(res => setClientes(res.data))
      .catch(err => console.error(err));
  }, [filtros]);

  return { clientes, loading };
};
```

### **Capa 3: Presentación**
📁 `src/components/` + `src/pages/`

**Responsabilidad**: Renderizar UI, capturar eventos del usuario
**No hacer**: Peticiones HTTP, lógica compleja

```
components/
├── shared/           # Componentes reutilizables (sin lógica)
│   ├── Button.jsx
│   └── Modal.jsx
├── features/         # Componentes específicos
│   └── ClienteList.jsx
└── dialogs/         # Diálogos de la aplicación

pages/
├── Clientes.jsx      # Página principal de clientes
└── ClienteDetail.jsx # Detalle de un cliente
```

**Ejemplo - Clientes.jsx:**
```javascript
export default function Clientes() {
  const { clientes, loading } = useClientes();

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1>Clientes</h1>
      <ClienteList clientes={clientes} />
    </div>
  );
}
```

### **Capa 4: Utilidades**
📁 `src/utils/` + `src/config/`

**Responsabilidad**: Funciones puras sin side effects
**No hacer**: Llamadas a API, manejo de estado

```
utils/
├── formatters.js      # formatearFecha(), formatearMoneda()
├── validators.js      # validarEmail(), validarCelular()
├── helpers.js         # funciones auxiliares
└── errorHandler.js    # mapear errores a mensajes

config/
├── api.config.js      # URLs base
├── app.config.js      # Constantes de app
└── constants.js       # Valores hardcodeados
```

---

## Patrón de Implementación para Nueva Feature

### Paso 1: Crear el Service
```javascript
// src/api/services/miFeatureService.js
export const miFeatureService = {
  getAll: () => client.get('/mi-feature'),
  create: (data) => client.post('/mi-feature', data),
  update: (id, data) => client.put(`/mi-feature/${id}`, data),
  delete: (id) => client.delete(`/mi-feature/${id}`),
};
```

### Paso 2: Crear el Hook
```javascript
// src/hooks/useMiFeature.js
export const useMiFeature = () => {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargar = async (filtros = {}) => {
    setLoading(true);
    try {
      const response = await miFeatureService.getAll(filtros);
      setDatos(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return { datos, loading, error, cargar };
};
```

### Paso 3: Usar en Componente
```javascript
// src/pages/MiFeature.jsx
import { useMiFeature } from '@/hooks/useMiFeature';

export default function MiFeature() {
  const { datos, loading, error, cargar } = useMiFeature();

  if (loading) return <Spinner />;
  if (error) return <Error mensaje={error} />;

  return (
    <div>
      <h1>Mi Feature</h1>
      <BotonRefresh onClick={() => cargar()} />
      <Lista datos={datos} />
    </div>
  );
}
```

---

## Gestión de Estado

### **Local State (useState)**
Para estado que solo usa un componente:
```javascript
const [isOpen, setIsOpen] = useState(false);
const [filtros, setFiltros] = useState({});
```

### **Hook Custom (Recomendado)**
Para lógica que se reutiliza:
```javascript
const { clientes, loading } = useClientes();
```

### **Context API**
Para datos globales (usuario, auth, notificaciones):
```javascript
const { user } = useAuth();
const { showNotification } = useNotification();
```

### **NO usar Redux por ahora**
Es overkill para este proyecto. Context + hooks es suficiente.

---

## Error Handling

### Interceptor Global
```javascript
// src/api/interceptors.js
client.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirigir a login
    }
    if (error.response?.status === 500) {
      showNotification('Error del servidor', 'error');
    }
    return Promise.reject(error);
  }
);
```

### En Componentes
```javascript
const { datos, error } = useMiFeature();

if (error) {
  return <AlertaError mensaje={error} />;
}
```

---

## Validación de Tipo de Datos

### Opción 1: JSDoc (Sin cambiar a TypeScript)
```javascript
/**
 * Obtiene todos los clientes
 * @param {Object} filtros - Filtros de búsqueda
 * @param {string} filtros.nombre - Filtrar por nombre
 * @param {number} filtros.estado_id - Filtrar por estado
 * @returns {Promise<Array>} Array de clientes
 */
export const getClientes = (filtros = {}) => {
  return client.get('/clientes', { params: filtros });
};
```

### Opción 2: Migrarse a TypeScript (A futuro)
```typescript
interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
}

export const getClientes = (filtros: object): Promise<Cliente[]> => {
  return client.get('/clientes', { params: filtros });
};
```

---

## Testing

### Test de Service
```javascript
// src/api/services/__tests__/clientesService.test.js
describe('clientesService', () => {
  test('getAll debe retornar array de clientes', async () => {
    const resultado = await clientesService.getAll();
    expect(Array.isArray(resultado.data)).toBe(true);
  });
});
```

### Test de Hook
```javascript
// src/hooks/__tests__/useClientes.test.js
describe('useClientes', () => {
  test('debe cargar clientes al montar', async () => {
    const { result } = renderHook(() => useClientes());
    await waitFor(() => {
      expect(result.current.clientes.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Checklist: Antes de Hacer Commit

- [ ] Service creado/actualizado
- [ ] Hook creado/actualizado  
- [ ] Componente usa el hook
- [ ] Validación de errores implementada
- [ ] Loading state manejado
- [ ] Sin props drilling innecesario
- [ ] Sin componentes enormes (max 300 líneas)
- [ ] Sin llamadas HTTP en componentes
- [ ] Documentación actualizada

---

## Troubleshooting Common

### "Axios no está trayendo el token de autenticación"
→ Verificar que el interceptor esté registrado en `api/client.js`

### "Múltiples componentes llamando la misma API"
→ Crear un hook custom para reutilizar en todos

### "Props drilling anidado (prop hell)"
→ Usar Context API para datos globales

### "Componente enorme (500+ líneas)"
→ Dividir en componentes y extraer lógica a hooks

