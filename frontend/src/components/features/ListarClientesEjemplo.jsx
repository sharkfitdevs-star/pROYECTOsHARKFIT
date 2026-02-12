/**
 * Ejemplo: ListarClientes
 * Demuestra cómo usar el hook useClientes
 * 
 * Este es un ejemplo completo de cómo un componente
 * interactuaría con el backend través de hooks
 */

import { useState } from 'react'
import { useClientes } from '../../hooks'
import { CLIENTE_ESTADOS, PAGINATION, MENSAJES } from '../../config/constants'
import './ListarClientes.css'

export default function ListarClientes() {
  const {
    clientes,
    total,
    loading,
    error,
    page,
    setPage,
    handleSearch,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleExportar,
    refetch,
  } = useClientes()

  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)

  /**
   * Manejar búsqueda
   */
  const handleSearchChange = async (e) => {
    const value = e.target.value
    setSearchTerm(value)
    if (value.length > 2) {
      await handleSearch(value)
    } else if (value.length === 0) {
      refetch()
    }
  }

  /**
   * Filtrar clientes por estado
   */
  const clientesFiltrados = filtroEstado === 'todos'
    ? clientes
    : clientes.filter((c) => c.estado === filtroEstado)

  /**
   * Manejar guardar (crear o actualizar)
   */
  const handleGuardar = async (clientesData) => {
    try {
      if (clienteSeleccionado?.id) {
        // Actualizar
        await handleUpdate(clienteSeleccionado.id, clientesData)
        alert(MENSAJES.ACTUALIZADO)
      } else {
        // Crear
        await handleCreate(clientesData)
        alert(MENSAJES.CREADO)
      }
      setIsModalOpen(false)
      setClienteSeleccionado(null)
    } catch (err) {
      alert(MENSAJES.ERROR)
    }
  }

  /**
   * Manejar eliminación
   */
  const handleEliminar = async (id) => {
    if (window.confirm(MENSAJES.CONFIRMACION)) {
      try {
        await handleDelete(id)
        alert(MENSAJES.ELIMINADO)
      } catch (err) {
        alert(MENSAJES.ERROR_ELIMINAR)
      }
    }
  }

  /**
   * Manejar exportación
   */
  const handleExportarClick = async (formato) => {
    try {
      await handleExportar(formato)
      alert(`Exportado como ${formato}`)
    } catch (err) {
      alert('Error en exportación')
    }
  }

  // Mostrar cargando
  if (loading && clientes.length === 0) {
    return <div className="listar-clientes-loading">{MENSAJES.CARGANDO}</div>
  }

  // Mostrar error
  if (error && clientes.length === 0) {
    return <div className="listar-clientes-error">{MENSAJES.ERROR}</div>
  }

  return (
    <div className="listar-clientes-container">
      <div className="header">
        <h2>Clientes ({total})</h2>
        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setClienteSeleccionado(null)
              setIsModalOpen(true)
            }}
          >
            + Nuevo Cliente
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExportarClick('csv')}
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="filter-select"
        >
          <option value="todos">Todos los estados</option>
          {Object.entries(CLIENTE_ESTADOS).map(([key, value]) => (
            <option key={key} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {clientesFiltrados.length === 0 ? (
        <div className="sin-datos">{MENSAJES.SIN_DATOS}</div>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
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
                  <td>
                    <span className={`estado-badge ${cliente.estado.toLowerCase()}`}>
                      {cliente.estado}
                    </span>
                  </td>
                  <td className="acciones">
                    <button
                      className="btn-icon"
                      onClick={() => {
                        setClienteSeleccionado(cliente)
                        setIsModalOpen(true)
                      }}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => handleEliminar(cliente.id)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="btn-paginacion"
        >
          ← Anterior
        </button>
        <span className="page-info">
          Página {page} de {Math.ceil(total / PAGINATION.DEFAULT_PAGE_SIZE)}
        </span>
        <button
          disabled={page * PAGINATION.DEFAULT_PAGE_SIZE >= total}
          onClick={() => setPage(page + 1)}
          className="btn-paginacion"
        >
          Siguiente →
        </button>
      </div>

      {isModalOpen && (
        <Modal
          cliente={clienteSeleccionado}
          onSave={handleGuardar}
          onClose={() => {
            setIsModalOpen(false)
            setClienteSeleccionado(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Modal para crear/editar cliente
 */
function Modal({ cliente, onSave, onClose }) {
  const [formData, setFormData] = useState(
    cliente || {
      nombre: '',
      email: '',
      telefono: '',
      estado: CLIENTE_ESTADOS.PROSPECTO,
    }
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{cliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleChange}
            >
              {Object.entries(CLIENTE_ESTADOS).map(([key, value]) => (
                <option key={key} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
