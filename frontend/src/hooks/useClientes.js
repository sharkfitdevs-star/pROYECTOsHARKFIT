/**
 * Hook: useClientes
 * Gestión completa de clientes
 * (CRUD + búsqueda + exportación)
 */

import { useState, useCallback } from 'react'
import { useFetch } from './useFetch'
import { useForm } from './useForm'
import clientesService from '../api/services/clientesService'

export function useClientes() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * Obtener lista de clientes
   */
  const { data: clientesList, loading, error, refetch } = useFetch(
    () => clientesService.getAll(page),
    [page]
  )

  /**
   * Búsqueda
   */
  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query)
    if (query.length > 0) {
      try {
        const resultados = await clientesService.search(query)
        return resultados
      } catch (err) {
        console.error('Error en búsqueda:', err)
        return []
      }
    }
    return clientesList
  }, [clientesList])

  /**
   * Crear cliente
   */
  const handleCreate = useCallback(async (data) => {
    try {
      const nuevoCliente = await clientesService.create(data)
      refetch()
      return nuevoCliente
    } catch (err) {
      throw err
    }
  }, [refetch])

  /**
   * Actualizar cliente
   */
  const handleUpdate = useCallback(
    async (id, data) => {
      try {
        const clienteActualizado = await clientesService.update(id, data)
        refetch()
        return clienteActualizado
      } catch (err) {
        throw err
      }
    },
    [refetch]
  )

  /**
   * Eliminar cliente
   */
  const handleDelete = useCallback(
    async (id) => {
      try {
        await clientesService.delete(id)
        refetch()
      } catch (err) {
        throw err
      }
    },
    [refetch]
  )

  /**
   * Exportar clientes
   */
  const handleExportar = useCallback(async (formato = 'csv') => {
    try {
      const blob = await clientesService.exportar(formato)
      // Crear descarga
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clientes.${formato}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error('Error exportando:', err)
      throw err
    }
  }, [])

  return {
    // Estado
    clientes: clientesList?.data || [],
    total: clientesList?.total || 0,
    loading,
    error,
    page,
    searchQuery,
    // Métodos
    setPage,
    handleSearch,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleExportar,
    refetch,
  }
}
