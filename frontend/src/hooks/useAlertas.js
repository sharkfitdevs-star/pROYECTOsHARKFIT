/**
 * Hook: useAlertas
 * Gestión completa de alertas
 * (CRUD + resolver)
 */

import { useState, useCallback } from 'react'
import { useFetch } from './useFetch'
import alertasService from '../api/services/alertasService'

export function useAlertas() {
  const [page, setPage] = useState(1)

  /**
   * Obtener lista de alertas
   */
  const { data: alertasList, loading, error, refetch } = useFetch(
    () => alertasService.getAll(page),
    [page]
  )

  /**
   * Obtener alertas pendientes
   */
  const { data: alertasPendientes, refetch: refetchPendientes } = useFetch(
    () => alertasService.getPendientes(),
    []
  )

  /**
   * Crear alerta
   */
  const handleCreate = useCallback(async (data) => {
    try {
      const nuevaAlerta = await alertasService.create(data)
      refetch()
      refetchPendientes()
      return nuevaAlerta
    } catch (err) {
      throw err
    }
  }, [refetch, refetchPendientes])

  /**
   * Actualizar alerta
   */
  const handleUpdate = useCallback(
    async (id, data) => {
      try {
        const alertaActualizada = await alertasService.update(id, data)
        refetch()
        refetchPendientes()
        return alertaActualizada
      } catch (err) {
        throw err
      }
    },
    [refetch, refetchPendientes]
  )

  /**
   * Resolver alerta
   */
  const handleResolver = useCallback(
    async (id) => {
      try {
        const alertaResuelta = await alertasService.resolverAlerta(id)
        refetch()
        refetchPendientes()
        return alertaResuelta
      } catch (err) {
        throw err
      }
    },
    [refetch, refetchPendientes]
  )

  /**
   * Eliminar alerta
   */
  const handleDelete = useCallback(
    async (id) => {
      try {
        await alertasService.delete(id)
        refetch()
        refetchPendientes()
      } catch (err) {
        throw err
      }
    },
    [refetch, refetchPendientes]
  )

  return {
    // Estado
    alertas: alertasList?.data || [],
    total: alertasList?.total || 0,
    alertasPendientes: alertasPendientes?.data || [],
    totalPendientes: alertasPendientes?.total || 0,
    loading,
    error,
    page,
    // Métodos
    setPage,
    handleCreate,
    handleUpdate,
    handleResolver,
    handleDelete,
    refetch,
    refetchPendientes,
  }
}
