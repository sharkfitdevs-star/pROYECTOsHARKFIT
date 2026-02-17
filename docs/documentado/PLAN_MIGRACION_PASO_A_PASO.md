# 🚀 PLAN DE MIGRACIÓN: Implementación Paso a Paso

**Nota 2026:** Referencias a SQLite son históricas; la ingestión y microservicios usan MongoDB.

## 📌 Resumen Ejecutivo

Este documento guía la migración de la estructura actual a una estructura profesional y escalable en **6 fases** que pueden implementarse en paralelo o secuencialmente.

**Tiempo estimado total**: 5-7 horas

---

## FASE 1: Preparar Estructura de Carpetas (30-45 min)

### Paso 1.1: Crear estructura de directorios vacía

```
src/
├── api/                    # Nueva carpeta
│   ├── client.js          # Crear
│   ├── endpoints.js       # Crear
│   ├── interceptors.js    # Crear
│   └── services/          # Nueva carpeta
│       ├── index.js       # Crear (barrel export)
│       └── README.md      # Crear
├── hooks/                 # Nueva carpeta
│   ├── index.js           # Crear (barrel export)
│   └── README.md          # Crear
├── context/               # Nueva carpeta (mover PermissionContext aquí)
│   ├── index.js           # Crear
│   └── README.md          # Crear
├── types/                 # Nueva carpeta
│   ├── index.js           # Crear
│   └── README.md          # Crear
├── config/                # Nueva carpeta
│   ├── api.config.js      # Crear
│   ├── app.config.js      # Crear
│   └── constants.js       # Crear
├── middleware/            # Nueva carpeta
│   └── README.md          # Crear
└── components/            # Reorganizar carpeta existente
    ├── shared/            # Nueva subcarpeta
    ├── layout/            # Nueva subcarpeta
    ├── dialogs/           # Mover diálogos aquí
    ├── features/          # Nueva subcarpeta
    └── README.md          # Crear
```

---

## FASE 2: Configurar Axios Client (1 hora)

### Paso 2.1: Crear cliente Axios base

**Archivo: `src/api/client.js`**

```javascript
import axios from 'axios';

// Configuración base
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Agregar token al request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: Manejar respuestas
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si es 401, ir a login
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    // Si es 500, notificar al usuario
    if (error.response?.status === 500) {
      console.error('Error del servidor:', error);
    }

    return Promise.reject(error);
  }
);

export default client;
```

### Paso 2.2: Definir endpoints

**Archivo: `src/api/endpoints.js`**

```javascript
const BASE_API = '/api/v1';

export const ENDPOINTS = {
  // Clientes
  CLIENTES: `${BASE_API}/clientes`,
  CLIENTES_DETALLE: (id) => `${BASE_API}/clientes/${id}`,
  CLIENTES_HISTORIAL: (id) => `${BASE_API}/clientes/${id}/historial`,

  // Ventas
  VENTAS: `${BASE_API}/ventas`,
  VENTAS_DETALLE: (id) => `${BASE_API}/ventas/${id}`,

  // Alertas
  ALERTAS: `${BASE_API}/alertas`,
  ALERTAS_CONFIG: `${BASE_API}/alertas/configuracion`,

  // Agendamientos
  AGENDAMIENTOS: `${BASE_API}/agendamientos`,

  // Usuarios
  USUARIOS_ME: `${BASE_API}/usuarios/me`,
  USUARIOS_PERMISOS: `${BASE_API}/usuarios/me/permisos`,
};
```

### Paso 2.3: Crear .env.example

**Archivo: `.env.example`**

```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
```

---

## FASE 3: Crear Services (1.5 horas)

### Paso 3.1: Crear clientesService

**Archivo: `src/api/services/clientesService.js`**

```javascript
import client from '../client';
import { ENDPOINTS } from '../endpoints';

/**
 * Servicio para operaciones CRUD de clientes
 */
export const clientesService = {
  /**
   * Obtener todos los clientes
   * @param {Object} params - Parámetros de búsqueda
   */
  getAll: (params = {}) => client.get(ENDPOINTS.CLIENTES, { params }),

  /**
   * Obtener cliente por ID
   */
  getById: (id) => client.get(ENDPOINTS.CLIENTES_DETALLE(id)),

  /**
   * Crear nuevo cliente
   */
  create: (data) => client.post(ENDPOINTS.CLIENTES, data),

  /**
   * Actualizar cliente
   */
  update: (id, data) => client.put(ENDPOINTS.CLIENTES_DETALLE(id), data),

  /**
   * Eliminar cliente
   */
  delete: (id) => client.delete(ENDPOINTS.CLIENTES_DETALLE(id)),

  /**
   * Obtener historial del cliente
   */
  getHistorial: (id) => client.get(ENDPOINTS.CLIENTES_HISTORIAL(id)),
};
```

### Paso 3.2: Crear otros services necesarios

Repetir el patrón para:
- `ventasService.js`
- `alertasService.js`
- `agendamientosService.js`
- `usuariosService.js`
- `reportesService.js`

### Paso 3.3: Crear barrel export

**Archivo: `src/api/services/index.js`**

```javascript
export { clientesService } from './clientesService';
export { ventasService } from './ventasService';
export { alertasService } from './alertasService';
export { agendamientosService } from './agendamientosService';
export { usuariosService } from './usuariosService';
export { reportesService } from './reportesService';
```

**Uso después:**
```javascript
// En lugar de:
import { clientesService } from '@/api/services/clientesService';

// Puedes hacer:
import { clientesService } from '@/api/services';
```

---

## FASE 4: Crear Custom Hooks (1.5 horas)

### Paso 4.1: Crear useClientes

**Archivo: `src/hooks/useClientes.js`**

(Usa el código del documento GUIA_SERVICIOS_Y_HOOKS.md)

### Paso 4.2: Crear otros hooks

Repetir el patrón para:
- `useVentas.js`
- `useAlertas.js`
- `useAgendamientos.js`
- `useFetch.js` (genérico)
- `useForm.js` (genérico)

### Paso 4.3: Crear barrel export

**Archivo: `src/hooks/index.js`**

```javascript
export { useClientes } from './useClientes';
export { useVentas } from './useVentas';
export { useAlertas } from './useAlertas';
export { useFetch } from './useFetch';
export { useForm } from './useForm';
export { usePermisos } from './usePermisos';
```

---

## FASE 5: Reorganizar Componentes (1-1.5 horas)

### Paso 5.1: Estructura de componentes

```
components/
├── shared/                    # Componentes genéricos sin lógica
│   ├── Button.jsx
│   ├── Modal.jsx
│   ├── Table.jsx
│   ├── Card.jsx
│   ├── LoadingSpinner.jsx
│   ├── ErrorAlert.jsx
│   ├── Form.jsx
│   ├── Input.jsx
│   └── Select.jsx
│
├── layout/                    # Layout principal
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   ├── Navigation.jsx
│   └── Layout.jsx            # (mover de /Layout.jsx)
│
├── features/                  # Componentes específicos de features
│   ├── Clientes/
│   │   ├── ClienteList.jsx
│   │   ├── ClienteDetail.jsx
│   │   └── ClienteForm.jsx
│   ├── Ventas/
│   ├── Alertas/
│   └── Agendamientos/
│
├── dialogs/                   # Todos los diálogos
│   ├── CrearClienteDialog.jsx
│   ├── EditarClienteDialog.jsx
│   ├── (mover todos aquí)
│   └── index.js              # barrel export
│
└── README.md                  # Documentación
```

### Paso 5.2: Migrar componentes grandes a hooks

**ANTES:**
```javascript
// CrearClienteDialog.jsx - usando axios directamente
import axios from 'axios';

export default function CrearClienteDialog() {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/clientes', data);
      // ...
    }
  };
}
```

**DESPUÉS:**
```javascript
// CrearClienteDialog.jsx - usando hook y service
import { useClientes } from '@/hooks';

export default function CrearClienteDialog() {
  const { crear, loading } = useClientes();
  
  const handleSubmit = async (data) => {
    try {
      await crear(data);
      // ...
    }
  };
}
```

---

## FASE 6: Limpiar y Documentar (1 hora)

### Paso 6.1: Centralizar constantes

**Archivo: `src/config/constants.js`**

```javascript
export const ESTADOS_CLIENTE = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  PAUSADO: 'pausado',
  CANCELADO: 'cancelado',
};

export const ROLES = {
  ADMIN: 'admin',
  RS: 'responsable_sede',
  VENDEDOR: 'vendedor',
};

export const ITEMS_POR_PAGINA = [10, 25, 50, 100];
```

### Paso 6.2: Crear utilidades comunes

**Archivo: `src/utils/formatters.js`**

```javascript
export const formatearFecha = (fecha) => {
  return new Date(fecha).toLocaleDateString('es-AR');
};

export const formatearMoneda = (valor) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(valor);
};

export const formatearTelefono = (telefono) => {
  return telefono.replace(/(\d{2})(\d{4})(\d{4})/, '+$1 $2-$3');
};
```

### Paso 6.3: Actualizar README.md

**Archivo: `README.md`** (raíz del proyecto)

```markdown
# Dashboard Sharkfit - Sistema de Gestión Comercial

## 🚀 Quick Start

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```

3. **Iniciar servidor de desarrollo**
   ```bash
   npm run dev
   ```

## 📖 Documentación

- [Arquitectura](./ARQUITECTURA_DETALLADA.md)
- [Guía de Servicios y Hooks](./GUIA_SERVICIOS_Y_HOOKS.md)
- [Estructura Mejorada](./ESTRUCTURA_MEJORADA_PROPUESTA.md)

## 📁 Estructura de Carpetas

```
src/
├── api/                 # Servicios y configuración de API
├── components/          # Componentes React organizados
├── hooks/              # Custom hooks reutilizables
├── pages/              # Páginas de la aplicación
├── context/            # State global (Context API)
├── utils/              # Funciones utilitarias
├── config/             # Configuración de la app
├── types/              # Tipos de datos (JSDoc)
└── assets/             # Imágenes y estilos estáticos
```

## 🔌 Cómo Agregar una Nueva Feature

1. Crear service en `src/api/services/`
2. Crear hook en `src/hooks/`
3. Crear componentes en `src/components/features/`
4. Usar en page en `src/pages/`

Ver [GUIA_SERVICIOS_Y_HOOKS.md](./GUIA_SERVICIOS_Y_HOOKS.md) para ejemplos.

## 🧪 Testing

```bash
npm run test
npm run test:coverage
```

## 🚀 Deployment

```bash
npm run build
```

---

## 📚 Documentación de Negocio

- [Sistema de Alertas](./README_SISTEMA_ALERTAS.md)
- [Tipos de Alertas](./GUIA_TIPOS_ALERTAS.md)
- [Configuración de Webhooks](./GUIA_CONFIGURACION_WEBHOOKS.md)

## 👥 Equipo

- Frontend: React + Axios
- Backend: Django REST Framework (próximo)
- Database: PostgreSQL

```

### Paso 6.4: Actualizar páginas principales

Migrar las páginas principales a usar hooks:

```javascript
// ANTES: pages/Clientes.jsx sin structure
// DESPUÉS: pages/Clientes.jsx con hook

import { useClientes } from '@/hooks';

export default function Clientes() {
  const { clientes, loading, error } = useClientes();

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div>
      <h1>Clientes</h1>
      <ClientesList data={clientes} />
    </div>
  );
}
```

---

## 📋 Checklist de Completación

### Fase 1 ✅
- [ ] Carpetas creadas
- [ ] package.json actualizado
- [ ] .gitignore revisado

### Fase 2 ✅
- [ ] client.js creado
- [ ] endpoints.js definido
- [ ] .env.example creado
- [ ] Interceptores configurados

### Fase 3 ✅
- [ ] Services creados (6+)
- [ ] Barrel exports creados
- [ ] Tests de services (opcional)

### Fase 4 ✅
- [ ] Hooks creados (6+)
- [ ] Barrel exports creados
- [ ] JSDoc documentado

### Fase 5 ✅
- [ ] Componentes reorganizados
- [ ] Componentes mirados a hooks
- [ ] Sin axios imports en componentes

### Fase 6 ✅
- [ ] Constantes centralizadas
- [ ] Utilidades creadas
- [ ] README actualizado
- [ ] Documentación completa
- [ ] Sin archivos sin usar en raíz

---

## 🎯 Resultado Final

Después de completar las 6 fases:

✅ **Código Limpio**
- Componentes enfocados en UI
- Lógica extraída a hooks
- Sin duplicación de código

✅ **Fácil de Mantener**
- Estructura clara y predecible
- Componentes reutilizables
- Servicios centralizados

✅ **Escalable**
- Fácil agregar nuevas features
- Fácil agregar nuevos desarrolladores
- Fácil testear

✅ **Profesional**
- Documentación completa
- Convenciones consistentes
- Best practices implementadas

---

## ⚠️ Notas Importantes

1. **No hacer todo de una vez**: Implementa fase por fase
2. **Testing en paralelo**: Escribe tests mientras avanzas
3. **Documentación**: Mantén docs actualizadas
4. **CI/CD**: Configura GitHub Actions si es posible
5. **Versionado**: Usa git commits pequeños y significativos

---

## 🆘 Recursos Útiles

- [React Hooks Documentation](https://react.dev/reference/react)
- [Axios Documentation](https://axios-http.com/)
- [React Best Practices](https://react.dev/learn)
- [JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

