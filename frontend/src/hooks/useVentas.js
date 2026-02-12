/**
 * Hook: useVentas
 * Gestión completa de ventas
 * (CRUD + cambio estado)
 */

import { useState, useCallback } from 'react'
import { useFetch } from './useFetch'
import ventasService from '../api/services/ventasService'

export function useVentas() {
  const [page, setPage] = useState(1)

  /**
   * Obtener lista de ventas
   */
  const { data: ventasList, loading, error, refetch } = useFetch(
    () => ventasService.getAll(page),
    [page]
  )

  /**
   * Crear venta
   */
  const handleCreate = useCallback(async (data) => {
    try {
      const nuevaVenta = await ventasService.create(data)
      refetch()
      return nuevaVenta
    } catch (err) {
      throw err
    }
  }, [refetch])

  /**
   * Actualizar venta
   */
  const handleUpdate = useCallback(
    async (id, data) => {
      try {
        const ventaActualizada = await ventasService.update(id, data)
        refetch()
        return ventaActualizada
      } catch (err) {
        throw err
      }
    },
    [refetch]
  )

  /**
   * Cambiar estado de venta
   */
  const handleCambiarEstado = useCallback(
    async (id, estado) => {
      try {
        const ventaActualizada = await ventasService.cambiarEstado(id, estado)
        refetch()
        return ventaActualizada
      } catch (err) {
        throw err
      }
    },
    [refetch]
  )

  /**
   * Eliminar venta
   */
  const handleDelete = useCallback(
    async (id) => {
      try {
        await ventasService.delete(id)
        refetch()
      } catch (err) {
        throw err
      }
    },
    [refetch]
  )

  return {
    // Estado
    ventas: ventasList?.data || [],
    total: ventasList?.total || 0,
    loading,
    error,
    page,
    // Métodos
    setPage,
    handleCreate,
    handleUpdate,
    handleCambiarEstado,
    handleDelete,
    refetch,
  }
}
