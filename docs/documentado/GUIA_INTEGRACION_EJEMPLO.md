# 📦 GUÍA: Cómo Integrar ListarClientesEjemplo en tu App

## Paso 1: Entender la Estructura

```
frontend/src/
├── api/
│   ├── client.js              ← Cliente HTTP
│   ├── endpoints.js           ← URLs API
│   └── services/
│       ├── clientesService.js ← Operaciones CRUD
│       └── ...
├── hooks/
│   ├── index.js               ← Exporta todos
│   ├── useFetch.js            ← Hook genérico
│   ├── useClientes.js         ← Hook específico
│   └── ...
├── components/
│   └── features/
│       └── ListarClientesEjemplo.jsx  ← Componente ejemplo ✨
└── config/
    └── constants.js           ← Constantes de app
```

---

## Paso 2: Usar ListarClientesEjemplo en una Página

### Opción A: Directamente en Dashboard.jsx

**Archivo:** `frontend/src/pages/dashboard/Dashboard.jsx`

```jsx
import { useState } from 'react'
import ListarClientesEjemplo from '../../components/features/ListarClientesEjemplo'
import './Dashboard.css'

export default function Dashboard() {
  const [seccionActiva, setSeccionActiva] = useState('clientes')

  return (
    <div className="dashboard">
      <nav className="sidebar">
        <button
          className={`nav-item ${seccionActiva === 'clientes' ? 'active' : ''}`}
          onClick={() => setSeccionActiva('clientes')}
        >
          👥 Clientes
        </button>
        <button
          className={`nav-item ${seccionActiva === 'ventas' ? 'active' : ''}`}
          onClick={() => setSeccionActiva('ventas')}
        >
          💰 Ventas
        </button>
        <button
          className={`nav-item ${seccionActiva === 'alertas' ? 'active' : ''}`}
          onClick={() => setSeccionActiva('alertas')}
        >
          🔔 Alertas
        </button>
      </nav>

      <main className="content">
        {seccionActiva === 'clientes' && <ListarClientesEjemplo />}
        {seccionActiva === 'ventas' && <div>Próximamente...</div>}
        {seccionActiva === 'alertas' && <div>Próximamente...</div>}
      </main>
    </div>
  )
}
```

### Opción B: En una ruta separada

**Archivo:** `frontend/src/pages/clientes/ClientesPage.jsx`

```jsx
import ListarClientesEjemplo from '../../components/features/ListarClientesEjemplo'

export default function ClientesPage() {
  return (
    <div className="page-container">
      <ListarClientesEjemplo />
    </div>
  )
}
```

**Luego en `App.jsx`:**

```jsx
import { Routes, Route } from 'react-router-dom'
import ClientesPage from './pages/clientes/ClientesPage'

function App() {
  return (
    <Routes>
      <Route path="/clientes" element={<ClientesPage />} />
      {/* ... otras rutas */}
    </Routes>
  )
}
```

---

## Paso 3: Personalizar el Componente

### Cambiar Estilos

Edita `ListarClientesEjemplo.css`:

```css
/* Cambiar color del botón Nuevo */
.btn-primary {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
}

/* Cambiar altura de tabla */
.tabla td {
  padding: 20px 12px; /* Era 14px */
}
```

### Cambiar Textos

Edita los textos en el JSX:

```jsx
<button className="btn btn-primary" onClick={() => { ... }}>
  ➕ Agregar Nuevo Cliente  {/* Cambié "Nuevo" por "Agregar Nuevo" */}
</button>
```

### Agregar Columnas Adicionales

En la tabla:

```jsx
<thead>
  <tr>
    <th>Nombre</th>
    <th>Email</th>
    <th>Teléfono</th>
    <th>RUT</th>          {/* ← Nueva columna */}
    <th>Empresa</th>      {/* ← Nueva columna */}
    <th>Estado</th>
    <th>Acciones</th>
  </tr>
</thead>
<tbody>
  {clientesFiltrados.map((cliente) => (
    <tr key={cliente.id}>
      <td>{cliente.nombre}</td>
      <td>{cliente.email}</td>
      <td>{cliente.telefono}</td>
      <td>{cliente.rut}</td>       {/* ← Nueva celda */}
      <td>{cliente.empresa}</td>   {/* ← Nueva celda */}
      <td>
        <span className={`estado-badge ${cliente.estado.toLowerCase()}`}>
          {cliente.estado}
        </span>
      </td>
      <td className="acciones">
        {/* ... botones ... */}
      </td>
    </tr>
  ))}
</tbody>
```

---

## Paso 4: Cuando se Complique, Refactorizar

Si el componente crece mucho (> 400 líneas), dividirlo:

```
components/
└── features/
    └── clientes/
        ├── ListarClientes.jsx        ← Componente principal (reducido)
        ├── ClientesTable.jsx         ← Tabla con headers
        ├── ClientesModal.jsx         ← Modal crear/editar
        ├── ClientesFilter.jsx        ← Filtros y búsqueda
        ├── ClientesPagination.jsx    ← Paginación
        └── ListarClientes.css        ← Estilos comunes
```

**ListarClientes.jsx (refactorizado):**

```jsx
import { useState } from 'react'
import { useClientes } from '../../hooks'
import ClientesTable from './ClientesTable'
import ClientesFilter from './ClientesFilter'
import ClientesModal from './ClientesModal'
import ClientesPagination from './ClientesPagination'

export default function ListarClientes() {
  const { clientes, total, loading, error, handleCreate, ... } = useClientes()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="listar-clientes">
      <h2>Clientes ({total})</h2>
      
      <ClientesFilter />
      <ClientesTable 
        clientes={clientes}
        onEdit={...}
        onDelete={...}
      />
      <ClientesPagination 
        total={total}
        {...}
      />
      
      {isModalOpen && (
        <ClientesModal
          onSave={handleCreate}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
```

---

## Paso 5: Testing

### Test del Componente

**Archivo:** `frontend/src/components/features/ListarClientesEjemplo.test.jsx`

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ListarClientesEjemplo from './ListarClientesEjemplo'
import * as hooks from '../../hooks'

// Mock del hook
jest.mock('../../hooks')

describe('ListarClientesEjemplo', () => {
  
  beforeEach(() => {
    hooks.useClientes.mockReturnValue({
      clientes: [
        { id: 1, nombre: 'Cliente A', email: 'a@test.com', telefono: '123', estado: 'Activo' },
        { id: 2, nombre: 'Cliente B', email: 'b@test.com', telefono: '456', estado: 'Prospecto' },
      ],
      total: 2,
      loading: false,
      error: null,
      page: 1,
      setPage: jest.fn(),
      handleSearch: jest.fn(),
      handleCreate: jest.fn().mockResolvedValue({ id: 3, nombre: 'Cliente C' }),
      handleUpdate: jest.fn(),
      handleDelete: jest.fn(),
      handleExportar: jest.fn(),
      refetch: jest.fn(),
    })
  })

  test('renderiza lista de clientes', () => {
    render(<ListarClientesEjemplo />)
    expect(screen.getByText('Cliente A')).toBeInTheDocument()
    expect(screen.getByText('Cliente B')).toBeInTheDocument()
  })

  test('abre modal al hacer click en Nuevo', async () => {
    render(<ListarClientesEjemplo />)
    const btnNuevo = screen.getByText('+ Nuevo Cliente')
    fireEvent.click(btnNuevo)
    
    await waitFor(() => {
      expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument()
    })
  })

  test('llama handleCreate al guardar', async () => {
    render(<ListarClientesEjemplo />)
    
    // Abrir modal
    fireEvent.click(screen.getByText('+ Nuevo Cliente'))
    
    // Llenar formulario
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: 'Cliente Nuevo' } })
    
    // Guardar
    fireEvent.click(screen.getByText('Guardar'))
    
    await waitFor(() => {
      expect(hooks.useClientes().handleCreate).toHaveBeenCalled()
    })
  })

  test('muestra loading state', () => {
    hooks.useClientes.mockReturnValue({
      ...hooks.useClientes,
      loading: true,
      clientes: [],
    })
    
    render(<ListarClientesEjemplo />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  test('muestra error', () => {
    hooks.useClientes.mockReturnValue({
      ...hooks.useClientes,
      error: 'Error al cargar clientes',
      clientes: [],
    })
    
    render(<ListarClientesEjemplo />)
    expect(screen.getByText('Error al cargar clientes')).toBeInTheDocument()
  })
})
```

**Ejecutar tests:**

```bash
cd frontend
npm test -- ListarClientesEjemplo.test.jsx
```

---

## Paso 6: Verificar que Funciona

### 1. Asegurar Backend Está Listo

Primero, el backend debe tener estos endpoints:

```
GET    /api/clientes/              → Lista paginada
POST   /api/clientes/              → Crear
GET    /api/clientes/<id>/         → Obtener uno
PUT    /api/clientes/<id>/         → Actualizar
DELETE /api/clientes/<id>/         → Eliminar
GET    /api/clientes/search?q=     → Búsqueda
GET    /api/clientes/export        → Exportar CSV
```

Si no existen, verás errores 404.

### 2. Verificar Token en LocalStorage

Abre DevTools (F12) → Console:

```javascript
localStorage.getItem('token')
// Debe retornar algo como: "eyJhbGciOiJIUzI1NiIs..."
// Si es null, el usuario no está logueado
```

### 3. Verificar Llamadas HTTP

Abre DevTools → Network tab:

```
POST /api/clientes/        201 Created       ← Cliente creado
GET  /api/clientes/        200 OK            ← Listado
PUT  /api/clientes/1/      200 OK            ← Actualizado
DELETE /api/clientes/1/    204 No Content    ← Eliminado
```

Si ves 400/500, el backend rechazó la petición (validación).
Si ves 401, el token expiró o es inválido.

### 4. Console de React DevTools

Instala la extensión "React Developer Tools" en Chrome.

Luego, inspecciona el componente:

```
ListarClientesEjemplo
├── Props:
│   (ninguno, es un componente root)
├── Hooks:
│   State:
│   │ clientes: [...]
│   │ searchTerm: ""
│   │ filtroEstado: "todos"
│   │ isModalOpen: false
│   │ clienteSeleccionado: null
```

---

## Paso 7: Próximas Características

### Agregar Edición Inline

```jsx
// En lugar de modal, editar directo en tabla
<td 
  contentEditable={editingId === cliente.id}
  onBlur={async (e) => {
    await handleUpdate(cliente.id, { nombre: e.currentTarget.textContent })
  }}
>
  {cliente.nombre}
</td>
```

### Agregar Bulk Actions

```jsx
{/* Seleccionar múltiples clientes */}
<th>
  <input 
    type="checkbox" 
    onChange={(e) => {
      if (e.target.checked) {
        selectAll()
      } else {
        deselectAll()
      }
    }}
  />
</th>

{/* Botón pour eliminar seleccionados */}
<button onClick={() => handleDeleteBulk(selected)}>
  🗑️ Eliminar {selectedCount}
</button>
```

### Agregar Filtros Avanzados

```jsx
{/* Fecha from/to */}
<input type="date" onChange={(e) => setDateFrom(e.target.value)} />

{/* Dropdown states */}
<select multiple onChange={(e) => setEstados(Array.from(e.target.selectedOptions, o => o.value))}>
  <option>Activo</option>
  <option>Prospecto</option>
</select>

{/* API llamará: /api/clientes/?fecha_from=2024-01-01&estado=activo&estado=prospecto */}
```

---

## ✅ Checklist Final

- ✅ Importé `ListarClientesEjemplo` en una página
- ✅ Probé crear un cliente
- ✅ Probé editar un cliente
- ✅ Probé eliminar un cliente
- ✅ Probé búsqueda
- ✅ Probé filtros
- ✅ Probé exportar
- ✅ Probé paginación
- ✅ Probé estados de error/carga
- ✅ Revisé red calls en DevTools
- ✅ El backend devuelve datos correctos

---

## 🎯 Próximo Paso

Una vez que este componente funcione end-to-end:

1. **Stage 3**: Crear componentes similares para otras entidades (Ventas, Alertas, etc.)
2. **Refactorizar**: Extraer partes comunes a componentes reusables
3. **Testing**: Agregar tests E2E con Cypress o Playwright

Good luck! 🚀
