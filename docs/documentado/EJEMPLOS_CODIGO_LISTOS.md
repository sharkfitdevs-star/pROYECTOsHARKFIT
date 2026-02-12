# 💻 EJEMPLOS DE CÓDIGO: Implementación Práctica

Este documento contiene código listo para copiar-pegar para empezar la refactorización.

---

## 1️⃣ Archivo Base: `src/api/client.js`

```javascript
/**
 * Configuración global de Axios
 * Todas las peticiones HTTP pasan por aquí
 */

import axios from 'axios';

// Obtener URL base de variables de entorno
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Crear instancia de Axios
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// INTERCEPTOR: Agregar token de autenticación
// ============================================
client.interceptors.request.use(
  (config) => {
    // Obtener token del localStorage
    const token = localStorage.getItem('authToken');
    
    // Si existe token, agregarlo a headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Error en request:', error);
    return Promise.reject(error);
  }
);

// ============================================
// INTERCEPTOR: Manejar respuestas y errores
// ============================================
client.interceptors.response.use(
  // En caso de éxito
  (response) => {
    return response;
  },
  
  // En caso de error
  (error) => {
    // Si es error 401 (no autorizado)
    if (error.response?.status === 401) {
      // Limpiar token y redirigir a login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    
    // Si es error 500 (error servidor)
    if (error.response?.status === 500) {
      console.error('Error del servidor:', error.response.data);
      // Aquí se podría notificar al usuario
    }
    
    // Si es error de red (sin respuesta)
    if (!error.response) {
      console.error('Error de conexión:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default client;
```

---

## 2️⃣ Archivo: `src/api/services/clientesService.js`

```javascript
/**
 * Servicio para todas las operaciones con Clientes
 * Un único lugar para toda lógica de API relacionada con clientes
 */

import client from '../client';

// Endpoint base para clientes
const ENDPOINT = '/clientes';

export const clientesService = {
  /**
   * Obtener lista de clientes con filtros opcionales
   * @param {Object} params - Parámetros de búsqueda y filtrado
   * @param {string} params.search - Búsqueda por nombre/email
   * @param {string} params.estado - Filtrar por estado
   * @param {number} params.page - Número de página (paginación)
   * @returns {Promise} Respuesta con lista de clientes
   * 
   * @example
   * const response = await clientesService.getAll({ 
   *   search: 'Acme',
   *   estado: 'activo',
   *   page: 1 
   * });
   */
  getAll: (params = {}) => {
    return client.get(ENDPOINT, { params });
  },

  /**
   * Obtener un cliente específico por ID
   * @param {number} id - ID del cliente
   * @returns {Promise} Datos del cliente
   * 
   * @example
   * const cliente = await clientesService.getById(123);
   */
  getById: (id) => {
    return client.get(`${ENDPOINT}/${id}`);
  },

  /**
   * Crear un nuevo cliente
   * @param {Object} data - Datos del cliente
   * @param {string} data.nombre - Nombre del cliente
   * @param {string} data.email - Email del cliente
   * @param {string} data.telefono - Teléfono del cliente
   * @returns {Promise} Cliente creado con ID
   * 
   * @example
   * const nuevoCliente = await clientesService.create({
   *   nombre: 'Acme Corp',
   *   email: 'info@acme.com',
   *   telefono: '1234567890'
   * });
   */
  create: (data) => {
    return client.post(ENDPOINT, data);
  },

  /**
   * Actualizar cliente existente
   * @param {number} id - ID del cliente
   * @param {Object} data - Datos a actualizar (solo enviar campos que cambian)
   * @returns {Promise} Cliente actualizado
   * 
   * @example
   * const actualizado = await clientesService.update(123, {
   *   estado: 'pausado'
   * });
   */
  update: (id, data) => {
    return client.put(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Eliminar (soft delete) un cliente
   * @param {number} id - ID del cliente
   * @returns {Promise}
   * 
   * @example
   * await clientesService.delete(123);
   */
  delete: (id) => {
    return client.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Obtener historial de cambios del cliente
   * @param {number} id - ID del cliente
   * @returns {Promise} Array de cambios históricos
   * 
   * @example
   * const historial = await clientesService.getHistorial(123);
   */
  getHistorial: (id) => {
    return client.get(`${ENDPOINT}/${id}/historial`);
  },

  /**
   * Cambiar estado del cliente
   * @param {number} id - ID del cliente
   * @param {string} nuevoEstado - Nuevo estado (activo, inactivo, pausado, cancelado)
   * @returns {Promise}
   * 
   * @example
   * await clientesService.cambiarEstado(123, 'pausado');
   */
  cambiarEstado: (id, nuevoEstado) => {
    return client.post(`${ENDPOINT}/${id}/cambiar-estado`, { 
      estado: nuevoEstado 
    });
  },

  /**
   * Obtener contactos/personas de contacto del cliente
   * @param {number} id - ID del cliente
   * @returns {Promise} Array de contactos
   * 
   * @example
   * const contactos = await clientesService.getContactos(123);
   */
  getContactos: (id) => {
    return client.get(`${ENDPOINT}/${id}/contactos`);
  },
};
```

---

## 3️⃣ Hook: `src/hooks/useClientes.js`

```javascript
/**
 * Hook personalizado para manejo de clientes
 * Encapsula toda la lógica de datos y estado
 */

import { useState, useEffect, useCallback } from 'react';
import { clientesService } from '@/api/services';

export const useClientes = (filtrosIniciales = {}) => {
  // Estado
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);

  /**
   * Cargar lista de clientes
   * @param {Object} nuevosFiltros - Filtros a aplicar
   */
  const cargarLista = useCallback(async (nuevosFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Combinar filtros
      const filtrosFinal = { ...filtros, ...nuevosFiltros, page: pagina };
      
      // Hacer request al servicio
      const response = await clientesService.getAll(filtrosFinal);
      
      // Actualizar estado
      setClientes(response.data.results || response.data);
      setTotal(response.data.count || response.data.length);
    } catch (err) {
      // Manejar errores
      const mensajeError = err.response?.data || err.message || 'Error al cargar clientes';
      setError(mensajeError);
      console.error('Error en cargarLista:', err);
    } finally {
      setLoading(false);
    }
  }, [filtros, pagina]);

  /**
   * Cargar un cliente específico por ID
   * @param {number} id - ID del cliente
   */
  const cargarPorId = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientesService.getById(id);
      setCliente(response.data);
      return response.data;
    } catch (err) {
      const mensajeError = err.response?.data || err.message;
      setError(mensajeError);
      throw err; // Re-lanzar error para que el componente lo maneje
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear nuevo cliente
   * @param {Object} datos - Datos del cliente
   */
  const crear = useCallback(async (datos) => {
    try {
      const response = await clientesService.create(datos);
      // Agregar nuevo cliente al inicio de la lista
      setClientes([response.data, ...clientes]);
      setTotal(total + 1);
      return response.data;
    } catch (err) {
      const mensajeError = err.response?.data || err.message;
      setError(mensajeError);
      throw err;
    }
  }, [clientes, total]);

  /**
   * Actualizar cliente existente
   * @param {number} id - ID del cliente
   * @param {Object} datos - Datos a actualizar
   */
  const actualizar = useCallback(async (id, datos) => {
    try {
      const response = await clientesService.update(id, datos);
      
      // Actualizar en lista
      setClientes(clientes.map(c => 
        c.id === id ? response.data : c
      ));
      
      // Actualizar si está visible el detalle
      if (cliente?.id === id) {
        setCliente(response.data);
      }
      
      return response.data;
    } catch (err) {
      const mensajeError = err.response?.data || err.message;
      setError(mensajeError);
      throw err;
    }
  }, [clientes, cliente]);

  /**
   * Eliminar cliente
   * @param {number} id - ID del cliente
   */
  const eliminar = useCallback(async (id) => {
    try {
      await clientesService.delete(id);
      // Remover de lista
      setClientes(clientes.filter(c => c.id !== id));
      setTotal(total - 1);
    } catch (err) {
      const mensajeError = err.response?.data || err.message;
      setError(mensajeError);
      throw err;
    }
  }, [clientes, total]);

  /**
   * Obtener historial de cliente
   * @param {number} id - ID del cliente
   */
  const obtenerHistorial = useCallback(async (id) => {
    try {
      const response = await clientesService.getHistorial(id);
      return response.data;
    } catch (err) {
      const mensajeError = err.response?.data || err.message;
      setError(mensajeError);
      throw err;
    }
  }, []);

  /**
   * Cambiar estado de cliente
   * @param {number} id - ID del cliente
   * @param {string} nuevoEstado - Nuevo estado
   */
  const cambiarEstado = useCallback(async (id, nuevoEstado) => {
    try {
      const response = await clientesService.cambiarEstado(id, nuevoEstado);
      
      // Actualizar en lista
      setClientes(clientes.map(c => 
        c.id === id ? { ...c, estado: nuevoEstado } : c
      ));
      
      // Actualizar si está visible el detalle
      if (cliente?.id === id) {
        setCliente({ ...cliente, estado: nuevoEstado });
      }
      
      return response.data;
    } catch (err) {
      const mensajeError = err.response?.data || err.message;
      setError(mensajeError);
      throw err;
    }
  }, [clientes, cliente]);

  /**
   * Cargar lista al montar el componente
   */
  useEffect(() => {
    cargarLista(filtros);
  }, [cargarLista]); // Cargar solo si cambian dependencias

  /**
   * Retornar estado y métodos
   */
  return {
    // Estado - datos
    clientes,
    cliente,
    total,
    pagina,
    
    // Estado - control
    loading,
    error,
    filtros,
    
    // Métodos - CRUD
    cargarLista,
    cargarPorId,
    crear,
    actualizar,
    eliminar,
    obtenerHistorial,
    cambiarEstado,
    
    // Setters
    setFiltros,
    setPagina,
    setError,
  };
};
```

---

## 4️⃣ Componente usando Hook: `src/pages/Clientes.jsx`

```javascript
/**
 * Página principal de Clientes
 * Ejemplo de cómo usar el hook useClientes
 */

import React, { useState } from 'react';
import { useClientes } from '@/hooks';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorAlert from '@/components/shared/ErrorAlert';
import ClientesList from '@/components/features/Clientes/ClientesList';
import CrearClienteDialog from '@/components/dialogs/CrearClienteDialog';
import { Button } from '@/components/shared/Button';

export default function Clientes() {
  // Usar el hook
  const { 
    clientes, 
    loading, 
    error, 
    cargarLista,
    crear,
    actualizar,
    eliminar,
    cambiarEstado
  } = useClientes();

  // Estado local
  const [abrirCrearDialog, setAbrirCrearDialog] = useState(false);

  // Manejar creación
  const handleCrearCliente = async (datos) => {
    try {
      await crear(datos);
      setAbrirCrearDialog(false);
      // Mostrar notificación de éxito (si tienes contexto de notificaciones)
    } catch (err) {
      // Error se maneja en el hook
    }
  };

  // Manejar eliminación
  const handleEliminarCliente = async (id) => {
    if (window.confirm('¿Estás seguro que deseas eliminar este cliente?')) {
      try {
        await eliminar(id);
      } catch (err) {
        // Error manejado
      }
    }
  };

  // Manejar cambio de estado
  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await cambiarEstado(id, nuevoEstado);
    } catch (err) {
      // Error manejado
    }
  };

  // Renderizar
  if (loading && clientes.length === 0) {
    return <LoadingSpinner />;
  }

  if (error && clientes.length === 0) {
    return (
      <ErrorAlert 
        mensaje={error} 
        onRetry={() => cargarLista()}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <Button 
          onClick={() => setAbrirCrearDialog(true)}
          variant="primary"
        >
          + Nuevo Cliente
        </Button>
      </div>

      {/* Lista de clientes */}
      <ClientesList 
        clientes={clientes}
        onRefresh={() => cargarLista()}
        onDelete={handleEliminarCliente}
        onChangeStatus={handleCambiarEstado}
        isLoading={loading}
      />

      {/* Dialogo crear cliente */}
      {abrirCrearDialog && (
        <CrearClienteDialog 
          onClose={() => setAbrirCrearDialog(false)}
          onSubmit={handleCrearCliente}
        />
      )}
    </div>
  );
}
```

---

## 5️⃣ Hook Genérico: `src/hooks/useFetch.js`

```javascript
/**
 * Hook genérico para cualquier petición HTTP
 * Reutilizable para cualquier API call
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * @param {Function} apiCall - Función del servicio (ej: () => clientesService.getAll())
 * @param {Object} options - Opciones
 * @param {boolean} options.immediate - Ejecutar al montar (default: true)
 * @param {Array} options.dependencies - Dependencias para re-ejecutar
 */
export const useFetch = (apiCall, options = {}) => {
  const { 
    immediate = true, 
    dependencies = [] 
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall(...args);
      setData(result.data || result);
      return result;
    } catch (err) {
      const mensajeError = err.response?.data || err.message;
      setError(mensajeError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute, ...dependencies]);

  return { 
    data, 
    loading, 
    error, 
    execute,
    refetch: execute,
  };
};

/**
 * USO:
 * 
 * // Cargar clientes automáticamente
 * const { data: clientes, loading } = useFetch(
 *   () => clientesService.getAll()
 * );
 * 
 * // Cargar sin ejecutar inmediatamente
 * const { data: usuario, execute: cargarUsuario } = useFetch(
 *   (id) => usuariosService.getById(id),
 *   { immediate: false }
 * );
 * 
 * // Cuando necesites:
 * await cargarUsuario(userId);
 */
```

---

## 6️⃣ Hook para Formularios: `src/hooks/useForm.js`

```javascript
/**
 * Hook para manejo de formularios
 * Reduce boilerplate de manejo de estado en formularios
 */

import { useState, useCallback } from 'react';

export const useForm = (initialValues, onSubmit, onError) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Manejar cambios en inputs
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  /**
   * Marcar campo como tocado (para mostrar errores)
   */
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  /**
   * Manejar submit del formulario
   */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    try {
      await onSubmit(values);
    } catch (err) {
      // Si es error de validación
      if (err.validationErrors) {
        setErrors(err.validationErrors);
      } else {
        setErrors({ submit: err.message });
      }
      
      // Llamar callback de error si existe
      if (onError) {
        onError(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit, onError]);

  /**
   * Resetear formulario
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Setear valor de campo específico
   */
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  /**
   * Setear error de campo
   */
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    setValues,
  };
};

/**
 * USO:
 * 
 * const { values, errors, handleChange, handleSubmit } = useForm(
 *   { nombre: '', email: '' },
 *   async (values) => {
 *     await clientesService.create(values);
 *   }
 * );
 * 
 * return (
 *   <form onSubmit={handleSubmit}>
 *     <input name="nombre" value={values.nombre} onChange={handleChange} />
 *     {errors.nombre && <span>{errors.nombre}</span>}
 *   </form>
 * );
 */
```

---

## 7️⃣ Archivo .env.example

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0

# Logging
REACT_APP_LOG_LEVEL=debug

# Features (Feature flags)
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_BETA_FEATURES=false
```

---

## 8️⃣ Archivo: `src/config/constants.js`

```javascript
/**
 * Constantes globales de la aplicación
 * Un único lugar para valores hardcodeados
 */

// Estados de cliente
export const ESTADOS_CLIENTE = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  PAUSADO: 'pausado',
  CANCELADO: 'cancelado',
};

// Roles de usuario
export const ROLES = {
  ADMIN: 'admin',
  RESPONSABLE_SEDE: 'responsable_sede',
  VENDEDOR: 'vendedor',
  GERENTE: 'gerente',
};

// Tipos de alerta
export const TIPOS_ALERTA = {
  RENOVACION: 'renovacion',
  DEUDOR: 'deudor',
  CONTRATO: 'contrato',
  TARJETA: 'tarjeta',
  RIESGO: 'riesgo',
  SEGUIMIENTO: 'seguimiento',
  BAJA: 'baja',
};

// Configuración de paginación
export const ITEMS_POR_PAGINA = [10, 25, 50, 100];
export const ITEMS_POR_PAGINA_DEFAULT = 25;

// Timeouts
export const TIMEOUT_REQUEST = 30000; // 30 segundos
export const TIMEOUT_NOTIFICACION = 3000; // 3 segundos

// Mensajes
export const MENSAJES = {
  CREADO_EXITOSO: 'Creado exitosamente',
  ACTUALIZADO_EXITOSO: 'Actualizado exitosamente',
  ELIMINADO_EXITOSO: 'Eliminado exitosamente',
  ERROR_GENERICO: 'Ocurrió un error. Intenta de nuevo.',
  CONFIRMACION_ELIMINAR: '¿Estás seguro que deseas eliminar?',
};
```

---

## 9️⃣ Archivo: `src/utils/formatters.js`

```javascript
/**
 * Funciones de formato reutilizables
 * Para formatear datas, moneda, etc.
 */

/**
 * Formatear fecha al formato español
 * @param {string|Date} fecha - Fecha a formatear
 * @param {boolean} incluirHora - Si incluir hora
 * @returns {string} Fecha formateada
 */
export const formatearFecha = (fecha, incluirHora = false) => {
  if (!fecha) return '';
  
  const date = new Date(fecha);
  const opciones = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(incluirHora && {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
  
  return date.toLocaleDateString('es-AR', opciones);
};

/**
 * Formatear número como moneda
 * @param {number} valor - Valor a formatear
 * @param {string} moneda - Código de moneda (ARS, USD, etc.)
 * @returns {string} Valor formateado
 */
export const formatearMoneda = (valor, moneda = 'ARS') => {
  if (valor === null || valor === undefined) return '$0';
  
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
  }).format(valor);
};

/**
 * Formatear teléfono
 * @param {string} telefono - Teléfono a formatear
 * @returns {string} Teléfono formateado
 */
export const formatearTelefono = (telefono) => {
  if (!telefono) return '';
  
  // Remover caracteres no numéricos
  const numeros = telefono.replace(/\\D/g, '');
  
  // Formatear
  if (numeros.length === 10) {
    return numeros.replace(/(\\d{2})(\\d{4})(\\d{4})/, '+$1 $2-$3');
  }
  
  return telefono;
};

/**
 * Formatear porcentaje
 * @param {number} valor - Valor a formatear
 * @param {number} decimales - Decimales a mostrar
 * @returns {string} Porcentaje formateado
 */
export const formatearPorcentaje = (valor, decimales = 1) => {
  if (valor === null || valor === undefined) return '0%';
  return `${(valor * 100).toFixed(decimales)}%`;
};

/**
 * Truncar texto
 * @param {string} texto - Texto a truncar
 * @param {number} longitud - Longitud máxima
 * @returns {string} Texto truncado
 */
export const truncarTexto = (texto, longitud = 50) => {
  if (!texto || texto.length <= longitud) return texto;
  return `${texto.slice(0, longitud)}...`;
};
```

---

## 🔟 README para carpeta `src/api/services`

```markdown
# API Services

## Descripción

Esta carpeta contiene todos los servicios de API. Cada servicio es un módulo que encapsula todas las llamadas HTTP para una entidad específica.

## Estructura

```
services/
├── index.js                  # Barrel export
├── clientesService.js        # Operaciones con clientes
├── ventasService.js          # Operaciones con ventas
├── alertasService.js         # Operaciones con alertas
├── agendamientosService.js   # Operaciones con agendamientos
└── README.md                 # Este archivo
```

## Cómo usar un service

```javascript
// Importar
import { clientesService } from '@/api/services';

// Usar
const response = await clientesService.getAll({ search: 'Acme' });
const cliente = await clientesService.getById(123);
await clientesService.create({ nombre: 'Test' });
```

## Cómo crear un nuevo service

1. Crear archivo: `miEntityService.js`
2. Importar `client` desde `../client`
3. Definir `ENDPOINT`
4. Crear métodos CRUD
5. Agregar a `index.js` para export

```javascript
// src/api/services/miEntityService.js
import client from '../client';

const ENDPOINT = '/mi-entity';

export const miEntityService = {
  getAll: (params) => client.get(ENDPOINT, { params }),
  getById: (id) => client.get(`${ENDPOINT}/${id}`),
  create: (data) => client.post(ENDPOINT, data),
  update: (id, data) => client.put(`${ENDPOINT}/${id}`, data),
  delete: (id) => client.delete(`${ENDPOINT}/${id}`),
};
```

## Métodos estándar

Todos los services deben tener estos métodos:

| Método | HTTP | Descripción |
|--------|------|------------|
| `getAll(params)` | GET | Obtener lista (con filtros opcionales) |
| `getById(id)` | GET | Obtener uno por ID |
| `create(data)` | POST | Crear nuevo |
| `update(id, data)` | PUT | Actualizar |
| `delete(id)` | DELETE | Eliminar |

## Métodos personalizados

Si una entidad necesita operaciones específicas, agregar métodos adicionales:

```javascript
// Ejemplo: Cambiar estado
cambiarEstado: (id, nuevoEstado) => 
  client.post(`${ENDPOINT}/${id}/cambiar-estado`, { estado: nuevoEstado }),

// Ejemplo: Obtener relacionados
getContactos: (id) => 
  client.get(`${ENDPOINT}/${id}/contactos`),
```

## Testing

Cada service debería tener tests:

```javascript
// src/api/services/__tests__/clientesService.test.js
describe('clientesService', () => {
  test('getAll debe retornar array', async () => {
    const resultado = await clientesService.getAll();
    expect(Array.isArray(resultado.data)).toBe(true);
  });
});
```

---

## Index

**Último actualizado:** Febrero 2026

```

---

¡Ahora tienes todo el código base para empezar!

Copia-pega estos archivos en las carpetas correspondientes y comienza la refactorización.

