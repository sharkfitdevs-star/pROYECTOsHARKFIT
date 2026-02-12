/**
 * Hook: useFetch
 * Hook genérico para hacer fetch de datos
 * Maneja loading, error, y caching automático
 */

import { useState, useEffect, useCallback } from 'react'

export function useFetch(fetchFn, dependencies = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
    } catch (err) {
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => {
    refetch()
  }, dependencies)

  return { data, loading, error, refetch }
}
