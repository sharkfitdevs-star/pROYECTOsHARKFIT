# 📚 GUÍA PRÁCTICA: Cómo Usar Servicios y Hooks

## 1️⃣ CREAR UN API SERVICE

Cada entidad del sistema debe tener su propio service.

### Estructura Básica

```javascript
// src/api/services/clientesService.js
import client from '../client';

const ENDPOINT = '/clientes';

export const clientesService = {
  // Obtener todos
  getAll: (params) => client.get(ENDPOINT, { params }),

  // Obtener por ID
  getById: (id) => client.get(`${ENDPOINT}/${id}`),

  // Crear nuevo
  create: (data) => client.post(ENDPOINT, data),

  // Actualizar
  update: (id, data) => client.put(`${ENDPOINT}/${id}`, data),

  // Eliminar
  delete: (id) => client.delete(`${ENDPOINT}/${id}`),

  // Acciones específicas (si es necesario)
  activar: (id) => client.post(`${ENDPOINT}/${id}/activar/`),
  desactivar: (id) => client.post(`${ENDPOINT}/${id}/desactivar/`),
  getHistorial: (id) => client.get(`${ENDPOINT}/${id}/historial/`),
};
```

### ✅ Ejemplo Completo: Servicio de Clientes

```javascript
// src/api/services/clientesService.js
import client from '../client';

const ENDPOINT = '/api/v1/clientes';

export const clientesService = {
  /**
   * Obtener todos los clientes
   * @param {Object} params - Parámetros de búsqueda
   * @param {string} params.search - Buscar por nombre/email
   * @param {string} params.estado - Filtrar por estado
   * @param {number} params.page - Número de página
   * @returns {Promise}
   */
  getAll: (params = {}) => client.get(ENDPOINT, { params }),

  /**
   * Obtener un cliente por ID
   * @param {number} id
   * @returns {Promise}
   */
  getById: (id) => client.get(`${ENDPOINT}/${id}`),

  /**
   * Crear nuevo cliente
   * @param {Object} data
   * @param {string} data.nombre
   * @param {string} data.email
   * @param {string} data.telefono
   * @returns {Promise}
   */
  create: (data) => client.post(ENDPOINT, data),

  /**
   * Actualizar cliente
   * @param {number} id
   * @param {Object} data
   * @returns {Promise}
   */
  update: (id, data) => client.put(`${ENDPOINT}/${id}`, data),

  /**
   * Eliminar cliente (soft delete)
   * @param {number} id
   * @returns {Promise}
   */
  delete: (id) => client.delete(`${ENDPOINT}/${id}`),

  /**
   * Obtener historial de cliente
   * @param {number} id
   * @returns {Promise}
   */
  getHistorial: (id) => client.get(`${ENDPOINT}/${id}/historial/`),

  /**
   * Obtener contactos de un cliente
   * @param {number} id
   * @returns {Promise}
   */
  getContactos: (id) => client.get(`${ENDPOINT}/${id}/contactos/`),

  /**
   * Cambiar estado de cliente
   * @param {number} id
   * @param {string} nuevoEstado
   * @returns {Promise}
   */
  cambiarEstado: (id, nuevoEstado) =>
    client.post(`${ENDPOINT}/${id}/cambiar-estado/`, { estado: nuevoEstado }),
};
```

---

## 2️⃣ CREAR UN CUSTOM HOOK

Los hooks manejan la lógica de datos y estado.

### Estructura Básica

```javascript
// src/hooks/useClientes.js
import { useState, useEffect } from 'react';
import { clientesService } from '@/api/services/clientesService';

export const useClientes = (filtrosIniciales = {}) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(filtrosIniciales);

  // Cargar clientes
  const cargar = async (nuevosFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientesService.getAll(nuevosFiltros);
      setClientes(response.data);
    } catch (err) {
      setError(err.message || 'Error al cargar clientes');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Crear cliente
  const crear = async (datos) => {
    try {
      const response = await clientesService.create(datos);
      setClientes([...clientes, response.data]);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error al crear cliente');
      throw err;
    }
  };

  // Actualizar cliente
  const actualizar = async (id, datos) => {
    try {
      const response = await clientesService.update(id, datos);
      setClientes(clientes.map(c => c.id === id ? response.data : c));
      return response.data;
    } catch (err) {
      setError(err.message || 'Error al actualizar cliente');
      throw err;
    }
  };

  // Eliminar cliente
  const eliminar = async (id) => {
    try {
      await clientesService.delete(id);
      setClientes(clientes.filter(c => c.id !== id));
    } catch (err) {
      setError(err.message || 'Error al eliminar cliente');
      throw err;
    }
  };

  // Cargar al montar
  useEffect(() => {
    cargar(filtros);
  }, []);

  return {
    clientes,
    loading,
    error,
    cargar,
    crear,
    actualizar,
    eliminar,
    setFiltros,
  };
};
```

### ✅ Hook Avanzado con más Funcionalidades

```javascript
// src/hooks/useClientes.js
import { useState, useEffect, useCallback } from 'react';
import { clientesService } from '@/api/services/clientesService';

export const useClientes = (filtrosIniciales = {}) => {
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);

  // Cargar lista de clientes
  const cargarLista = useCallback(async (nuevosFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientesService.getAll({
        ...filtros,
        ...nuevosFiltros,
        page: pagina,
      });
      setClientes(response.data.results || response.data);
      setTotal(response.data.count || response.data.length);
    } catch (err) {
      setError(err.response?.data || err.message);
      console.error('Error al cargar clientes:', err);
    } finally {
      setLoading(false);
    }
  }, [filtros, pagina]);

  // Cargar un cliente específico
  const cargarPorId = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientesService.getById(id);
      setCliente(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear cliente
  const crear = useCallback(async (datos) => {
    try {
      const response = await clientesService.create(datos);
      setClientes([response.data, ...clientes]);
      return response.data;
    } catch (err) {
      setError(err.response?.data || err.message);
      throw err;
    }
  }, [clientes]);

  // Actualizar cliente
  const actualizar = useCallback(async (id, datos) => {
    try {
      const response = await clientesService.update(id, datos);
      setClientes(clientes.map(c => c.id === id ? response.data : c));
      if (cliente?.id === id) {
        setCliente(response.data);
      }
      return response.data;
    } catch (err) {
      setError(err.response?.data || err.message);
      throw err;
    }
  }, [clientes, cliente]);

  // Eliminar cliente
  const eliminar = useCallback(async (id) => {
    try {
      await clientesService.delete(id);
      setClientes(clientes.filter(c => c.id !== id));
    } catch (err) {
      setError(err.response?.data || err.message);
      throw err;
    }
  }, [clientes]);

  // Obtener historial
  const obtenerHistorial = useCallback(async (id) => {
    try {
      const response = await clientesService.getHistorial(id);
      return response.data;
    } catch (err) {
      setError(err.response?.data || err.message);
      throw err;
    }
  }, []);

  // Cargar al montar
  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  return {
    // Estado
    clientes,
    cliente,
    loading,
    error,
    total,
    pagina,
    // Métodos
    cargarLista,
    cargarPorId,
    crear,
    actualizar,
    eliminar,
    obtenerHistorial,
    // Setters
    setFiltros,
    setPagina,
    setError,
  };
};
```

---

## 3️⃣ USAR EL HOOK EN UN COMPONENTE

### Ejemplo Simple

```javascript
// src/pages/Clientes.jsx
import { useClientes } from '@/hooks/useClientes';
import ClientesList from '@/components/features/ClientesList';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorAlert from '@/components/shared/ErrorAlert';

export default function Clientes() {
  const { clientes, loading, error, cargarLista } = useClientes();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert mensaje={error} onRetry={cargarLista} />;

  return (
    <div className="p-6">
      <h1>Clientes</h1>
      <ClientesList clientes={clientes} onRefresh={cargarLista} />
    </div>
  );
}
```

### Ejemplo Avanzado con Formulario

```javascript
// src/pages/CrearCliente.jsx
import { useState } from 'react';
import { useClientes } from '@/hooks/useClientes';
import { useNotification } from '@/hooks/useNotification';
import ClienteForm from '@/components/features/ClienteForm';

export default function CrearCliente() {
  const { crear, loading } = useClientes();
  const { showNotification } = useNotification();
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (dados) => {
    setGuardando(true);
    try {
      await crear(dados);
      showNotification('Cliente creado exitosamente', 'success');
      // Redirigir o cerrar modal
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6">
      <h1>Crear Nuevo Cliente</h1>
      <ClienteForm onSubmit={handleSubmit} isLoading={guardando} />
    </div>
  );
}
```

### Ejemplo con Búsqueda y Filtros

```javascript
// src/pages/BuscadorClientes.jsx
import { useState } from 'react';
import { useClientes } from '@/hooks/useClientes';
import BuscadorInput from '@/components/shared/BuscadorInput';
import FiltrosPanel from '@/components/shared/FiltrosPanel';
import ClientesList from '@/components/features/ClientesList';

export default function BuscadorClientes() {
  const { clientes, loading, cargarLista, setFiltros } = useClientes();
  const [busqueda, setBusqueda] = useState('');

  const handleBuscar = (valor) => {
    setBusqueda(valor);
    setFiltros({ search: valor });
    cargarLista({ search: valor });
  };

  const handleFiltrar = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    cargarLista(nuevosFiltros);
  };

  return (
    <div className="p-6">
      <h1>Buscar Clientes</h1>
      
      <BuscadorInput 
        value={busqueda}
        onChange={handleBuscar}
        placeholder="Buscar por nombre o email..."
      />

      <FiltrosPanel onFiltrar={handleFiltrar} />

      {loading ? (
        <Spinner />
      ) : (
        <ClientesList clientes={clientes} />
      )}
    </div>
  );
}
```

---

## 4️⃣ PATRÓN: Hook Genérico de Fetch

Para no repetir código, crea un hook genérico:

```javascript
// src/hooks/useFetch.js
import { useState, useEffect } from 'react';

/**
 * Hook genérico para hacer fetch de datos
 * @param {Function} apiCall - Función del servicio que retorna Promise
 * @param {Object} options - Opciones
 * @param {boolean} options.immediate - Ejecutar al montar (default: true)
 * @param {Array} options.dependencies - Dependencias para re-ejecutar
 */
export const useFetch = (apiCall, options = {}) => {
  const { immediate = true, dependencies = [] } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall(...args);
      setData(result.data || result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  return { data, loading, error, execute };
};
```

**Uso del hook genérico:**

```javascript
// Cargar clientes
const { data: clientes, loading, error, execute: cargarClientes } = 
  useFetch(() => clientesService.getAll());

// Cargar un cliente específico
const { data: cliente, execute: cargarCliente } = 
  useFetch(
    (id) => clientesService.getById(id),
    { immediate: false }  // No ejecutar al montar
  );

// Cuando necesites cargar un cliente específico:
await cargarCliente(cliente_id);
```

---

## 5️⃣ PATRÓN: Hook para Formularios

```javascript
// src/hooks/useForm.js
import { useState, useCallback } from 'react';

export const useForm = (initialValues, onSubmit) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValues,
    setErrors,
  };
};
```

**Uso:**

```javascript
const { values, errors, handleChange, handleSubmit } = useForm(
  { nombre: '', email: '' },
  async (values) => {
    await clientesService.create(values);
  }
);

return (
  <form onSubmit={handleSubmit}>
    <input name="nombre" value={values.nombre} onChange={handleChange} />
    {errors.nombre && <span>{errors.nombre}</span>}
  </form>
);
```

---

## ✅ CHECKLIST: Antes de Crear un Nuevo Service/Hook

- [ ] ¿Ya existe un servicio para esta entidad?
- [ ] ¿El hook reutiliza código de otro hook?
- [ ] ¿Documenté los parámetros con JSDoc?
- [ ] ¿Manejo errores correctamente?
- [ ] ¿Tengo loading state?
- [ ] ¿El componente usa el hook?
- [ ] ¿Sin lógica de negocio en componentes?

