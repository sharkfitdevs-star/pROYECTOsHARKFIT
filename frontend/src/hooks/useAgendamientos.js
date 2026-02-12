/**
 * Hook: useAgendamientos
 * Gestión completa de agendamientos
 * (CRUD + calendario)
 */

import { useState, useCallback } from 'react'
import { useFetch } from './useFetch'
import agendamientosService from '../api/services/agendamientosService'

export function useAgendamientos() {
  const [page, setPage] = useState(1)
  const [desdeCalendar, setDesdeCalendar] = useState(new Date(new Date().setDate(1)))
  const [hastaCalendar, setHastaCalendar] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))

  /**
   * Obtener lista de agendamientos
   */
  const { data: agendamientosList, loading, error, refetch } = useFetch(
    () => agendamientosService.getAll(page),
    [page]
  )

  /**
   * Obtener calendario
   */
  const { data: calendario, refetch: refetchCalendar } = useFetch(
    () => agendamientosService.getCalendar(desdeCalendar, hastaCalendar),
    [desdeCalendar, hastaCalendar]
  )

  /**
   * Crear agendamiento
   */
  const handleCreate = useCallback(async (data) => {
    try {
      const nuevoAgendamiento = await agendamientosService.create(data)
      refetch()
      refetchCalendar()
      return nuevoAgendamiento
    } catch (err) {
      throw err
    }
  }, [refetch, refetchCalendar])

  /**
   * Actualizar agendamiento
   */
  const handleUpdate = useCallback(
    async (id, data) => {
      try {
        const agendamientoActualizado = await agendamientosService.update(id, data)
        refetch()
        refetchCalendar()
        return agendamientoActualizado
      } catch (err) {
        throw err
      }
    },
    [refetch, refetchCalendar]
  )

  /**
   * Eliminar agendamiento
   */
  const handleDelete = useCallback(
    async (id) => {
      try {
        await agendamientosService.delete(id)
        refetch()
        refetchCalendar()
      } catch (err) {
        throw err
      }
    },
    [refetch, refetchCalendar]
  )

  return {
    // Estado
    agendamientos: agendamientosList?.data || [],
    total: agendamientosList?.total || 0,
    calendario: calendario?.data || [],
    loading,
    error,
    page,
    // Métodos
    setPage,
    setDesdeCalendar,
    setHastaCalendar,
    handleCreate,
    handleUpdate,
    handleDelete,
    refetch,
    refetchCalendar,
  }
}
